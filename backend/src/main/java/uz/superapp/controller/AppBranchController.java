package uz.superapp.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.Branch;
import uz.superapp.repository.BranchRepository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/app/branches")
public class AppBranchController {

    private final BranchRepository branchRepository;

    public AppBranchController(BranchRepository branchRepository) {
        this.branchRepository = branchRepository;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(@RequestParam(required = false) String status) {
        List<Branch> branches = status != null && !status.isEmpty()
                ? branchRepository.findByStatusAndArchivedFalse(status)
                : branchRepository.findByArchivedFalse();
        List<Map<String, Object>> result = branches.stream()
                .map(this::toMap)
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
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
        m.put("images", b.getImages() != null ? b.getImages() : List.of());

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
