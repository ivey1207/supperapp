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
        m.put("createdAt", o.getCreatedAt().toString());
        return m;
    }
}
