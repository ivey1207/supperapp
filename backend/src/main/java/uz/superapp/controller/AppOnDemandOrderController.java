package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.OnDemandOrder;
import uz.superapp.repository.OnDemandOrderRepository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Tag(name = "App On-Demand Service API")
@RestController
@RequestMapping("/api/v1/app/on-demand")
public class AppOnDemandOrderController {

    private final OnDemandOrderRepository repository;

    public AppOnDemandOrderController(OnDemandOrderRepository repository) {
        this.repository = repository;
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
            order.setContractorId(auth.getName());
            order.setStatus("ACCEPTED");
            order.setAcceptedAt(java.time.Instant.now());
            try {
                return ResponseEntity.ok(toMap(repository.save(order)));
            } catch (Exception e) {
                e.printStackTrace();
                return ResponseEntity.status(409)
                        .body(Map.of("message",
                                "Conflict: Order was just taken by someone else. Reason: " + e.getMessage()));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Update order status (Specialist workflow)")
    @PostMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(Authentication auth, @PathVariable String id, @RequestParam String status) {
        return repository.findById(id).map(order -> {
            if (!auth.getName().equals(order.getContractorId())) {
                return ResponseEntity.status(403).body(Map.of("message", "Not your order"));
            }
            order.setStatus(status.toUpperCase());
            if ("COMPLETED".equalsIgnoreCase(status)) {
                order.setCompletedAt(java.time.Instant.now());
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
        m.put("createdAt", o.getCreatedAt() != null ? o.getCreatedAt().toString() : null);
        m.put("acceptedAt", o.getAcceptedAt() != null ? o.getAcceptedAt().toString() : null);
        m.put("completedAt", o.getCompletedAt() != null ? o.getCompletedAt().toString() : null);
        return m;
    }
}
