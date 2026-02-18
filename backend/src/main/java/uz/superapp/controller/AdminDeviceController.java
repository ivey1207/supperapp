package uz.superapp.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.Account;
import uz.superapp.domain.Branch;
import uz.superapp.domain.Device;
import uz.superapp.repository.AccountRepository;
import uz.superapp.repository.BranchRepository;
import uz.superapp.repository.DeviceRepository;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin/devices")
public class AdminDeviceController {

    private final DeviceRepository deviceRepository;
    private final BranchRepository branchRepository;
    private final AccountRepository accountRepository;

    public AdminDeviceController(DeviceRepository deviceRepository,
            BranchRepository branchRepository,
            AccountRepository accountRepository) {
        this.deviceRepository = deviceRepository;
        this.branchRepository = branchRepository;
        this.accountRepository = accountRepository;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(@RequestParam(required = false) String orgId,
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

        List<Device> all = effectiveOrgId != null && !effectiveOrgId.isBlank()
                ? deviceRepository.findByOrgIdAndArchivedFalse(effectiveOrgId)
                : deviceRepository.findByArchivedFalse();

        List<Map<String, Object>> result = all.stream()
                .map(d -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", d.getId());
                    m.put("orgId", d.getOrgId() != null ? d.getOrgId() : "");
                    m.put("branchId", d.getBranchId() != null ? d.getBranchId() : "");
                    m.put("name", d.getName() != null ? d.getName() : "");
                    m.put("macId", d.getMacId() != null ? d.getMacId() : "");
                    m.put("cashBalance", d.getCashBalance() != null ? d.getCashBalance() : BigDecimal.ZERO);
                    m.put("status", d.getStatus() != null ? d.getStatus() : "OPEN");
                    return m;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body,
            Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Optional<Account> current = accountRepository.findById(auth.getName());
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Account account = current.get();
        String role = account.getRole();
        String userOrgId = account.getOrgId();

        Object branchIdObj = body.get("branchId");
        if (!(branchIdObj instanceof String) || ((String) branchIdObj).isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "branchId is required"));
        }
        String branchId = (String) branchIdObj;

        Optional<Branch> branchOpt = branchRepository.findById(branchId);
        if (branchOpt.isEmpty() || branchOpt.get().isArchived()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Branch not found or archived"));
        }
        Branch branch = branchOpt.get();
        String branchOrgId = branch.getOrgId();

        if (!"SUPER_ADMIN".equals(role) && (userOrgId == null || !userOrgId.equals(branchOrgId))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Object nameObj = body.get("name");
        if (!(nameObj instanceof String) || ((String) nameObj).isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "name is required"));
        }
        String name = (String) nameObj;

        String status = "OPEN";
        Object statusObj = body.get("status");
        if (statusObj instanceof String && !((String) statusObj).isBlank()) {
            status = (String) statusObj;
        }

        BigDecimal cashBalance = BigDecimal.ZERO;
        Object cashObj = body.get("cashBalance");
        if (cashObj instanceof Number) {
            cashBalance = BigDecimal.valueOf(((Number) cashObj).doubleValue());
        }

        Device device = new Device();
        device.setOrgId(branchOrgId);
        device.setBranchId(branchId);
        device.setName(name);
        if (body.containsKey("macId")) {
            device.setMacId((String) body.get("macId"));
        }
        device.setStatus(status);
        device.setCashBalance(cashBalance);
        device.setArchived(false);

        deviceRepository.save(device);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", device.getId());
        response.put("orgId", device.getOrgId());
        response.put("branchId", device.getBranchId());
        response.put("name", device.getName());
        response.put("macId", device.getMacId());
        response.put("cashBalance", device.getCashBalance());
        response.put("status", device.getStatus());

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable String id,
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Optional<Account> current = accountRepository.findById(auth.getName());
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Account account = current.get();
        String role = account.getRole();
        String userOrgId = account.getOrgId();

        Optional<Device> deviceOpt = deviceRepository.findById(id);
        if (deviceOpt.isEmpty() || deviceOpt.get().isArchived()) {
            return ResponseEntity.notFound().build();
        }
        Device device = deviceOpt.get();

        if (!"SUPER_ADMIN".equals(role) && (userOrgId == null || !userOrgId.equals(device.getOrgId()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        if (body.containsKey("branchId")) {
            Object branchIdObj = body.get("branchId");
            if (branchIdObj instanceof String && !((String) branchIdObj).isBlank()) {
                String newBranchId = (String) branchIdObj;
                Optional<Branch> branchOpt = branchRepository.findById(newBranchId);
                if (branchOpt.isEmpty() || branchOpt.get().isArchived()) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(Map.of("message", "Branch not found or archived"));
                }
                Branch branch = branchOpt.get();
                String branchOrgId = branch.getOrgId();

                if (!"SUPER_ADMIN".equals(role) && (userOrgId == null || !userOrgId.equals(branchOrgId))) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                }

                device.setBranchId(newBranchId);
                device.setOrgId(branchOrgId);
            }
        }

        if (body.containsKey("name")) {
            Object nameObj = body.get("name");
            if (nameObj instanceof String) {
                device.setName((String) nameObj);
            }
        }
        if (body.containsKey("status")) {
            Object statusObj = body.get("status");
            if (statusObj instanceof String && !((String) statusObj).isBlank()) {
                device.setStatus((String) statusObj);
            }
        }
        if (body.containsKey("macId")) {
            Object macIdObj = body.get("macId");
            if (macIdObj instanceof String) {
                device.setMacId((String) macIdObj);
            }
        }
        if (body.containsKey("cashBalance")) {
            Object cashObj = body.get("cashBalance");
            if (cashObj instanceof Number) {
                device.setCashBalance(BigDecimal.valueOf(((Number) cashObj).doubleValue()));
            }
        }

        deviceRepository.save(device);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", device.getId());
        response.put("orgId", device.getOrgId());
        response.put("branchId", device.getBranchId());
        response.put("name", device.getName());
        response.put("macId", device.getMacId());
        response.put("cashBalance", device.getCashBalance());
        response.put("status", device.getStatus());

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Optional<Account> current = accountRepository.findById(auth.getName());
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Account account = current.get();
        String role = account.getRole();
        String userOrgId = account.getOrgId();

        Optional<Device> deviceOpt = deviceRepository.findById(id);
        if (deviceOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Device device = deviceOpt.get();

        if (!"SUPER_ADMIN".equals(role) && (userOrgId == null || !userOrgId.equals(device.getOrgId()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        device.setArchived(true);
        deviceRepository.save(device);

        return ResponseEntity.noContent().build();
    }
}
