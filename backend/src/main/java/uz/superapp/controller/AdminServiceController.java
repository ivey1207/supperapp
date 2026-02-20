package uz.superapp.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.Account;
import uz.superapp.domain.Service;
import uz.superapp.repository.AccountRepository;
import uz.superapp.repository.ServiceRepository;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin/services")
public class AdminServiceController {

    private final ServiceRepository serviceRepository;
    private final AccountRepository accountRepository;

    public AdminServiceController(ServiceRepository serviceRepository, AccountRepository accountRepository) {
        this.serviceRepository = serviceRepository;
        this.accountRepository = accountRepository;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(
            @RequestParam(required = false) String orgId,
            @RequestParam(required = false) String branchId,
            Authentication auth) {

        String effectiveOrgId = orgId;
        String effectiveBranchId = branchId;

        if (auth != null && auth.getName() != null) {
            Optional<Account> current = accountRepository.findById(auth.getName());
            if (current.isPresent() && !"SUPER_ADMIN".equals(current.get().getRole())) {
                effectiveOrgId = current.get().getOrgId();
            }
        }

        List<Service> all;
        if (effectiveOrgId != null && !effectiveOrgId.isBlank()) {
            if (effectiveBranchId != null && !effectiveBranchId.isBlank()) {
                all = serviceRepository.findByOrgIdAndBranchIdAndArchivedFalse(effectiveOrgId, effectiveBranchId);
            } else {
                all = serviceRepository.findByOrgIdAndArchivedFalse(effectiveOrgId);
            }
        } else if (effectiveBranchId != null && !effectiveBranchId.isBlank()) {
            all = serviceRepository.findByBranchIdAndArchivedFalse(effectiveBranchId);
        } else {
            all = serviceRepository.findByArchivedFalse();
        }

        List<Map<String, Object>> result = all.stream()
                .map(this::buildServiceMap)
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body, Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Optional<Account> current = accountRepository.findById(auth.getName());
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String role = current.get().getRole();
        String userOrgId = current.get().getOrgId();

        String targetOrgId = body.get("orgId") != null ? body.get("orgId").toString() : null;
        if (targetOrgId == null || targetOrgId.isBlank()) {
            if (!"SUPER_ADMIN".equals(role) && userOrgId != null && !userOrgId.isBlank()) {
                targetOrgId = userOrgId;
            } else {
                return ResponseEntity.badRequest().body(Map.of("message", "orgId is required"));
            }
        }
        if (!"SUPER_ADMIN".equals(role) && (userOrgId == null || !userOrgId.equals(targetOrgId))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        String name = body.get("name") != null ? body.get("name").toString() : null;
        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "name is required"));
        }

        Service service = new Service();
        service.setOrgId(targetOrgId);
        service.setBranchId(getStringValue(body, "branchId"));
        service.setName(name);
        service.setDescription(getStringValue(body, "description"));
        service.setCategory(getStringValue(body, "category"));
        service.setPricePerMinute(getIntegerValue(body, "pricePerMinute"));
        service.setDurationMinutes(getIntegerValue(body, "durationMinutes"));
        service.setBookable(getBooleanValue(body, "bookable", false));
        service.setBookingIntervalMinutes(getIntegerValue(body, "bookingIntervalMinutes", 30));
        service.setWorkingHours(getStringValue(body, "workingHours"));
        service.setCommand(getStringValue(body, "command"));
        service.setRelayBits(getStringValue(body, "relayBits"));
        service.setMotorFrequency(getIntegerValue(body, "motorFrequency"));
        service.setPump1Power(getIntegerValue(body, "pump1Power"));
        service.setPump2Power(getIntegerValue(body, "pump2Power"));
        service.setPump3Power(getIntegerValue(body, "pump3Power"));
        service.setPump4Power(getIntegerValue(body, "pump4Power"));
        service.setMotorFlag(getStringValue(body, "motorFlag"));
        service.setActive(getBooleanValue(body, "active", true));
        service.setArchived(false);

        serviceRepository.save(service);
        return ResponseEntity.ok(buildServiceMap(service));
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

