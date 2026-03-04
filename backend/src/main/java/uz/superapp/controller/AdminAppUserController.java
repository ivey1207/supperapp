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
import java.util.Optional;
import java.util.stream.Collectors;

@Tag(name = "Admin App User Management API")
@RestController
@RequestMapping("/api/v1/admin/app-users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminAppUserController {

    private final AppUserRepository appUserRepository;
    private final AccountRepository accountRepository;

    public AdminAppUserController(AppUserRepository appUserRepository, AccountRepository accountRepository) {
        this.appUserRepository = appUserRepository;
        this.accountRepository = accountRepository;
    }

    @Operation(summary = "Get list of all app users")
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(Authentication auth) {
        // Проверка на SUPER_ADMIN
        if (!isSuperAdmin(auth)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<AppUser> users = appUserRepository.findAll();
        List<Map<String, Object>> result = users.stream()
                .map(u -> Map.<String, Object>of(
                        "id", u.getId(),
                        "phone", u.getPhone() != null ? u.getPhone() : "",
                        "fullName", u.getFullName() != null ? u.getFullName() : "",
                        "blocked", u.isBlocked(),
                        "carModel", u.getCarModel() != null ? u.getCarModel() : "",
                        "carNumber", u.getCarNumber() != null ? u.getCarNumber() : ""))
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Toggle user block status")
    @PostMapping("/{id}/toggle-block")
    public ResponseEntity<Map<String, Object>> toggleBlock(@PathVariable String id, Authentication auth) {
        if (!isSuperAdmin(auth)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Optional<AppUser> userOpt = appUserRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        AppUser user = userOpt.get();
        user.setBlocked(!user.isBlocked());
        appUserRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "id", user.getId(),
                "blocked", user.isBlocked()));
    }

    private boolean isSuperAdmin(Authentication auth) {
        if (auth == null || auth.getName() == null)
            return false;
        return accountRepository.findById(auth.getName())
                .map(Account::getRole)
                .filter("SUPER_ADMIN"::equals)
                .isPresent();
    }
}
