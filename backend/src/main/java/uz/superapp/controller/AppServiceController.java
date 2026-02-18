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
        return Map.of(
                "id", s.getId(),
                "name", s.getName(),
                "description", s.getDescription() != null ? s.getDescription() : "",
                "category", s.getCategory() != null ? s.getCategory() : "",
                "pricePerMinute", s.getPricePerMinute() != null ? s.getPricePerMinute() : 0,
                "durationMinutes", s.getDurationMinutes() != null ? s.getDurationMinutes() : 0,
                "bookable", s.isBookable(),
                "workingHours", s.getWorkingHours() != null ? s.getWorkingHours() : "");
    }
}
