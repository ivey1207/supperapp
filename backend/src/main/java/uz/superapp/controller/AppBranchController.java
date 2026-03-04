package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.Branch;
import uz.superapp.repository.BranchRepository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Tag(name = "App Branch API")
@RestController
@RequestMapping("/api/v1/app/branches")
public class AppBranchController {

    private final BranchRepository branchRepository;

    public AppBranchController(BranchRepository branchRepository) {
        this.branchRepository = branchRepository;
    }

    @Operation(summary = "Get list of items")
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String filter,
            @RequestParam(required = false) String partnerType,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lon) {

        List<Branch> allBranches = branchRepository.findAll();

        List<Map<String, Object>> result = allBranches.stream()
                .filter(b -> !b.isArchived())
                .filter(b -> {
                    if (status != null && !status.isEmpty() && !"all".equalsIgnoreCase(status)) {
                        return status.equals(b.getStatus());
                    }
                    return true;
                })
                .filter(b -> {
                    if (partnerType != null && !partnerType.isEmpty()) {
                        return partnerType.equals(b.getPartnerType());
                    }
                    return true;
                })
                .filter(b -> {
                    if (filter != null && !filter.isEmpty()) {
                        switch (filter) {
                            case "24_7":
                                return b.isIs24x7();
                            case "cafe":
                                return b.isHasCafe();
                            case "in_app_pay":
                                return b.isHasInAppPayment();
                            case "top_rating":
                                return b.getRating() >= 4.5;
                            default:
                                return true;
                        }
                    }
                    return true;
                })
                .map(b -> {
                    Map<String, Object> map = toMap(b);
                    if (lat != null && lon != null && b.getLocation() != null
                            && b.getLocation().getCoordinates() != null
                            && b.getLocation().getCoordinates().size() >= 2) {
                        double bLon = b.getLocation().getCoordinates().get(0);
                        double bLat = b.getLocation().getCoordinates().get(1);
                        double dist = calculateDistance(lat, lon, bLat, bLon);
                        map.put("distance", dist);
                    }
                    return map;
                })
                .sorted((m1, m2) -> {
                    if (lat != null && lon != null) {
                        Double d1 = (Double) m1.getOrDefault("distance", Double.MAX_VALUE);
                        Double d2 = (Double) m2.getOrDefault("distance", Double.MAX_VALUE);
                        return d1.compareTo(d2);
                    }
                    return 0;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        double earthRadius = 6371; // km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadius * c;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable String id) {
        Branch branch = branchRepository.findById(id).orElse(null);
        if (branch == null || branch.isArchived()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(toMap(branch));
    }

    private Map<String, Object> toMap(Branch b) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", b.getId());
        m.put("orgId", b.getOrgId() != null ? b.getOrgId() : "");
        m.put("name", b.getName() != null ? b.getName() : "");
        m.put("address", b.getAddress() != null ? b.getAddress() : "");
        m.put("phone", b.getPhone() != null ? b.getPhone() : "");
        m.put("status", b.getStatus() != null ? b.getStatus() : "OPEN");
        m.put("partnerType", b.getPartnerType() != null ? b.getPartnerType() : "");
        m.put("workingHours", b.getWorkingHours() != null ? b.getWorkingHours() : "");
        m.put("photoUrl", b.getPhotoUrl() != null ? b.getPhotoUrl() : "");
        m.put("description", b.getDescription() != null ? b.getDescription() : "");
        m.put("images", b.getImages() != null ? b.getImages() : List.of());

        // Smart Filter Properties
        m.put("is24x7", b.isIs24x7());
        m.put("hasCafe", b.isHasCafe());
        m.put("hasInAppPayment", b.isHasInAppPayment());
        m.put("rating", b.getRating());
        m.put("reviewCount", b.getReviewCount());

        if (b.getLocation() != null && b.getLocation().getCoordinates() != null
                && b.getLocation().getCoordinates().size() >= 2) {
            Map<String, Object> loc = new HashMap<>();
            loc.put("type", "Point");
            loc.put("coordinates", b.getLocation().getCoordinates());
            m.put("location", loc);
        }

        return m;
    }
}
