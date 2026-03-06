package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.AppUser;
import uz.superapp.repository.AppUserRepository;

import java.util.Map;
import java.util.Optional;

@Tag(name = "App User API")
@RestController
@RequestMapping("/api/v1/app/user")
public class AppUserController {

    private final AppUserRepository appUserRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    public AppUserController(AppUserRepository appUserRepository,
            org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Operation(summary = "Get current user profile")
    @GetMapping("/me")
    @PreAuthorize("hasRole('APP_USER')")
    public ResponseEntity<?> getMe(Authentication auth) {
        Optional<AppUser> user = appUserRepository.findById(auth.getName());
        return user.map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Update user profile")
    @PutMapping("/profile")
    @PreAuthorize("hasRole('APP_USER')")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> body, Authentication auth) {
        Optional<AppUser> userOpt = appUserRepository.findById(auth.getName());
        if (userOpt.isEmpty())
            return ResponseEntity.notFound().build();

        AppUser user = userOpt.get();
        if (body.containsKey("fullName"))
            user.setFullName(body.get("fullName"));
        if (body.containsKey("carModel"))
            user.setCarModel(body.get("carModel"));
        if (body.containsKey("carNumber"))
            user.setCarNumber(body.get("carNumber"));
        if (body.containsKey("email")) {
            String email = body.get("email");
            if (email != null && !email.isBlank()) {
                if (appUserRepository.findByEmail(email).isPresent()
                        && !java.util.Objects.equals(user.getEmail(), email)) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Email already in use"));
                }
                user.setEmail(email);
            }
        }
        if (body.containsKey("password")) {
            String password = body.get("password");
            if (password != null && password.length() >= 6) {
                user.setPasswordHash(passwordEncoder.encode(password));
            } else if (password != null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Password must be at least 6 characters"));
            }
        }

        return ResponseEntity.ok(appUserRepository.save(user));
    }
}
