package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.Promotion;
import uz.superapp.domain.PromotionRepository;
import uz.superapp.domain.Account;
import uz.superapp.repository.AccountRepository;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Tag(name = "Admin Promotion API")
@RestController
@RequestMapping("/api/v1/admin/promotions")
public class AdminPromotionController {

    private final PromotionRepository promotionRepository;
    private final AccountRepository accountRepository;

    public AdminPromotionController(PromotionRepository promotionRepository, AccountRepository accountRepository) {
        this.promotionRepository = promotionRepository;
        this.accountRepository = accountRepository;
    }

    @Operation(summary = "Execute getAll operation")
    @GetMapping
    public ResponseEntity<?> getAll(
            Principal principal,
            @RequestParam(required = false) String orgId,
            @RequestParam(required = false) String branchId) {

        try {
            String name = principal.getName();
            if (name == null) {
                return ResponseEntity.ok(List.of());
            }

            Optional<Account> accountOpt = accountRepository.findById(name);
            if (accountOpt.isEmpty())
                return ResponseEntity.ok(List.of());

            Account account = accountOpt.get();
            String effectiveOrgId = "SUPER_ADMIN".equals(account.getRole()) ? orgId : account.getOrgId();

            if (effectiveOrgId != null && !effectiveOrgId.isEmpty()) {
                if (branchId != null && !branchId.isEmpty()) {
                    return ResponseEntity
                            .ok(promotionRepository.findByOrgIdAndBranchIdAndArchivedFalse(effectiveOrgId, branchId));
                }
                return ResponseEntity.ok(promotionRepository.findByOrgIdAndArchivedFalse(effectiveOrgId));
            }

            if (branchId != null && !branchId.isEmpty()) {
                return ResponseEntity.ok(promotionRepository.findByBranchIdAndArchivedFalse(branchId));
            }

            return ResponseEntity.ok(promotionRepository.findAll());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error loading promotions: " + e.getMessage()));
        }
    }

    @Operation(summary = "Create a new item")
    @PostMapping
    public ResponseEntity<?> create(@RequestBody Promotion promotion, Principal principal) {
        if (principal == null || principal.getName() == null)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Optional<Account> accountOpt = accountRepository.findById(principal.getName());
        if (accountOpt.isEmpty())
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Account account = accountOpt.get();
        if (!"SUPER_ADMIN".equals(account.getRole())) {
            promotion.setOrgId(account.getOrgId());
        }
        return ResponseEntity.ok(promotionRepository.save(promotion));
    }

    @Operation(summary = "Update an existing item")
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody Promotion promotion, Principal principal) {
        if (principal == null || principal.getName() == null)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Optional<Account> accountOpt = accountRepository.findById(principal.getName());
        if (accountOpt.isEmpty())
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Account account = accountOpt.get();
        Optional<Promotion> existingOpt = promotionRepository.findById(id);
        if (existingOpt.isEmpty())
            return ResponseEntity.notFound().build();

        promotion.setId(id);
        if (!"SUPER_ADMIN".equals(account.getRole())) {
            promotion.setOrgId(account.getOrgId());
        }
        return ResponseEntity.ok(promotionRepository.save(promotion));
    }

    @Operation(summary = "Delete an item")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id, Principal principal) {
        if (principal == null || principal.getName() == null)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Optional<Account> accountOpt = accountRepository.findById(principal.getName());
        if (accountOpt.isEmpty())
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Account account = accountOpt.get();
        Optional<Promotion> existingOpt = promotionRepository.findById(id);
        if (existingOpt.isEmpty())
            return ResponseEntity.notFound().build();

        Promotion existing = existingOpt.get();

        if (!"SUPER_ADMIN".equals(account.getRole())
                && (existing.getOrgId() == null || !existing.getOrgId().equals(account.getOrgId()))) {
            throw new RuntimeException("Access denied");
        }

        existing.setArchived(true);
        promotionRepository.save(existing);
        return ResponseEntity.ok().build();
    }
}
