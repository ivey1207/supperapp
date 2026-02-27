package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;


import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.Account;
import uz.superapp.repository.AccountRepository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Tag(name = "Admin Account API")
@RestController
@RequestMapping("/api/v1/admin/accounts")
public class AdminAccountController {

    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminAccountController(AccountRepository accountRepository, PasswordEncoder passwordEncoder) {
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Operation(summary = "Get list of items")
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(Authentication auth) {
        List<Account> all;
        if (auth != null && auth.getName() != null) {
            Optional<Account> current = accountRepository.findById(auth.getName());
            if (current.isPresent()) {
                String role = current.get().getRole();
                String orgId = current.get().getOrgId();
                if ("SUPER_ADMIN".equals(role)) {
                    all = accountRepository.findByArchivedFalse();
                } else if (orgId != null && !orgId.isBlank()) {
                    all = accountRepository.findByOrgIdAndArchivedFalse(orgId);
                } else {
                    all = accountRepository.findByArchivedFalse();
                }
            } else {
                all = accountRepository.findByArchivedFalse();
            }
        } else {
            all = accountRepository.findByArchivedFalse();
        }
        List<Map<String, Object>> result = all.stream()
                .map(a -> Map.<String, Object>of(
                        "id", a.getId(),
                        "email", a.getEmail() != null ? a.getEmail() : "",
                        "fullName", a.getFullName() != null ? a.getFullName() : "",
                        "role", a.getRole() != null ? a.getRole() : "",
                        "orgId", a.getOrgId() != null ? a.getOrgId() : ""))
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Create a new item")
    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, String> body, Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Optional<Account> current = accountRepository.findById(auth.getName());
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String role = current.get().getRole();
        String userOrgId = current.get().getOrgId();
        String targetOrgId = body.get("orgId");
        if (!"SUPER_ADMIN".equals(role) && (userOrgId == null || !userOrgId.equals(targetOrgId))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        String email = body.get("email");
        String password = body.get("password");
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "email and password are required"));
        }
        if (accountRepository.findByEmailAndArchivedFalse(email).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "email already exists"));
        }
        Account account = new Account();
        account.setEmail(email);
        account.setPasswordHash(passwordEncoder.encode(password));
        account.setFullName(body.getOrDefault("fullName", ""));
        account.setRole(body.getOrDefault("role", "MANAGER"));
        account.setOrgId(targetOrgId);
        account.setArchived(false);
        accountRepository.save(account);
        return ResponseEntity.ok(Map.of(
                "id", account.getId(),
                "email", account.getEmail(),
                "fullName", account.getFullName() != null ? account.getFullName() : "",
                "role", account.getRole() != null ? account.getRole() : "",
                "orgId", account.getOrgId() != null ? account.getOrgId() : ""));
    }

    @Operation(summary = "Update an existing item")
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable String id, @RequestBody Map<String, String> body,
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
        Optional<Account> accountOpt = accountRepository.findById(id);
        if (accountOpt.isEmpty() || accountOpt.get().isArchived()) {
            return ResponseEntity.notFound().build();
        }
        Account account = accountOpt.get();
        if (!"SUPER_ADMIN".equals(role) && (userOrgId == null || !userOrgId.equals(account.getOrgId()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (body.containsKey("fullName")) {
            account.setFullName(body.get("fullName"));
        }
        if (body.containsKey("role") && "SUPER_ADMIN".equals(role)) {
            account.setRole(body.get("role"));
        }
        if (body.containsKey("password") && !body.get("password").isBlank()) {
            account.setPasswordHash(passwordEncoder.encode(body.get("password")));
        }
        accountRepository.save(account);
        return ResponseEntity.ok(Map.of(
                "id", account.getId(),
                "email", account.getEmail(),
                "fullName", account.getFullName() != null ? account.getFullName() : "",
                "role", account.getRole() != null ? account.getRole() : "",
                "orgId", account.getOrgId() != null ? account.getOrgId() : ""));
    }

    @Operation(summary = "Delete an item")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, Authentication auth) {
        System.out.println("DEBUG: AdminAccountController.delete called for id: " + id);
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Optional<Account> current = accountRepository.findById(auth.getName());
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String role = current.get().getRole();
        String userOrgId = current.get().getOrgId();
        Optional<Account> accountOpt = accountRepository.findById(id);
        if (accountOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Account account = accountOpt.get();
        if (account.getId().equals(auth.getName())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build(); // Can't delete yourself
        }
        if (!"SUPER_ADMIN".equals(role) && (userOrgId == null || !userOrgId.equals(account.getOrgId()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        account.setArchived(true);
        accountRepository.save(account);
        return ResponseEntity.noContent().build();
    }
}
