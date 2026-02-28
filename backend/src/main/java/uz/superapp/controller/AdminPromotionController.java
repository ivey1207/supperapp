package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.Promotion;
import uz.superapp.domain.PromotionRepository;
import uz.superapp.domain.Account;
import uz.superapp.repository.AccountRepository;

import java.security.Principal;
import java.util.List;

@Tag(name = "Admin Promotion API")
@RestController
@RequestMapping("/api/v1/admin/promotions")
public class AdminPromotionController {

    @Autowired
    private PromotionRepository promotionRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Operation(summary = "Execute getAll operation")
    @GetMapping
    public List<Promotion> getAll(
            Principal principal,
            @RequestParam(required = false) String orgId,
            @RequestParam(required = false) String branchId) {

        Account account = accountRepository.findById(principal.getName()).orElseThrow();
        String effectiveOrgId = "SUPER_ADMIN".equals(account.getRole()) ? orgId : account.getOrgId();

        if (effectiveOrgId != null && !effectiveOrgId.isEmpty()) {
            if (branchId != null && !branchId.isEmpty()) {
                return promotionRepository.findByOrgIdAndBranchIdAndArchivedFalse(effectiveOrgId, branchId);
            }
            return promotionRepository.findByOrgIdAndArchivedFalse(effectiveOrgId);
        }

        if (branchId != null && !branchId.isEmpty()) {
            return promotionRepository.findByBranchIdAndArchivedFalse(branchId);
        }

        return promotionRepository.findAll();
    }

    @Operation(summary = "Create a new item")
    @PostMapping
    public Promotion create(@RequestBody Promotion promotion, Principal principal) {
        Account account = accountRepository.findById(principal.getName()).orElseThrow();
        if (!"SUPER_ADMIN".equals(account.getRole())) {
            promotion.setOrgId(account.getOrgId());
        }
        return promotionRepository.save(promotion);
    }

    @Operation(summary = "Update an existing item")
    @PutMapping("/{id}")
    public Promotion update(@PathVariable String id, @RequestBody Promotion promotion, Principal principal) {
        Account account = accountRepository.findById(principal.getName()).orElseThrow();
        Promotion existing = promotionRepository.findById(id).orElseThrow();

        promotion.setId(id);
        if (!"SUPER_ADMIN".equals(account.getRole())) {
            promotion.setOrgId(account.getOrgId());
        }
        // serviceId will be handled automatically by @RequestBody mapping
        return promotionRepository.save(promotion);
    }

    @Operation(summary = "Delete an item")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id, Principal principal) {
        System.out.println("DEBUG: AdminPromotionController.delete called for id: " + id);
        Account account = accountRepository.findById(principal.getName()).orElseThrow();
        Promotion existing = promotionRepository.findById(id).orElseThrow();

        if (!"SUPER_ADMIN".equals(account.getRole())
                && (existing.getOrgId() == null || !existing.getOrgId().equals(account.getOrgId()))) {
            throw new RuntimeException("Access denied");
        }

        existing.setArchived(true);
        promotionRepository.save(existing);
        return ResponseEntity.ok().build();
    }
}
