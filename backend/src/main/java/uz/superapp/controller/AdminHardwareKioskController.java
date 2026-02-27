package uz.superapp.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.Account;
import uz.superapp.domain.HardwareKiosk;
import uz.superapp.domain.KioskServiceIotConfig;
import uz.superapp.domain.Organization;
import uz.superapp.repository.AccountRepository;
import uz.superapp.repository.DeviceRepository;
import uz.superapp.repository.HardwareKioskRepository;
import uz.superapp.repository.OrganizationRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1/admin/hardware-kiosks")
@Tag(name = "Админ: Аппаратные киоски", description = "Управление аппаратными киосками и их балансом")
public class AdminHardwareKioskController {

    private final HardwareKioskRepository hardwareKioskRepository;
    private final OrganizationRepository organizationRepository;
    private final AccountRepository accountRepository;
    private final DeviceRepository deviceRepository;
    private final uz.superapp.service.CommandQueueService commandQueueService;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    public AdminHardwareKioskController(HardwareKioskRepository hardwareKioskRepository,
            OrganizationRepository organizationRepository,
            AccountRepository accountRepository,
            DeviceRepository deviceRepository,
            uz.superapp.service.CommandQueueService commandQueueService,
            com.fasterxml.jackson.databind.ObjectMapper objectMapper) {
        this.hardwareKioskRepository = hardwareKioskRepository;
        this.organizationRepository = organizationRepository;
        this.accountRepository = accountRepository;
        this.deviceRepository = deviceRepository;
        this.commandQueueService = commandQueueService;
        this.objectMapper = objectMapper;
    }

