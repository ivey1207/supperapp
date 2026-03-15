package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.AppUser;
import uz.superapp.domain.Branch;
import uz.superapp.domain.OnDemandOrder;
import uz.superapp.domain.Organization;
import uz.superapp.domain.Wallet;
import uz.superapp.repository.AppUserRepository;
import uz.superapp.repository.BranchRepository;
import uz.superapp.repository.OnDemandOrderRepository;
import uz.superapp.repository.OrganizationRepository;
import uz.superapp.repository.WalletRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Tag(name = "App On-Demand Service API")
@RestController
@RequestMapping("/api/v1/app/on-demand")
public class AppOnDemandOrderController {

    private final OnDemandOrderRepository repository;
    private final WalletRepository walletRepository;
    private final OrganizationRepository organizationRepository;
    private final AppUserRepository appUserRepository;
    private final BranchRepository branchRepository;

    public AppOnDemandOrderController(OnDemandOrderRepository repository,
            WalletRepository walletRepository,
            OrganizationRepository organizationRepository,
            AppUserRepository appUserRepository,
            BranchRepository branchRepository) {
        this.repository = repository;
        this.walletRepository = walletRepository;
        this.organizationRepository = organizationRepository;
        this.appUserRepository = appUserRepository;
        this.branchRepository = branchRepository;
    }

    @Operation(summary = "Create on-demand service request")
    @PostMapping
    public ResponseEntity<Map<String, Object>> create(Authentication auth, @RequestBody OnDemandOrder order) {
        order.setUserId(auth.getName());
        order.setStatus("PENDING");
        OnDemandOrder saved = repository.save(order);
        return ResponseEntity.ok(toMap(saved));
    }

    @Operation(summary = "Get list of user's on-demand orders")
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(Authentication auth) {
        String userId = auth.getName();
        return ResponseEntity.ok(repository.findByUserId(userId).stream()
                .map(this::toMap)
                .collect(Collectors.toList()));
    }

    @Operation(summary = "Find available on-demand orders for specialists")
    @GetMapping("/available")
    public ResponseEntity<List<Map<String, Object>>> listAvailable() {
        return ResponseEntity.ok(repository.findByStatus("PENDING").stream()
                .map(this::toMap)
                .collect(Collectors.toList()));
    }

    @Operation(summary = "Get specialist's current active order")
    @GetMapping("/contractor/active")
    public ResponseEntity<List<Map<String, Object>>> listActive(Authentication auth) {
        return ResponseEntity.ok(repository
                .findByContractorIdAndStatusIn(auth.getName(), List.of("ACCEPTED", "EN_ROUTE", "ARRIVED", "STARTED"))
                .stream()
                .map(this::toMap)
                .collect(Collectors.toList()));
    }

