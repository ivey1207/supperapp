package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.Branch;
import uz.superapp.repository.BranchRepository;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Tag(name = "App Branch API")
@RestController
@RequestMapping("/api/v1/app/branches")
public class AppBranchController {

    private final MongoTemplate mongoTemplate;

    public AppBranchController(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Operation(summary = "Get list of items")
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String filter) {

        Query query = new Query();
        query.addCriteria(Criteria.where("archived").is(false));

        if (status != null && !status.isEmpty()) {
            query.addCriteria(Criteria.where("status").is(status));
        }

        if (filter != null && !filter.isEmpty()) {
            switch (filter) {
                case "24_7":
                    query.addCriteria(Criteria.where("is24x7").is(true));
                    break;
                case "cafe":
                    query.addCriteria(Criteria.where("hasCafe").is(true));
                    break;
                case "in_app_pay":
                    query.addCriteria(Criteria.where("hasInAppPayment").is(true));
                    break;
                case "top_rating":
                    query.addCriteria(Criteria.where("rating").gte(4.5));
                    break;
                // 'all', 'free_now', 'my_car' are currently handled as 'no special filter' on
                // backend
            }
        }

        List<Branch> branches = mongoTemplate.find(query, Branch.class);

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
