package uz.superapp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import uz.superapp.domain.*;
import uz.superapp.domain.WashSession;
import uz.superapp.repository.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

/**
 * Сервис управления сеансами мойки.
 * Создаёт сессию после оплаты и отправляет команду на конкретный киоск.
 */
@Service
public class WashSessionService {

    private final WashSessionRepository washSessionRepository;
    private final HardwareKioskRepository hardwareKioskRepository;
    private final ServiceRepository serviceRepository;
    private final CommandQueueService commandQueueService;
    private final ObjectMapper objectMapper;

    public WashSessionService(WashSessionRepository washSessionRepository,
            HardwareKioskRepository hardwareKioskRepository,
            ServiceRepository serviceRepository,
            CommandQueueService commandQueueService,
            ObjectMapper objectMapper) {
        this.washSessionRepository = washSessionRepository;
        this.hardwareKioskRepository = hardwareKioskRepository;
        this.serviceRepository = serviceRepository;
        this.commandQueueService = commandQueueService;
        this.objectMapper = objectMapper;
    }

    /**
     * Получить информацию о киоске по kioskId (для мобильного приложения после
     * сканирования QR).
     * Возвращает: название, баланс, статус, список доступных услуг.
     */
    public Map<String, Object> getKioskInfo(String kioskId) {
        HardwareKiosk kiosk = hardwareKioskRepository.findByKioskIdAndArchivedFalse(kioskId)
                .orElseThrow(() -> new RuntimeException("Kiosk not found: " + kioskId));

        // Получить услуги этого бокса (по branchId)
        List<uz.superapp.domain.Service> services = kiosk.getBranchId() != null
                ? serviceRepository.findByBranchIdAndArchivedFalse(kiosk.getBranchId())
                : List.of();

        List<Map<String, Object>> serviceList = new ArrayList<>();
        for (uz.superapp.domain.Service s : services) {
            if (!s.isActive())
                continue;
            Map<String, Object> sm = new LinkedHashMap<>();
            sm.put("id", s.getId());
            sm.put("name", s.getName());
            sm.put("description", s.getDescription());
            sm.put("pricePerMinute", s.getPricePerMinute());
            sm.put("durationMinutes", s.getDurationMinutes());
            sm.put("relayBits", s.getRelayBits());
            sm.put("motorFrequency", s.getMotorFrequency());
            sm.put("pump1Power", s.getPump1Power());
            sm.put("pump2Power", s.getPump2Power());
            sm.put("pump3Power", s.getPump3Power());
            sm.put("pump4Power", s.getPump4Power());
            sm.put("motorFlag", s.getMotorFlag());
            sm.put("command", s.getCommand());
            serviceList.add(sm);
        }

        // Есть ли активная сессия?
        Optional<WashSession> activeSession = washSessionRepository.findByKioskIdAndStatus(kioskId, "ACTIVE");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("kioskId", kiosk.getKioskId());
        result.put("name", kiosk.getName());
        result.put("status", kiosk.getStatus());
        result.put("orgId", kiosk.getOrgId());
        result.put("branchId", kiosk.getBranchId());
        result.put("balance", kiosk.getBalance() != null ? kiosk.getBalance() : BigDecimal.ZERO);
        result.put("sessionActive", activeSession.isPresent());
        result.put("services", serviceList);
        return result;
    }

