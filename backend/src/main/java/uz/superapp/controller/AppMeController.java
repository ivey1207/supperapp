package uz.superapp.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import uz.superapp.domain.AppUser;
import uz.superapp.repository.AppUserRepository;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/app/me")
public class AppMeController {

    private final AppUserRepository appUserRepository;

    public AppMeController(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    @GetMapping
    @PreAuthorize("hasRole('APP_USER') or hasRole('USER')")
    public ResponseEntity<Map<String, Object>> me(Authentication auth) {
        String userId = auth.getName();
        AppUser user = appUserRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.ok(Map.of("phone", "", "fullName", ""));
        }
        return ResponseEntity.ok(Map.of(
                "id", user.getId(),
                "phone", user.getPhone() != null ? user.getPhone() : "",
                "fullName", user.getFullName() != null ? user.getFullName() : ""
        ));
    }
}
