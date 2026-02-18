package uz.superapp.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import uz.superapp.domain.Account;
import uz.superapp.repository.AccountRepository;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/me")
public class AdminMeController {

    private final AccountRepository accountRepository;

    public AdminMeController(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> me(Authentication auth) {
        String accountId = auth.getName();
        Account a = accountRepository.findById(accountId).orElse(null);
        if (a == null) {
            return ResponseEntity.ok(Map.of("email", "", "fullName", "", "role", ""));
        }
        return ResponseEntity.ok(Map.of(
                "id", a.getId(),
                "email", a.getEmail() != null ? a.getEmail() : "",
                "fullName", a.getFullName() != null ? a.getFullName() : "",
                "role", a.getRole() != null ? a.getRole() : "",
                "orgId", a.getOrgId() != null ? a.getOrgId() : ""
        ));
    }
}
