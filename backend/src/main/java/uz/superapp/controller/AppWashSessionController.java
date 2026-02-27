package uz.superapp.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.WashSession;
import uz.superapp.repository.WashSessionRepository;
import uz.superapp.service.WashSessionService;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * API для мобильного приложения:
 * 1. Сканировать QR → получить инфо о киоске
 * 2. Пополнить баланс → запустить сессию
 * 3. Пауза / Стоп сессии
 */
@RestController
@RequestMapping("/api/v1/app")
public class AppWashSessionController {

    private final WashSessionService washSessionService;
    private final WashSessionRepository washSessionRepository;

    public AppWashSessionController(WashSessionService washSessionService,
            WashSessionRepository washSessionRepository) {
        this.washSessionService = washSessionService;
        this.washSessionRepository = washSessionRepository;
    }

    /**
     * Получить информацию о киоске по QR-коду.
     * Вызывается сразу после сканирования QR в мобильном приложении.
     * Не требует авторизации — чтобы даже без логина можно было посмотреть цены.
     */
    @GetMapping("/kiosk/{kioskId}")
    public ResponseEntity<?> getKioskInfo(@PathVariable String kioskId) {
        try {
            Map<String, Object> info = washSessionService.getKioskInfo(kioskId);
            return ResponseEntity.ok(info);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Пополнить баланс киоска и запустить сессию мойки.
     * Вызывается после успешной оплаты в мобильном приложении.
     *
     * Body: { "amount": 50000 }
     */
    @PostMapping("/kiosk/{kioskId}/start-session")
    public ResponseEntity<?> startSession(@PathVariable String kioskId,
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        Object amountObj = body.get("amount");
        if (amountObj == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "amount is required"));
        }

        BigDecimal amount;
        try {
            amount = new BigDecimal(amountObj.toString());
            if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest().body(Map.of("message", "amount must be positive"));
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "invalid amount"));
        }

        String userId = auth != null ? auth.getName() : "anonymous";

        try {
            WashSession session = washSessionService.startSession(kioskId, userId, amount);
            return ResponseEntity.ok(sessionToMap(session));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Остановить активную сессию (пользователь нажал "Завершить" в приложении).
     */
    @PostMapping("/wash-sessions/{sessionId}/stop")
    public ResponseEntity<?> stopSession(@PathVariable String sessionId,
            @RequestBody(required = false) Map<String, Object> body) {
        String reason = body != null ? (String) body.get("reason") : "user_stop";
        try {
            WashSession session = washSessionService.stopSession(sessionId, reason);
            return ResponseEntity.ok(sessionToMap(session));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Поставить сессию на паузу / снять с паузы.
     * Body: { "pause": true | false }
     */
    @PostMapping("/wash-sessions/{sessionId}/pause")
    public ResponseEntity<?> pauseSession(@PathVariable String sessionId,
            @RequestBody Map<String, Object> body) {
        boolean pause = Boolean.TRUE.equals(body.get("pause"));
        try {
            WashSession session = washSessionService.pauseSession(sessionId, pause);
            return ResponseEntity.ok(sessionToMap(session));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Получить активную сессию текущего пользователя.
     */
    @GetMapping("/wash-sessions/active")
    public ResponseEntity<?> getActiveSession(Authentication auth) {
        if (auth == null)
            return ResponseEntity.status(401).build();
        String userId = auth.getName();
        return washSessionRepository.findByUserIdAndStatus(userId, "ACTIVE")
                .map(s -> ResponseEntity.ok(sessionToMap(s)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * История сессий пользователя.
     */
    @GetMapping("/wash-sessions")
    public ResponseEntity<?> getMyHistory(Authentication auth) {
        if (auth == null)
            return ResponseEntity.status(401).build();
        String userId = auth.getName();
        List<Map<String, Object>> list = washSessionRepository
                .findByUserIdOrderByStartedAtDesc(userId)
                .stream().map(this::sessionToMap).collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    // ── Private ──────────────────────────────────────────────────────────────

    private Map<String, Object> sessionToMap(WashSession s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("kioskId", s.getKioskId());
        m.put("status", s.getStatus());
        m.put("paidAmount", s.getPaidAmount());
        m.put("startedAt", s.getStartedAt() != null ? s.getStartedAt().toString() : null);
        m.put("finishedAt", s.getFinishedAt() != null ? s.getFinishedAt().toString() : null);
        m.put("finishReason", s.getFinishReason());
        return m;
    }
}
