package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.Review;
import uz.superapp.repository.ReviewRepository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Tag(name = "Admin Review API")
@RestController
@RequestMapping("/api/v1/admin/reviews")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'PARTNER_ADMIN', 'PARTNER')")
public class AdminReviewController {

    private final ReviewRepository reviewRepository;

    public AdminReviewController(ReviewRepository reviewRepository) {
        this.reviewRepository = reviewRepository;
    }

    @Operation(summary = "Get all reviews")
    @GetMapping
    public List<Map<String, Object>> getAll() {
        return reviewRepository.findAll().stream().map(r -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", r.getId());
            map.put("userName", r.getUser() != null ? r.getUser().getFullName() : "Anonymous");
            map.put("branchName", r.getBranch() != null ? r.getBranch().getName() : "Unknown");
            map.put("rating", r.getRating());
            map.put("comment", r.getComment());
            map.put("createdAt", r.getCreatedAt());
            return map;
        }).collect(Collectors.toList());
    }

    @Operation(summary = "Delete a review")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        reviewRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Review deleted successfully"));
    }
}
