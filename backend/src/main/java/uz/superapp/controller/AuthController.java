package uz.superapp.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.Account;
import uz.superapp.repository.AccountRepository;
import uz.superapp.config.JwtUtil;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthController(AccountRepository accountRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
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
        String token = jwtUtil.generate(account.getId(), account.getRole());
        return ResponseEntity.ok(Map.of(
                "accessToken", token,
                "email", account.getEmail(),
                "fullName", account.getFullName() != null ? account.getFullName() : "",
                "role", account.getRole(),
                "orgId", account.getOrgId() != null ? account.getOrgId() : ""
        ));
    }
}
