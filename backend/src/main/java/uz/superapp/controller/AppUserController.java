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

    public AppUserController(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
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

        return ResponseEntity.ok(appUserRepository.save(user));
    }
}
