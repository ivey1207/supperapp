package uz.superapp.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.Account;
import uz.superapp.domain.Branch;
import uz.superapp.domain.HardwareKiosk;
import uz.superapp.domain.Organization;
import uz.superapp.repository.AccountRepository;
import uz.superapp.repository.BranchRepository;
import uz.superapp.repository.HardwareKioskRepository;
import uz.superapp.repository.OrganizationRepository;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin/organizations")
public class AdminOrganizationController {

    private final OrganizationRepository organizationRepository;
    private final AccountRepository accountRepository;
    private final BranchRepository branchRepository;
    private final HardwareKioskRepository hardwareKioskRepository;

    public AdminOrganizationController(OrganizationRepository organizationRepository,
            AccountRepository accountRepository,
            BranchRepository branchRepository,
            HardwareKioskRepository hardwareKioskRepository) {
        this.organizationRepository = organizationRepository;
        this.accountRepository = accountRepository;
        this.branchRepository = branchRepository;
        this.hardwareKioskRepository = hardwareKioskRepository;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(Authentication auth) {
        List<Organization> all;
        if (auth != null && auth.getName() != null) {
            Optional<Account> current = accountRepository.findById(auth.getName());
            if (current.isPresent()) {
                String role = current.get().getRole();
                String orgId = current.get().getOrgId();
                if ("SUPER_ADMIN".equals(role)) {
                    all = organizationRepository.findByArchivedFalse();
                } else if (orgId != null && !orgId.isBlank()) {
                    all = new ArrayList<>();
                    organizationRepository.findById(orgId).filter(o -> !o.isArchived()).ifPresent(all::add);
                } else {
                    all = organizationRepository.findByArchivedFalse();
                }
            } else {
                all = organizationRepository.findByArchivedFalse();
            }
        } else {
            all = organizationRepository.findByArchivedFalse();
        }
        List<Map<String, Object>> result = all.stream()
                .map(this::buildOrganizationMap)
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body, Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Optional<Account> current = accountRepository.findById(auth.getName());
        if (current.isEmpty() || !"SUPER_ADMIN".equals(current.get().getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Object nameObj = body.get("name");
        if (!(nameObj instanceof String) || ((String) nameObj).isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "name is required"));
        }
        String name = (String) nameObj;

        Organization org = new Organization();
        org.setName(name);
        org.setInn(getStringValue(body, "inn"));
        String partnerType = getStringValue(body, "partnerType");
        org.setPartnerType(partnerType);
        org.setStatus(getStringValue(body, "status", "ACTIVE"));
        org.setDescription(getStringValue(body, "description"));
        org.setAddress(getStringValue(body, "address"));
        org.setPhone(getStringValue(body, "phone"));
        org.setEmail(getStringValue(body, "email"));
        org.setWorkingHours(getStringValue(body, "workingHours"));
        org.setRating(getDoubleValue(body, "rating"));
        org.setReviewCount(getIntegerValue(body, "reviewCount"));
        org.setLogoUrl(getStringValue(body, "logoUrl"));
        org.setArchived(false);
        organizationRepository.save(org);

        organizationRepository.save(org);

        return ResponseEntity.ok(buildOrganizationMap(org));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable String id, @RequestBody Map<String, Object> body,
            Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Optional<Account> current = accountRepository.findById(auth.getName());
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String role = current.get().getRole();
        String userOrgId = current.get().getOrgId();
        Optional<Organization> orgOpt = organizationRepository.findById(id);
        if (orgOpt.isEmpty() || orgOpt.get().isArchived()) {
            return ResponseEntity.notFound().build();
        }
        Organization org = orgOpt.get();
        if (!"SUPER_ADMIN".equals(role) && (userOrgId == null || !userOrgId.equals(id))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        if (body.containsKey("name")) {
            org.setName(getStringValue(body, "name"));
        }
        if (body.containsKey("inn")) {
            org.setInn(getStringValue(body, "inn"));
        }
        if (body.containsKey("partnerType")) {
            org.setPartnerType(getStringValue(body, "partnerType"));
        }
        if (body.containsKey("status")) {
            org.setStatus(getStringValue(body, "status"));
        }
        if (body.containsKey("description")) {
            org.setDescription(getStringValue(body, "description"));
        }
        if (body.containsKey("address")) {
            org.setAddress(getStringValue(body, "address"));
        }
        if (body.containsKey("phone")) {
            org.setPhone(getStringValue(body, "phone"));
        }
        if (body.containsKey("email")) {
            org.setEmail(getStringValue(body, "email"));
        }
        if (body.containsKey("workingHours")) {
            org.setWorkingHours(getStringValue(body, "workingHours"));
        }
        if (body.containsKey("rating")) {
            org.setRating(getDoubleValue(body, "rating"));
        }
        if (body.containsKey("reviewCount")) {
            org.setReviewCount(getIntegerValue(body, "reviewCount"));
        }
        if (body.containsKey("logoUrl")) {
            org.setLogoUrl(getStringValue(body, "logoUrl"));
        }

        organizationRepository.save(org);
        return ResponseEntity.ok(buildOrganizationMap(org));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, Authentication auth) {
        System.out.println("DEBUG: AdminOrganizationController.delete called for id: " + id);
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Optional<Account> current = accountRepository.findById(auth.getName());
        if (current.isEmpty() || !"SUPER_ADMIN".equals(current.get().getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Optional<Organization> orgOpt = organizationRepository.findById(id);
        if (orgOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Organization org = orgOpt.get();
        org.setArchived(true);
        organizationRepository.save(org);
        return ResponseEntity.noContent().build();
    }

    /**
     * Привязать hardware киоски к организации (для автомоек)
     */
    @PostMapping("/{id}/attach-kiosks")
    public ResponseEntity<Map<String, Object>> attachKiosks(
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

        Optional<Organization> orgOpt = organizationRepository.findById(id);
        if (orgOpt.isEmpty() || orgOpt.get().isArchived()) {
            return ResponseEntity.notFound().build();
        }

        Organization org = orgOpt.get();
        if (!"CAR_WASH".equals(org.getPartnerType())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Only car wash organizations can have kiosks"));
        }

        Object hardwareKioskIdsObj = body.get("hardwareKioskIds");
        if (!(hardwareKioskIdsObj instanceof List)) {
            return ResponseEntity.badRequest().body(Map.of("message", "hardwareKioskIds must be an array"));
        }

        @SuppressWarnings("unchecked")
        List<String> hardwareKioskIds = (List<String>) hardwareKioskIdsObj;

        // Hardware киоски привязываются к существующим филиалам через модуль
        // HardwareKiosks
        // Филиалы должны быть созданы заранее через модуль Branches
        // Этот метод больше не используется, так как привязка делается через
        // AdminHardwareKioskController

        int attachedCount = 0;
        for (String hardwareKioskId : hardwareKioskIds) {
            Optional<HardwareKiosk> hwKioskOpt = hardwareKioskRepository.findById(hardwareKioskId);
            if (hwKioskOpt.isPresent()) {
                HardwareKiosk hwKiosk = hwKioskOpt.get();
                if (hwKiosk.getOrgId() == null) {
                    // Привязать hardware киоск только к организации (без филиала)
                    // Филиал будет выбран позже через модуль HardwareKiosks
                    hwKiosk.setOrgId(org.getId());
                    hwKiosk.setStatus("ACTIVE");
                    hardwareKioskRepository.save(hwKiosk);
                    attachedCount++;
                }
            }
        }

        return ResponseEntity.ok(Map.of(
                "message", "Attached " + attachedCount + " kiosks",
                "attachedCount", attachedCount));
    }

    private Map<String, Object> buildOrganizationMap(Organization org) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", org.getId());
        m.put("name", org.getName() != null ? org.getName() : "");
        m.put("inn", org.getInn() != null ? org.getInn() : "");
        m.put("partnerType", org.getPartnerType() != null ? org.getPartnerType() : "");
        m.put("status", org.getStatus() != null ? org.getStatus() : "ACTIVE");
        m.put("description", org.getDescription() != null ? org.getDescription() : "");
        m.put("address", org.getAddress() != null ? org.getAddress() : "");
        m.put("phone", org.getPhone() != null ? org.getPhone() : "");
        m.put("email", org.getEmail() != null ? org.getEmail() : "");
        m.put("workingHours", org.getWorkingHours() != null ? org.getWorkingHours() : "");
        m.put("rating", org.getRating() != null ? org.getRating() : 0.0);
        m.put("reviewCount", org.getReviewCount() != null ? org.getReviewCount() : 0);
        m.put("logoUrl", org.getLogoUrl() != null ? org.getLogoUrl() : "");
        return m;
    }

    private String getStringValue(Map<String, Object> body, String key) {
        return getStringValue(body, key, null);
    }

    private String getStringValue(Map<String, Object> body, String key, String defaultValue) {
        Object value = body.get(key);
        if (value instanceof String) {
            return (String) value;
        }
        return defaultValue;
    }

    private Double getDoubleValue(Map<String, Object> body, String key) {
        Object value = body.get(key);
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        return null;
    }

    private Integer getIntegerValue(Map<String, Object> body, String key) {
        Object value = body.get(key);
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        return null;
    }
}