    /**
     * Получить список всех hardware киосков
     * Для супер-админа - все, для партнёра - только привязанные к его организации
     */
    @GetMapping
    @Operation(summary = "Получить список киосков", description = "Возвращает список всех киосков с учетом фильтров по организации, филиалу и статусу. Фильтры не являются взаимоисключающими.")
    @SuppressWarnings("null")
    public ResponseEntity<List<Map<String, Object>>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String orgId,
            @RequestParam(required = false) String branchId,
            Authentication auth) {

        String effectiveOrgId = orgId;
        if ((effectiveOrgId == null || effectiveOrgId.isBlank()) && auth != null && auth.getName() != null) {
            Optional<Account> current = accountRepository.findById(auth.getName());
            if (current.isPresent() && !"SUPER_ADMIN".equals(current.get().getRole())) {
                String partnerOrgId = current.get().getOrgId();
                if (partnerOrgId != null && !partnerOrgId.isBlank()) {
                    effectiveOrgId = partnerOrgId;
                }
            }
        }

        List<HardwareKiosk> kiosks = hardwareKioskRepository.findByArchivedFalse();

        // Apply filters in stream
        final String finalEffectiveOrgId = effectiveOrgId;
        List<Map<String, Object>> result = kiosks.stream()
                .filter(k -> {
                    if (branchId != null && !branchId.isBlank() && !branchId.equals(k.getBranchId())) {
                        return false;
                    }
                    if (finalEffectiveOrgId != null && !finalEffectiveOrgId.isBlank()
                            && !finalEffectiveOrgId.equals(k.getOrgId())) {
                        return false;
                    }
                    if (status != null && !status.isBlank()) {
                        if ("UNASSIGNED".equals(status)) {
                            return k.getOrgId() == null;
                        } else if (!status.equals(k.getStatus())) {
                            return false;
                        }
                    }
                    return true;
                })
                .map(this::buildHardwareKioskMap)
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /**
     * Привязать hardware киоск к организации
     */
    @PostMapping("/{id}/assign")
    public ResponseEntity<Map<String, Object>> assign(
            @PathVariable String id,
            @RequestBody Map<String, Object> body,
            Authentication auth) {

        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Optional<Account> current = accountRepository.findById(auth.getName());
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Account acc = current.get();

        Object bodyOrgId = body.get("orgId");
        if (!"SUPER_ADMIN".equals(acc.getRole())) {
            if (acc.getOrgId() == null || !acc.getOrgId().equals(bodyOrgId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }

        Optional<HardwareKiosk> kioskOpt = hardwareKioskRepository.findById(id);
        if (kioskOpt.isEmpty() || kioskOpt.get().isArchived()) {
            return ResponseEntity.notFound().build();
        }

        HardwareKiosk kiosk = kioskOpt.get();

        Object orgIdObj = body.get("orgId");
        if (!(orgIdObj instanceof String) || ((String) orgIdObj).isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "orgId is required"));
        }
        String orgId = (String) orgIdObj;

        Optional<Organization> orgOpt = organizationRepository.findById(orgId);
        if (orgOpt.isEmpty() || orgOpt.get().isArchived()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Organization not found"));
        }

        Object branchIdObj = body.get("branchId");
        String branchId = null;
        if (branchIdObj instanceof String && !((String) branchIdObj).isBlank()) {
            branchId = (String) branchIdObj;
        }

        kiosk.setOrgId(orgId);
        kiosk.setBranchId(branchId);
        kiosk.setStatus("ACTIVE");
        hardwareKioskRepository.save(kiosk);

        // SYNC with Device
        syncWithDevice(kiosk);

        return ResponseEntity.ok(buildHardwareKioskMap(kiosk));
    }

    /**
     * Отвязать hardware киоск от организации
     */
    @PostMapping("/{id}/unassign")
    public ResponseEntity<Map<String, Object>> unassign(@PathVariable String id, Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Optional<Account> current = accountRepository.findById(auth.getName());
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Account acc = current.get();

        Optional<HardwareKiosk> kioskOpt = hardwareKioskRepository.findById(id);
        if (kioskOpt.isEmpty() || kioskOpt.get().isArchived()) {
            return ResponseEntity.notFound().build();
        }
        HardwareKiosk kiosk = kioskOpt.get();

        if (!"SUPER_ADMIN".equals(acc.getRole())) {
            if (acc.getOrgId() == null || !acc.getOrgId().equals(kiosk.getOrgId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        kiosk.setOrgId(null);
        kiosk.setBranchId(null);
        kiosk.setStatus("REGISTERED");
        hardwareKioskRepository.save(kiosk);

        // SYNC with Device
        syncWithDevice(kiosk);

        return ResponseEntity.ok(buildHardwareKioskMap(kiosk));
    }

    /**
     * Обновить название hardware киоска
     */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(
            @PathVariable String id,
            @RequestBody Map<String, Object> body,
            Authentication auth) {

        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Optional<Account> current = accountRepository.findById(auth.getName());
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Account acc = current.get();

        Optional<HardwareKiosk> kioskOpt = hardwareKioskRepository.findById(id);
        if (kioskOpt.isEmpty() || kioskOpt.get().isArchived()) {
            return ResponseEntity.notFound().build();
        }
        HardwareKiosk kiosk = kioskOpt.get();

        if (!"SUPER_ADMIN".equals(acc.getRole())) {
            if (acc.getOrgId() == null || !acc.getOrgId().equals(kiosk.getOrgId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }

        if (body.containsKey("name")) {
            Object nameObj = body.get("name");
            if (nameObj instanceof String) {
                kiosk.setName((String) nameObj);
            }
        }

        if (body.containsKey("status")) {
            Object statusObj = body.get("status");
            if (statusObj instanceof String) {
                kiosk.setStatus((String) statusObj);
            }
        }

        if (body.containsKey("orgId")) {
            Object orgIdObj = body.get("orgId");
            kiosk.setOrgId(orgIdObj instanceof String ? (String) orgIdObj : null);
        }

        if (body.containsKey("branchId")) {
            Object branchIdObj = body.get("branchId");
            kiosk.setBranchId(branchIdObj instanceof String ? (String) branchIdObj : null);
        }

        if (body.containsKey("iotOverrides")) {
            Object iotOverridesObj = body.get("iotOverrides");
            if (iotOverridesObj instanceof Map) {
                try {
                    String json = objectMapper.writeValueAsString(iotOverridesObj);
                    com.fasterxml.jackson.core.type.TypeReference<Map<String, KioskServiceIotConfig>> typeRef = new com.fasterxml.jackson.core.type.TypeReference<>() {
                    };
                    Map<String, KioskServiceIotConfig> overrides = objectMapper.readValue(json, typeRef);
                    kiosk.setIotOverrides(overrides);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }

        hardwareKioskRepository.save(kiosk);

        // SYNC with Device
        syncWithDevice(kiosk);

        return ResponseEntity.ok(buildHardwareKioskMap(kiosk));
    }

    private void syncWithDevice(HardwareKiosk kiosk) {
        if (kiosk.getMacId() == null)
            return;

        deviceRepository.findByMacIdAndArchivedFalse(kiosk.getMacId()).ifPresent(device -> {
            boolean changed = false;

            if (kiosk.isArchived() || kiosk.getBranchId() == null) {
                // If kiosk is deleted OR unassigned from branch
                if (device.getBranchId() != null || device.getOrgId() != null
                        || !"INACTIVE".equals(device.getStatus())) {
                    device.setBranchId(null);
                    device.setOrgId(null);
                    device.setStatus("INACTIVE"); // Move back to inventory
                    changed = true;
                }
            } else {
                // If assigned to branch
                if (!kiosk.getBranchId().equals(device.getBranchId()) || !kiosk.getOrgId().equals(device.getOrgId())) {
                    device.setBranchId(kiosk.getBranchId());
                    device.setOrgId(kiosk.getOrgId());
                    device.setStatus("OPEN");
                    changed = true;
                }
            }

            if (changed) {
                deviceRepository.save(device);
            }
        });
    }

    /**
     * Удалить hardware киоск (мягкое удаление)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, Authentication auth) {
        System.out.println("DEBUG: AdminHardwareKioskController.delete called for id: " + id);
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Optional<Account> current = accountRepository.findById(auth.getName());
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Account acc = current.get();

        Optional<HardwareKiosk> kioskOpt = hardwareKioskRepository.findById(id);
        if (kioskOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        HardwareKiosk kiosk = kioskOpt.get();

        if (!"SUPER_ADMIN".equals(acc.getRole())) {
            if (acc.getOrgId() == null || !acc.getOrgId().equals(kiosk.getOrgId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }

        kiosk.setArchived(true);
        hardwareKioskRepository.save(kiosk);

        // SYNC with Device
        syncWithDevice(kiosk);

        return ResponseEntity.noContent().build();
    }

    /**
     * Пополнить баланс связанного устройства
     */
    @PostMapping("/{id}/top-up")
    @Operation(summary = "Пополнить баланс", description = "Аддитивное пополнение баланса связанного с киоском устройства (Device).")
    public ResponseEntity<Map<String, Object>> topUp(
            @PathVariable String id,
            @RequestBody Map<String, Object> body,
            Authentication auth) {

        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Optional<Account> current = accountRepository.findById(auth.getName());
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Account acc = current.get();

        Optional<HardwareKiosk> kioskOpt = hardwareKioskRepository.findById(id);
        if (kioskOpt.isEmpty() || kioskOpt.get().isArchived()) {
            return ResponseEntity.notFound().build();
        }
        HardwareKiosk kiosk = kioskOpt.get();

        // Permission check
        if (!"SUPER_ADMIN".equals(acc.getRole())) {
            if (acc.getOrgId() == null || !acc.getOrgId().equals(kiosk.getOrgId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }

        Object amountObj = body.get("amount");
        if (!(amountObj instanceof Number)) {
            return ResponseEntity.badRequest().body(Map.of("message", "amount must be a number"));
        }
        double amount = ((Number) amountObj).doubleValue();
        if (amount <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "amount must be positive"));
        }

        if (kiosk.getMacId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Kiosk has no MAC ID"));
        }

        Optional<uz.superapp.domain.Device> deviceOpt = deviceRepository.findByMacIdAndArchivedFalse(kiosk.getMacId());
        if (deviceOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Associated device not found"));
        }

        uz.superapp.domain.Device device = deviceOpt.get();
        java.math.BigDecimal currentBalance = device.getCashBalance() != null ? device.getCashBalance()
                : java.math.BigDecimal.ZERO;
        device.setCashBalance(currentBalance.add(java.math.BigDecimal.valueOf(amount)));
        deviceRepository.save(device);

        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("kiosk_id", kiosk.getKioskId());
            payload.put("kiosk_name", kiosk.getName());
            payload.put("amount", amount);
            payload.put("cash_from_admin", true);
            payload.put("timestamp", java.time.Instant.now().toString());

            String payloadStr = objectMapper.writeValueAsString(payload);
            commandQueueService.createCommand(kiosk.getKioskId(), "kiosk_topup", payloadStr, 10);
        } catch (Exception e) {
            e.printStackTrace();
        }

        return ResponseEntity.ok(buildHardwareKioskMap(kiosk));
    }

    @SuppressWarnings("null")
    private Map<String, Object> buildHardwareKioskMap(HardwareKiosk kiosk) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", kiosk.getId());
        m.put("macId", kiosk.getMacId() != null ? kiosk.getMacId() : "");
        m.put("name", kiosk.getName() != null ? kiosk.getName() : "");
        m.put("status", kiosk.getStatus() != null ? kiosk.getStatus() : "REGISTERED");
        m.put("orgId", kiosk.getOrgId() != null ? kiosk.getOrgId() : null);
        m.put("branchId", kiosk.getBranchId() != null ? kiosk.getBranchId() : null);
        m.put("registeredAt", kiosk.getRegisteredAt() != null ? kiosk.getRegisteredAt().toString() : null);
        m.put("lastHeartbeat", kiosk.getLastHeartbeat() != null ? kiosk.getLastHeartbeat().toString() : null);
        m.put("iotOverrides", kiosk.getIotOverrides());

        // Include cash balance from Device
        if (kiosk.getMacId() != null) {
            deviceRepository.findByMacIdAndArchivedFalse(kiosk.getMacId()).ifPresent(device -> {
                m.put("cashBalance", device.getCashBalance() != null ? device.getCashBalance() : 0);
            });
        }
        if (!m.containsKey("cashBalance")) {
            m.put("cashBalance", 0);
        }

        return m;
    }
}
