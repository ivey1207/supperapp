package uz.superapp.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.Account;
import uz.superapp.domain.HardwareKiosk;
import uz.superapp.domain.Organization;
import uz.superapp.repository.AccountRepository;
import uz.superapp.repository.DeviceRepository;
import uz.superapp.repository.HardwareKioskRepository;
import uz.superapp.repository.OrganizationRepository;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin/hardware-kiosks")
public class AdminHardwareKioskController {

    private final HardwareKioskRepository hardwareKioskRepository;
    private final OrganizationRepository organizationRepository;
    private final AccountRepository accountRepository;
    private final DeviceRepository deviceRepository;

    public AdminHardwareKioskController(HardwareKioskRepository hardwareKioskRepository,
            OrganizationRepository organizationRepository,
            AccountRepository accountRepository,
            DeviceRepository deviceRepository) {
        this.hardwareKioskRepository = hardwareKioskRepository;
        this.organizationRepository = organizationRepository;
        this.accountRepository = accountRepository;
        this.deviceRepository = deviceRepository;
    }

    /**
     * Получить список всех hardware киосков
     * Для супер-админа - все, для партнёра - только привязанные к его организации
     */
    @GetMapping
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

        List<HardwareKiosk> kiosks;
        if (branchId != null && !branchId.isBlank()) {
            kiosks = hardwareKioskRepository.findByBranchIdAndArchivedFalse(branchId);
        } else if (effectiveOrgId != null && !effectiveOrgId.isBlank()) {
            kiosks = hardwareKioskRepository.findByOrgIdAndArchivedFalse(effectiveOrgId);
        } else if (status != null && !status.isBlank()) {
            if ("UNASSIGNED".equals(status)) {
                kiosks = hardwareKioskRepository.findByOrgIdIsNullAndArchivedFalse();
            } else {
                kiosks = hardwareKioskRepository.findByStatusAndArchivedFalse(status);
            }
        } else {
            kiosks = hardwareKioskRepository.findByArchivedFalse();
        }

        List<Map<String, Object>> result = kiosks.stream()
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
        if (current.isEmpty() || !"SUPER_ADMIN".equals(current.get().getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
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
        if (current.isEmpty() || !"SUPER_ADMIN".equals(current.get().getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Optional<HardwareKiosk> kioskOpt = hardwareKioskRepository.findById(id);
        if (kioskOpt.isEmpty() || kioskOpt.get().isArchived()) {
            return ResponseEntity.notFound().build();
        }

        HardwareKiosk kiosk = kioskOpt.get();
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
        if (current.isEmpty() || !"SUPER_ADMIN".equals(current.get().getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Optional<HardwareKiosk> kioskOpt = hardwareKioskRepository.findById(id);
        if (kioskOpt.isEmpty() || kioskOpt.get().isArchived()) {
            return ResponseEntity.notFound().build();
        }

        HardwareKiosk kiosk = kioskOpt.get();

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

            if (kiosk.getBranchId() == null) {
                // If unassigned from branch
                if (device.getBranchId() != null) {
                    device.setBranchId(null);
                    device.setOrgId(null);
                    device.setStatus("INACTIVE"); // Move back to inventory
                    changed = true;
                }
            } else {
                // If assigned to branch
                if (!kiosk.getBranchId().equals(device.getBranchId())) {
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
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Optional<Account> current = accountRepository.findById(auth.getName());
        if (current.isEmpty() || !"SUPER_ADMIN".equals(current.get().getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Optional<HardwareKiosk> kioskOpt = hardwareKioskRepository.findById(id);
        if (kioskOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        HardwareKiosk kiosk = kioskOpt.get();
        kiosk.setArchived(true);
        hardwareKioskRepository.save(kiosk);

        return ResponseEntity.noContent().build();
    }

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