        Optional<Service> serviceOpt = serviceRepository.findById(id);
        if (serviceOpt.isEmpty() || serviceOpt.get().isArchived()) {
            return ResponseEntity.notFound().build();
        }
        Service service = serviceOpt.get();
        if (!"SUPER_ADMIN".equals(role) && (userOrgId == null || !userOrgId.equals(service.getOrgId()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        if (body.containsKey("name"))
            service.setName(getStringValue(body, "name"));
        if (body.containsKey("description"))
            service.setDescription(getStringValue(body, "description"));
        if (body.containsKey("category"))
            service.setCategory(getStringValue(body, "category"));
        if (body.containsKey("pricePerMinute"))
            service.setPricePerMinute(getIntegerValue(body, "pricePerMinute"));
        if (body.containsKey("durationMinutes"))
            service.setDurationMinutes(getIntegerValue(body, "durationMinutes"));
        if (body.containsKey("bookable"))
            service.setBookable(getBooleanValue(body, "bookable", false));
        if (body.containsKey("bookingIntervalMinutes"))
            service.setBookingIntervalMinutes(getIntegerValue(body, "bookingIntervalMinutes", 30));
        if (body.containsKey("workingHours"))
            service.setWorkingHours(getStringValue(body, "workingHours"));
        if (body.containsKey("command"))
            service.setCommand(getStringValue(body, "command"));
        if (body.containsKey("relayBits"))
            service.setRelayBits(getStringValue(body, "relayBits"));
        if (body.containsKey("motorFrequency"))
            service.setMotorFrequency(getIntegerValue(body, "motorFrequency"));
        if (body.containsKey("pump1Power"))
            service.setPump1Power(getIntegerValue(body, "pump1Power"));
        if (body.containsKey("pump2Power"))
            service.setPump2Power(getIntegerValue(body, "pump2Power"));
        if (body.containsKey("pump3Power"))
            service.setPump3Power(getIntegerValue(body, "pump3Power"));
        if (body.containsKey("pump4Power"))
            service.setPump4Power(getIntegerValue(body, "pump4Power"));
        if (body.containsKey("motorFlag"))
            service.setMotorFlag(getStringValue(body, "motorFlag"));
        if (body.containsKey("active"))
            service.setActive(getBooleanValue(body, "active", true));
        if (body.containsKey("branchId"))
            service.setBranchId(getStringValue(body, "branchId"));

        serviceRepository.save(service);
        return ResponseEntity.ok(buildServiceMap(service));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, Authentication auth) {
        System.out.println("DEBUG: AdminServiceController.delete called for id: " + id);
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Optional<Account> current = accountRepository.findById(auth.getName());
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String role = current.get().getRole();
        String userOrgId = current.get().getOrgId();

        Optional<Service> serviceOpt = serviceRepository.findById(id);
        if (serviceOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Service service = serviceOpt.get();
        if (!"SUPER_ADMIN".equals(role) && (userOrgId == null || !userOrgId.equals(service.getOrgId()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        service.setArchived(true);
        serviceRepository.save(service);
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> buildServiceMap(Service s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("orgId", s.getOrgId() != null ? s.getOrgId() : "");
        m.put("branchId", s.getBranchId() != null ? s.getBranchId() : "");
        m.put("name", s.getName() != null ? s.getName() : "");
        m.put("description", s.getDescription() != null ? s.getDescription() : "");
        m.put("category", s.getCategory() != null ? s.getCategory() : "");
        m.put("pricePerMinute", s.getPricePerMinute() != null ? s.getPricePerMinute() : 0);
        m.put("durationMinutes", s.getDurationMinutes() != null ? s.getDurationMinutes() : 0);
        m.put("bookable", s.isBookable());
        m.put("bookingIntervalMinutes", s.getBookingIntervalMinutes() != null ? s.getBookingIntervalMinutes() : 30);
        m.put("workingHours", s.getWorkingHours() != null ? s.getWorkingHours() : "");
        m.put("command", s.getCommand() != null ? s.getCommand() : "");
        m.put("relayBits", s.getRelayBits() != null ? s.getRelayBits() : "");
        m.put("motorFrequency", s.getMotorFrequency() != null ? s.getMotorFrequency() : 0);
        m.put("pump1Power", s.getPump1Power() != null ? s.getPump1Power() : 0);
        m.put("pump2Power", s.getPump2Power() != null ? s.getPump2Power() : 0);
        m.put("pump3Power", s.getPump3Power() != null ? s.getPump3Power() : 0);
        m.put("pump4Power", s.getPump4Power() != null ? s.getPump4Power() : 0);
        m.put("motorFlag", s.getMotorFlag() != null ? s.getMotorFlag() : "");
        m.put("active", s.isActive());
        return m;
    }

    private String getStringValue(Map<String, Object> body, String key) {
        Object value = body.get(key);
        if (value instanceof String) {
            return (String) value;
        }
        return null;
    }

    private Integer getIntegerValue(Map<String, Object> body, String key) {
        return getIntegerValue(body, key, null);
    }

    private Integer getIntegerValue(Map<String, Object> body, String key, Integer defaultValue) {
        Object value = body.get(key);
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        return defaultValue;
    }

    private Boolean getBooleanValue(Map<String, Object> body, String key, Boolean defaultValue) {
        Object value = body.get(key);
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        if (value instanceof String) {
            return Boolean.parseBoolean((String) value);
        }
        return defaultValue;
    }
}
