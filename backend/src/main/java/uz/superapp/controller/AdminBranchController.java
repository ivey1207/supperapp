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

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin/branches")
public class AdminBranchController {

    private final BranchRepository branchRepository;
    private final AccountRepository accountRepository;
    private final DeviceRepository deviceRepository;

    public AdminBranchController(BranchRepository branchRepository, AccountRepository accountRepository,
            DeviceRepository deviceRepository) {
        this.branchRepository = branchRepository;
        this.accountRepository = accountRepository;
        this.deviceRepository = deviceRepository;
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
        List<Branch> all = effectiveOrgId != null && !effectiveOrgId.isBlank()
                ? branchRepository.findByOrgIdAndArchivedFalse(effectiveOrgId)
                : branchRepository.findByArchivedFalse();
        List<Map<String, Object>> result = all.stream()
                .map(b -> {
                    String address = b.getAddress() != null ? b.getAddress() : "";
                    String phone = b.getPhone() != null ? b.getPhone() : "";
                    return Map.<String, Object>of(
                            "name", b.getName() != null ? b.getName() : "",
                            "address", address,
                            "phone", phone,
                            "status", b.getStatus() != null ? b.getStatus() : "OPEN",
                            "partnerType", b.getPartnerType() != null ? b.getPartnerType() : "");
                })
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
        String orgId = (String) body.get("orgId");
        if (orgId == null || orgId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "orgId is required"));
        }
        if (!"SUPER_ADMIN".equals(role) && (userOrgId == null || !userOrgId.equals(orgId))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        String name = (String) body.get("name");
        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "name is required"));
        }
        Branch branch = new Branch();
        branch.setOrgId(orgId);
        branch.setName(name);
        branch.setAddress((String) body.getOrDefault("address", ""));
        branch.setPhone((String) body.getOrDefault("phone", ""));
        branch.setStatus((String) body.getOrDefault("status", "OPEN"));

        String partnerType = (String) body.get("partnerType");
        if (partnerType != null) {
            branch.setPartnerType(partnerType);
        }

        branch.setArchived(false);
        branchRepository.save(branch);

        // Handle boxCount for CAR_WASH
        if ("CAR_WASH".equals(partnerType)) {
            Object boxCountObj = body.get("boxCount");
            if (boxCountObj instanceof Integer) {
                int boxCount = (Integer) boxCountObj;
                if (boxCount > 0) {
                    for (int i = 1; i <= boxCount; i++) {
                        Device device = new Device();
                        device.setOrgId(orgId);
                        device.setBranchId(branch.getId());
                        device.setName("Box " + i);
                        device.setStatus("OPEN");
                        // Use BigDecimal for cashBalance
                        device.setCashBalance(java.math.BigDecimal.ZERO);
                        device.setArchived(false);
                        deviceRepository.save(device);
                    }
                }
            }
        }

        return ResponseEntity.ok(Map.of(
                "id", branch.getId(),
                "orgId", branch.getOrgId() != null ? branch.getOrgId() : "",
                "name", branch.getName() != null ? branch.getName() : "",
                "address", branch.getAddress() != null ? branch.getAddress() : "",
                "phone", branch.getPhone() != null ? branch.getPhone() : "",
                "status", branch.getStatus() != null ? branch.getStatus() : "OPEN",
                "partnerType", branch.getPartnerType() != null ? branch.getPartnerType() : ""));
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
        Optional<Branch> branchOpt = branchRepository.findById(id);
        if (branchOpt.isEmpty() || branchOpt.get().isArchived()) {
            return ResponseEntity.notFound().build();
        }
        Branch branch = branchOpt.get();
        if (!"SUPER_ADMIN".equals(role) && (userOrgId == null || !userOrgId.equals(branch.getOrgId()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (body.containsKey("name")) {
            branch.setName((String) body.get("name"));
        }
        if (body.containsKey("address")) {
            branch.setAddress((String) body.get("address"));
        }
        if (body.containsKey("phone")) {
            branch.setPhone((String) body.get("phone"));
        }
        if (body.containsKey("status")) {
            branch.setStatus((String) body.get("status"));
        }
        if (body.containsKey("partnerType")) {
            branch.setPartnerType((String) body.get("partnerType"));
        }
        branchRepository.save(branch);
        return ResponseEntity.ok(Map.of(
                "id", branch.getId(),
                "orgId", branch.getOrgId() != null ? branch.getOrgId() : "",
                "name", branch.getName() != null ? branch.getName() : "",
                "address", branch.getAddress() != null ? branch.getAddress() : "",
                "phone", branch.getPhone() != null ? branch.getPhone() : "",
                "status", branch.getStatus() != null ? branch.getStatus() : "OPEN",
                "partnerType", branch.getPartnerType() != null ? branch.getPartnerType() : ""));
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
        String role = current.get().getRole();
        String userOrgId = current.get().getOrgId();
        Optional<Branch> branchOpt = branchRepository.findById(id);
        if (branchOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Branch branch = branchOpt.get();
        if (!"SUPER_ADMIN".equals(role) && (userOrgId == null || !userOrgId.equals(branch.getOrgId()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        branch.setArchived(true);
        branchRepository.save(branch);
        return ResponseEntity.noContent().build();
    }
}
