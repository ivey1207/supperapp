package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.Account;
import uz.superapp.domain.OnDemandOrder;
import uz.superapp.repository.AccountRepository;
import uz.superapp.repository.OnDemandOrderRepository;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Tag(name = "Admin On-Demand Orders API")
@RestController
@RequestMapping("/api/v1/admin/on-demand")
public class AdminOnDemandOrderController {

    private final OnDemandOrderRepository onDemandOrderRepository;
    private final AccountRepository accountRepository;

    public AdminOnDemandOrderController(OnDemandOrderRepository onDemandOrderRepository,
            AccountRepository accountRepository) {
        this.onDemandOrderRepository = onDemandOrderRepository;
        this.accountRepository = accountRepository;
    }

    @Operation(summary = "List on-demand orders for the current user's organization")
    @GetMapping
    public ResponseEntity<List<OnDemandOrder>> list(Authentication auth) {
        Optional<Account> currentAccount = accountRepository.findById(auth.getName());
        if (currentAccount.isEmpty())
            return ResponseEntity.status(401).build();

        String role = currentAccount.get().getRole();
        String orgId = currentAccount.get().getOrgId();

        if ("SUPER_ADMIN".equals(role)) {
            return ResponseEntity.ok(onDemandOrderRepository.findAll());
        } else if (orgId != null) {
            // For partners, we show orders assigned to them OR pending orders (central
            // queue)
            // But for simplicity, let's start with all PENDING + those assigned to them
            List<OnDemandOrder> all = onDemandOrderRepository.findAll();
            return ResponseEntity.ok(all.stream()
                    .filter(o -> "PENDING".equals(o.getStatus()) || orgId.equals(o.getOrgId()))
                    .toList());
        }

        return ResponseEntity.ok(List.of());
    }

    @Operation(summary = "Update order status (Accept, Complete, etc.)")
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable String id, @RequestBody Map<String, String> body,
            Authentication auth) {
        if (auth == null || auth.getName() == null)
            return ResponseEntity.status(401).build();
        Optional<Account> currentAccount = accountRepository.findById(auth.getName());
        if (currentAccount.isEmpty())
            return ResponseEntity.status(401).build();

        String orgId = currentAccount.get().getOrgId();
        String role = currentAccount.get().getRole();

        Optional<OnDemandOrder> orderOpt = onDemandOrderRepository.findById(id);
        if (orderOpt.isEmpty())
            return ResponseEntity.notFound().build();

        OnDemandOrder order = orderOpt.get();
        String newStatus = body.get("status");

        // If a partner accepts a pending order, assign it to their organization
        if ("ACCEPTED".equals(newStatus) && "PENDING".equals(order.getStatus()) && !"SUPER_ADMIN".equals(role)) {
            order.setOrgId(orgId);
        }

        // Logic to restrict updates only to assigned partners or super admin
        if (!"SUPER_ADMIN".equals(role) && (order.getOrgId() != null && !order.getOrgId().equals(orgId))) {
            return ResponseEntity.status(403).build();
        }

        order.setStatus(newStatus);
        if (body.containsKey("providerId")) {
            order.setProviderId(body.get("providerId"));
        }

        onDemandOrderRepository.save(order);
        return ResponseEntity.ok(order);
    }
}
