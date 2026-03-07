package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
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
        String name = auth.getName();
        if (name == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Optional<Account> currentAccount = accountRepository.findById(name);
        if (currentAccount.isEmpty())
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

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
    public ResponseEntity<?> updateStatus(@PathVariable String id, @RequestBody Map<String, Object> body,
            Authentication auth) {
        String name = auth.getName();
        if (name == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Optional<Account> currentAccount = accountRepository.findById(name);
        if (currentAccount.isEmpty())
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        String orgId = currentAccount.get().getOrgId();
        String role = currentAccount.get().getRole();

        Optional<OnDemandOrder> orderOpt = onDemandOrderRepository.findById(id);
        if (orderOpt.isEmpty())
            return ResponseEntity.notFound().build();

        OnDemandOrder order = orderOpt.get();
        Object newStatusObj = body.get("status");
        String currentStatus = order.getStatus() != null ? order.getStatus() : "PENDING";
        String newStatus = (newStatusObj instanceof String) ? ((String) newStatusObj).toUpperCase() : currentStatus;

        // Security check: only super-admin or assigned partner can update
        if (!"SUPER_ADMIN".equals(role)) {
            // If the order is PENDING, any partner can accept it
            if ("PENDING".equals(currentStatus)) {
                if ("ACCEPTED".equals(newStatus)) {
                    order.setOrgId(orgId);
                    order.setAcceptedAt(java.time.Instant.now());
                }
            } else {
                // For non-pending orders, must belong to the partner's organization
                String orderOrgId = order.getOrgId();
                if (orderOrgId == null || !orderOrgId.equals(orgId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                }
            }
        } else {
            // Super admin logic: set timestamps if transitioning status
            if ("ACCEPTED".equals(newStatus) && order.getAcceptedAt() == null) {
                order.setAcceptedAt(java.time.Instant.now());
            }
        }

        order.setStatus(newStatus);

        if ("COMPLETED".equals(newStatus) && order.getCompletedAt() == null) {
            order.setCompletedAt(java.time.Instant.now());
        }

        if (body.get("contractorId") != null) {
            order.setContractorId(body.get("contractorId").toString());
        }
        if (body.get("providerId") != null) {
            order.setProviderId(body.get("providerId").toString());
        }
        if (body.get("providerLat") != null) {
            try {
                order.setProviderLat(Double.valueOf(body.get("providerLat").toString()));
            } catch (Exception e) {
            }
        }
        if (body.get("providerLon") != null) {
            try {
                order.setProviderLon(Double.valueOf(body.get("providerLon").toString()));
            } catch (Exception e) {
            }
        }

        return ResponseEntity.ok(onDemandOrderRepository.save(order));
    }
}
