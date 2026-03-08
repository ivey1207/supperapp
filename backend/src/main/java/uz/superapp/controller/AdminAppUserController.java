package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.Account;
import uz.superapp.domain.AppUser;
import uz.superapp.repository.AccountRepository;
import uz.superapp.repository.AppUserRepository;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Tag(name = "Admin App User Management API")
@RestController
@RequestMapping("/api/v1/admin/app-users")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminAppUserController {

    private final AppUserRepository appUserRepository;
    private final AccountRepository accountRepository;

    public AdminAppUserController(AppUserRepository appUserRepository, AccountRepository accountRepository) {
        this.appUserRepository = appUserRepository;
        this.accountRepository = accountRepository;
    }

    @GetMapping
    public ResponseEntity<?> list(Authentication auth) {
        if (!isSuperAdmin(auth)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            List<Map<String, Object>> result = appUserRepository.findAll().stream()
                    .map(u -> {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("id", u.getId());
                        m.put("phone", u.getPhone() != null ? u.getPhone() : "");
                        m.put("email", u.getEmail() != null ? u.getEmail() : "");
                        m.put("fullName", u.getFullName() != null ? u.getFullName() : "");
                        m.put("blocked", u.isBlocked());
                        m.put("isSpecialist", u.isSpecialist());
                        m.put("isOnline", u.isOnline());
                        m.put("orgId", u.getOrgId() != null ? u.getOrgId() : "");
                        m.put("branchId", u.getBranchId() != null ? u.getBranchId() : "");
                        m.put("commissionRate", u.getCommissionRate());

                        m.put("carModel", u.getCarModel() != null ? u.getCarModel() : "");

                        m.put("carNumber", u.getCarNumber() != null ? u.getCarNumber() : "");
                        m.put("lastUpdate",
                                u.getLastLocationUpdate() != null ? u.getLastLocationUpdate().toString() : null);
                        return m;
                    })
                    .collect(Collectors.toList());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error listing users: " + e.getMessage()));
        }
    }

    @PostMapping("/{id}/toggle-block")
    public ResponseEntity<Map<String, Object>> toggleBlock(@PathVariable String id, Authentication auth) {
        if (!isSuperAdmin(auth)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return appUserRepository.findById(id).map(user -> {
            user.setBlocked(!user.isBlocked());
            appUserRepository.save(user);
            return ResponseEntity.ok(Map.<String, Object>of(
                    "id", user.getId(),
                    "blocked", user.isBlocked()));
        }).orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Toggle user specialist status")
    @PostMapping("/{id}/toggle-specialist")
    public ResponseEntity<Map<String, Object>> toggleSpecialist(@PathVariable String id, Authentication auth) {
        if (!isSuperAdmin(auth)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return appUserRepository.findById(id).map(user -> {
            user.setSpecialist(!user.isSpecialist());
            appUserRepository.save(user);
            return ResponseEntity.ok(Map.<String, Object>of(
                    "id", user.getId(),
                    "isSpecialist", user.isSpecialist()));
        }).orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Assign specialist to organization")
    @PostMapping("/{id}/org")
    public ResponseEntity<Map<String, Object>> setOrg(@PathVariable String id, @RequestParam String orgId,
            Authentication auth) {
        if (!isSuperAdmin(auth)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return appUserRepository.findById(id).map(user -> {
            user.setOrgId(orgId);
            appUserRepository.save(user);
            return ResponseEntity.ok(Map.<String, Object>of(
                    "id", user.getId(),
                    "orgId", user.getOrgId() != null ? user.getOrgId() : ""));
        }).orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Set specialist commission rate")
    @PostMapping("/{id}/commission")
    public ResponseEntity<Map<String, Object>> setCommission(@PathVariable String id,
            @RequestParam java.math.BigDecimal rate, Authentication auth) {
        if (!isSuperAdmin(auth)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return appUserRepository.findById(id).map(user -> {
            user.setCommissionRate(rate);
            appUserRepository.save(user);
            return ResponseEntity.ok(Map.<String, Object>of(
                    "id", user.getId(),
                    "commissionRate", user.getCommissionRate() != null ? user.getCommissionRate() : 0));
        }).orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Assign specialist to branch")
    @PostMapping("/{id}/branch")
    public ResponseEntity<Map<String, Object>> setBranch(@PathVariable String id, @RequestParam String branchId,
            Authentication auth) {
        if (!isSuperAdmin(auth)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return appUserRepository.findById(id).map(user -> {
            user.setBranchId(branchId);
            appUserRepository.save(user);
            return ResponseEntity.ok(Map.<String, Object>of(
                    "id", user.getId(),
                    "branchId", user.getBranchId() != null ? user.getBranchId() : ""));
        }).orElse(ResponseEntity.notFound().build());
    }

    private boolean isSuperAdmin(Authentication auth) {

        if (auth == null || auth.getName() == null)
            return false;
        String email = auth.getName();
        return accountRepository.findFirstByEmailAndArchivedFalse(email)
                .map(Account::getRole)
                .filter("SUPER_ADMIN"::equals)
                .isPresent();
    }
}
