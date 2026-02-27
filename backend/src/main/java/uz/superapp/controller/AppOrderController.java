package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;


import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.Order;
import uz.superapp.repository.OrderRepository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Tag(name = "App Order API")
@RestController
@RequestMapping("/api/v1/app/orders")
public class AppOrderController {

    private final OrderRepository orderRepository;

    public AppOrderController(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Operation(summary = "Get list of items")
    @GetMapping
    @PreAuthorize("hasRole('APP_USER') or hasRole('USER')")
    public ResponseEntity<Map<String, Object>> list(Authentication auth,
                                                     @RequestParam(defaultValue = "0") int page,
                                                     @RequestParam(defaultValue = "20") int size) {
        String userId = auth.getName();
        var pageable = PageRequest.of(page, size);
        List<Order> list = orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<Map<String, Object>> content = list.stream().skip((long) page * size).limit(size).map(this::toMap).collect(Collectors.toList());
        Map<String, Object> body = new HashMap<>();
        body.put("content", content);
        body.put("totalElements", list.size());
        return ResponseEntity.ok(body);
    }

    private Map<String, Object> toMap(Order o) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", o.getId());
        m.put("branchId", o.getBranchId());
        m.put("status", o.getStatus());
        m.put("totalAmount", o.getTotalAmount());
        m.put("currency", o.getCurrency());
        m.put("createdAt", o.getCreatedAt() != null ? o.getCreatedAt().toString() : null);
        m.put("lines", o.getLines());
        return m;
    }
}
