package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.Account;
import uz.superapp.domain.PromoTemplate;
import uz.superapp.domain.PromoTemplateRepository;
import uz.superapp.repository.AccountRepository;

import java.security.Principal;
import java.util.Optional;

@Tag(name = "Admin Promo Template API")
@RestController
@RequestMapping("/api/v1/admin/promo-templates")
public class AdminPromoTemplateController {

    private final PromoTemplateRepository templateRepository;
    private final AccountRepository accountRepository;

    public AdminPromoTemplateController(PromoTemplateRepository templateRepository,
            AccountRepository accountRepository) {
        this.templateRepository = templateRepository;
        this.accountRepository = accountRepository;
    }

    @Operation(summary = "Get all templates")
    @GetMapping
    public ResponseEntity<?> getAll(Principal principal) {
        if (!isSuperAdmin(principal))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.ok(templateRepository.findAll());
    }

    @Operation(summary = "Create a new template")
    @PostMapping
    public ResponseEntity<?> create(@RequestBody PromoTemplate template, Principal principal) {
        if (!isSuperAdmin(principal))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.ok(templateRepository.save(template));
    }

    @Operation(summary = "Update an existing template")
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody PromoTemplate template, Principal principal) {
        if (!isSuperAdmin(principal))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        if (!templateRepository.existsById(id))
            return ResponseEntity.notFound().build();
        template.setId(id);
        return ResponseEntity.ok(templateRepository.save(template));
    }

    @Operation(summary = "Delete a template")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id, Principal principal) {
        if (!isSuperAdmin(principal))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        templateRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    private boolean isSuperAdmin(Principal principal) {
        if (principal == null || principal.getName() == null)
            return false;
        Optional<Account> accountOpt = accountRepository.findFirstByEmailAndArchivedFalse(principal.getName());
        return accountOpt.isPresent() && "SUPER_ADMIN".equals(accountOpt.get().getRole());
    }
}
