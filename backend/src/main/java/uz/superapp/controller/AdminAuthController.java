package uz.superapp.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.Account;
import uz.superapp.repository.AccountRepository;
import uz.superapp.config.JwtUtil;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/auth")
public class AdminAuthController {

    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AdminAuthController(AccountRepository accountRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");
        if (email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "email and password required"));
        }
        Account account = accountRepository.findByEmailAndArchivedFalse(email).orElse(null);
        if (account == null || !passwordEncoder.matches(password, account.getPasswordHash())) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid email or password"));
        }
        // Only allow admin roles
        String role = account.getRole();
        if (!"SUPER_ADMIN".equals(role) && !"PARTNER_ADMIN".equals(role) && !"MANAGER".equals(role)) {
            return ResponseEntity.status(403).body(Map.of("message", "Access denied"));
        }
        String token = jwtUtil.generate(account.getId(), role);
        return ResponseEntity.ok(Map.of(
                "accessToken", token,
                "email", account.getEmail(),
                "fullName", account.getFullName() != null ? account.getFullName() : "",
                "role", role,
                "orgId", account.getOrgId() != null ? account.getOrgId() : ""));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader("Authorization") String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        String token = authHeader.substring(7);
        try {
            var claims = jwtUtil.parse(token);
            String accountId = claims.getSubject();
            String role = claims.get("role", String.class);
            Account account = accountRepository.findById(accountId).orElse(null);
            if (account == null) {
                return ResponseEntity.status(401).body(Map.of("message", "Account not found"));
            }
            return ResponseEntity.ok(Map.of(
                    "email", account.getEmail(),
                    "fullName", account.getFullName() != null ? account.getFullName() : "",
                    "role", role != null ? role : account.getRole(),
                    "orgId", account.getOrgId() != null ? account.getOrgId() : ""));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid token"));
        }
    }
}
