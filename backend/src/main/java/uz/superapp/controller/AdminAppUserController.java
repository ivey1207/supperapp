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
    public ResponseEntity<List<Map<String, Object>>> list(Authentication auth) {
        if (!isSuperAdmin(auth)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(appUserRepository.findAll().stream()
                .map(u -> {
                    java.util.Map<String, Object> m = new java.util.HashMap<>();
                    m.put("id", u.getId());
                    m.put("phone", u.getPhone() != null ? u.getPhone() : "");
                    m.put("fullName", u.getFullName() != null ? u.getFullName() : "");
                    m.put("blocked", u.isBlocked());
                    m.put("isSpecialist", u.isSpecialist());
                    m.put("isOnline", u.isOnline());
                    m.put("carModel", u.getCarModel() != null ? u.getCarModel() : "");
                    m.put("carNumber", u.getCarNumber() != null ? u.getCarNumber() : "");
                    m.put("lastUpdate",
                            u.getLastLocationUpdate() != null ? u.getLastLocationUpdate().toString() : null);
                    return m;
                })
                .collect(Collectors.toList()));
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

    private boolean isSuperAdmin(Authentication auth) {
        if (auth == null || auth.getName() == null)
            return false;
        String name = auth.getName();
        return accountRepository.findById(name)
                .map(uz.superapp.domain.Account::getRole)
                .filter("SUPER_ADMIN"::equals)
                .isPresent();
    }
}