    @Operation(summary = "Accept an on-demand order")
    @PostMapping("/{id}/accept")
    public ResponseEntity<?> accept(Authentication auth, @PathVariable String id) {
        return repository.findById(id).map(order -> {
            if (!"PENDING".equalsIgnoreCase(order.getStatus())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Order already taken or cancelled"));
            }

            String specialistId = auth.getName();
            order.setContractorId(specialistId);
            order.setStatus("ACCEPTED");
            order.setAcceptedAt(Instant.now());

            // Link order to specialist's organization for correct commission settlement
            appUserRepository.findById(specialistId).ifPresent(user -> {
                if (user.getOrgId() != null) {
                    order.setOrgId(user.getOrgId());
                }
            });

            try {
                OnDemandOrder saved = repository.save(order);
                System.out.println("Order " + id + " accepted by " + specialistId + " for org " + order.getOrgId());
                return ResponseEntity.ok(toMap(saved));
            } catch (Exception e) {
                System.err.println("Error saving order acceptance for ID: " + id);
                e.printStackTrace();
                return ResponseEntity.status(409)
                        .body(Map.of("message",
                                "Conflict: Order was just taken by someone else or a database error occurred. " + e.getMessage()));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Update order status (Specialist workflow)")
    @PostMapping("/{id}/status")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> updateStatus(Authentication auth, @PathVariable String id, @RequestParam String status,
            @RequestParam(required = false) BigDecimal finalAmount,
            @RequestParam(required = false) String photoAfterUrl) {
        return repository.findById(id).map(order -> {
            if (!auth.getName().equals(order.getContractorId())) {
                return ResponseEntity.status(403).body(Map.of("message", "Not your order"));
            }

            String oldStatus = order.getStatus();
            String newStatus = status.toUpperCase();
            order.setStatus(newStatus);

            if ("COMPLETED".equals(newStatus) && !"COMPLETED".equalsIgnoreCase(oldStatus)) {
                order.setCompletedAt(Instant.now());
                if (finalAmount != null)
                    order.setFinalAmount(finalAmount);
                if (photoAfterUrl != null)
                    order.setPhotoAfterUrl(photoAfterUrl);

                BigDecimal amount = order.getFinalAmount();
                if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("message", "Final amount is required for completion"));
                }

                // Financial Settlement
                Wallet clientWallet = walletRepository.findByUser_Id(order.getUserId()).orElse(null);
                Wallet specialistWallet = walletRepository.findByUser_Id(auth.getName()).orElse(null);

                if (clientWallet == null || specialistWallet == null) {
                    return ResponseEntity.status(500)
                            .body(Map.of("message", "Wallet not found for user or specialist"));
                }

                if (clientWallet.getBalance().compareTo(amount) < 0) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("message", "Client has insufficient funds in wallet"));
                }

                // 1. Debit Client
                clientWallet.setBalance(clientWallet.getBalance().subtract(amount));

                // 2. Hierarchical Commission Lookup: Specialist -> Branch -> Organization ->
                // Default
                BigDecimal commissionRate = null;

                // Specialist level
                AppUser specialist = appUserRepository.findById(auth.getName()).orElse(null);
                if (specialist != null && specialist.getCommissionRate() != null) {
                    commissionRate = specialist.getCommissionRate();
                }

                // Branch level
                if (commissionRate == null && order.getProviderId() != null) {
                    commissionRate = branchRepository.findById(order.getProviderId())
                            .map(Branch::getCommissionRate)
                            .orElse(null);
                }

                // Organization level
                if (commissionRate == null && order.getOrgId() != null) {
                    commissionRate = organizationRepository.findById(order.getOrgId())
                            .map(Organization::getCommissionRate)
                            .orElse(null);
                }

                // Default fallback
                if (commissionRate == null) {
                    commissionRate = new BigDecimal("0.15");
                }

                // 3. Calculate Payout
                BigDecimal commission = amount.multiply(commissionRate);
                BigDecimal payout = amount.subtract(commission);

                // 4. Credit Specialist

                specialistWallet.setBalance(specialistWallet.getBalance().add(payout));

                walletRepository.save(clientWallet);
                walletRepository.save(specialistWallet);

                // Track platform revenue (could add PaymentTransaction record here)
            }

            return ResponseEntity.ok(toMap(repository.save(order)));
        }).orElse(ResponseEntity.notFound().build());
    }

    private Map<String, Object> toMap(OnDemandOrder o) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", o.getId());
        m.put("type", o.getType());
        m.put("status", o.getStatus());
        m.put("userAddress", o.getUserAddress());
        m.put("userLat", o.getUserLat());
        m.put("userLon", o.getUserLon());
        m.put("carDetails", o.getCarDetails());
        m.put("description", o.getDescription());
        m.put("providerId", o.getProviderId());
        m.put("contractorId", o.getContractorId());
        m.put("providerLat", o.getProviderLat());
        m.put("providerLon", o.getProviderLon());
        m.put("finalAmount", o.getFinalAmount());
        m.put("photoAfterUrl", o.getPhotoAfterUrl());
        m.put("createdAt", o.getCreatedAt() != null ? o.getCreatedAt().toString() : null);
        m.put("acceptedAt", o.getAcceptedAt() != null ? o.getAcceptedAt().toString() : null);
        m.put("completedAt", o.getCompletedAt() != null ? o.getCompletedAt().toString() : null);
        return m;
    }
}