    /**
     * Пополнить баланс киоска и запустить сессию мойки.
     * Вызывается из мобильного приложения после успешной оплаты.
     *
     * @param kioskId ID киоска (из QR-кода)
     * @param userId  ID пользователя приложения
     * @param amount  Сумма оплаты
     */
    public WashSession startSession(String kioskId, String userId, BigDecimal amount) {
        HardwareKiosk kiosk = hardwareKioskRepository.findByKioskIdAndArchivedFalse(kioskId)
                .orElseThrow(() -> new RuntimeException("Kiosk not found: " + kioskId));

        // Проверить нет ли уже активной сессии
        Optional<WashSession> existing = washSessionRepository.findByKioskIdAndStatus(kioskId, "ACTIVE");
        if (existing.isPresent()) {
            throw new RuntimeException("Kiosk already has an active session");
        }

        // Пополнить баланс киоска
        BigDecimal currentBalance = kiosk.getBalance() != null ? kiosk.getBalance() : BigDecimal.ZERO;
        kiosk.setBalance(currentBalance.add(amount));
        hardwareKioskRepository.save(kiosk);

        // Получить услуги бокса для передачи в команду
        List<uz.superapp.domain.Service> services = kiosk.getBranchId() != null
                ? serviceRepository.findByBranchIdAndArchivedFalse(kiosk.getBranchId())
                : List.of();

        // Создать сессию
        WashSession session = new WashSession();
        session.setKioskId(kioskId);
        session.setUserId(userId);
        session.setOrgId(kiosk.getOrgId());
        session.setBranchId(kiosk.getBranchId());
        session.setStatus("ACTIVE");
        session.setPaidAmount(amount);
        session.setStartedAt(Instant.now());
        session = washSessionRepository.save(session);

        // Сформировать payload команды для Raspberry Pi
        Map<String, Object> payload = buildSessionPayload(session, kiosk, services);
        String commandStr;
        try {
            commandStr = objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            commandStr = "{}";
        }

        // Положить команду в очередь киоска (controllerId = kioskId)
        ControllerCommand cmd = commandQueueService.createCommand(
                kioskId, "session_started", commandStr, 10);

        // Сохранить commandId в сессии
        session.setCommandId(cmd.getId());
        washSessionRepository.save(session);

        return session;
    }

    /**
     * Остановить сессию — кладёт команду stop в очередь киоска.
     */
    public WashSession stopSession(String sessionId, String reason) {
        WashSession session = washSessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));

        if ("FINISHED".equals(session.getStatus()) || "FAILED".equals(session.getStatus())) {
            throw new RuntimeException("Session already finished");
        }

        // Отменить все pending команды
        commandQueueService.finishPendingCommands(session.getKioskId());

        // Команда на остановку
        commandQueueService.createCommand(session.getKioskId(), "session_stopped",
                "{\"reason\":\"" + (reason != null ? reason : "user_stop") + "\"}", 10);

        session.setStatus("FINISHED");
        session.setFinishedAt(Instant.now());
        session.setFinishReason(reason != null ? reason : "user_stop");
        return washSessionRepository.save(session);
    }

    /**
     * Пауза/снятие паузы сессии.
     */
    public WashSession pauseSession(String sessionId, boolean pause) {
        WashSession session = washSessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));

        String commandType = pause ? "pause_service" : "resume_service";
        commandQueueService.createCommand(session.getKioskId(), commandType, "{}", 9);

        session.setStatus(pause ? "PAUSED" : "ACTIVE");
        return washSessionRepository.save(session);
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private Map<String, Object> buildSessionPayload(WashSession session,
            HardwareKiosk kiosk,
            List<uz.superapp.domain.Service> services) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("session_id", session.getId());
        payload.put("kiosk_id", kiosk.getKioskId());
        payload.put("balance", kiosk.getBalance());
        payload.put("paid_amount", session.getPaidAmount());
        payload.put("started_at", session.getStartedAt().toString());

        // Список кнопок-программ для экрана Raspberry Pi
        List<Map<String, Object>> programs = new ArrayList<>();
        for (uz.superapp.domain.Service s : services) {
            if (!s.isActive())
                continue;
            Map<String, Object> p = new LinkedHashMap<>();
            p.put("id", s.getId());
            p.put("name", s.getName());
            p.put("relay_bits", s.getRelayBits());
            p.put("motor_frequency", s.getMotorFrequency());
            p.put("pump1_power", s.getPump1Power());
            p.put("pump2_power", s.getPump2Power());
            p.put("pump3_power", s.getPump3Power());
            p.put("pump4_power", s.getPump4Power());
            p.put("motor_flag", s.getMotorFlag());
            p.put("command", s.getCommand());
            p.put("duration_minutes", s.getDurationMinutes());
            p.put("price_per_minute", s.getPricePerMinute());
            programs.add(p);
        }
        payload.put("programs", programs);
        return payload;
    }
}
