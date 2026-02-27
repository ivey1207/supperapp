package uz.superapp.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.Service;
import uz.superapp.repository.ServiceRepository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/app/services")
public class AppServiceController {

    private final ServiceRepository serviceRepository;

    public AppServiceController(ServiceRepository serviceRepository) {
        this.serviceRepository = serviceRepository;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(@RequestParam String branchId) {
        List<Service> services = serviceRepository.findByBranchIdAndArchivedFalse(branchId);
        List<Map<String, Object>> result = services.stream()
                .filter(Service::isActive)
                .map(this::toMap)
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    private Map<String, Object> toMap(Service s) {
        java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("name", s.getName());
        m.put("description", s.getDescription() != null ? s.getDescription() : "");
        m.put("category", s.getCategory() != null ? s.getCategory() : "");
        m.put("pricePerMinute", s.getPricePerMinute() != null ? s.getPricePerMinute() : 0);
        m.put("durationMinutes", s.getDurationMinutes() != null ? s.getDurationMinutes() : 0);
        m.put("bookable", s.isBookable());
        m.put("workingHours", s.getWorkingHours() != null ? s.getWorkingHours() : "");
        m.put("command", s.getCommand() != null ? s.getCommand() : "");
        m.put("relayBits", s.getRelayBits() != null ? s.getRelayBits() : "");
        return m;
    }
}
