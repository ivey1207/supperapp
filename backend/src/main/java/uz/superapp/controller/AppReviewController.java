package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.AppUser;
import uz.superapp.domain.Branch;
import uz.superapp.domain.Review;
import uz.superapp.domain.ReviewLike;
import uz.superapp.repository.AppUserRepository;
import uz.superapp.repository.BranchRepository;
import uz.superapp.repository.ReviewLikeRepository;
import uz.superapp.repository.ReviewRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Tag(name = "App Review API")
@RestController
@RequestMapping("/api/v1/app/reviews")
public class AppReviewController {

    private final ReviewRepository reviewRepository;
    private final BranchRepository branchRepository;
    private final AppUserRepository appUserRepository;
    private final ReviewLikeRepository reviewLikeRepository;

    public AppReviewController(ReviewRepository reviewRepository, BranchRepository branchRepository,
            AppUserRepository appUserRepository, ReviewLikeRepository reviewLikeRepository) {
        this.reviewRepository = reviewRepository;
        this.branchRepository = branchRepository;
        this.appUserRepository = appUserRepository;
        this.reviewLikeRepository = reviewLikeRepository;
    }

    @Operation(summary = "Get reviews for a branch")
    @GetMapping("/branch/{branchId}")
    public ResponseEntity<List<Map<String, Object>>> getByBranch(@PathVariable String branchId) {
        List<Review> reviews = reviewRepository.findByBranchIdOrderByCreatedAtDesc(branchId);
        List<Map<String, Object>> result = reviews.stream().map(r -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", r.getId());
            map.put("userName", r.getUser() != null ? r.getUser().getFullName() : "Anonymous");
            map.put("rating", r.getRating());
            map.put("comment", r.getComment());
            map.put("createdAt", r.getCreatedAt());
            map.put("likeCount", r.getLikeCount());
            return map;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Create a review")
    @PostMapping
    @PreAuthorize("hasRole('APP_USER')")
    public ResponseEntity<?> createReview(Authentication auth, @RequestBody Map<String, Object> body) {
        String userId = auth.getName();
        String branchId = (String) body.get("branchId");

        Object ratingObj = body.get("rating");
        int rating = 5;
        if (ratingObj instanceof Integer) {
            rating = (Integer) ratingObj;
        } else if (ratingObj instanceof Double) {
            rating = ((Double) ratingObj).intValue();
        } else if (ratingObj instanceof String) {
            rating = Integer.parseInt((String) ratingObj);
        }

        String comment = (String) body.get("comment");

        AppUser user = appUserRepository.findById(userId).orElse(null);
        Branch branch = branchRepository.findById(branchId).orElse(null);

        if (user == null || branch == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "User or Branch not found"));
        }

        Review review = new Review();
        review.setUser(user);
        review.setBranch(branch);
        review.setRating(rating);
        review.setComment(comment);
        review.setCreatedAt(LocalDateTime.now());

        reviewRepository.save(review);

        // Update branch rating
        List<Review> allReviews = reviewRepository.findByBranchId(branchId);
        double avgRating = allReviews.stream().mapToInt(Review::getRating).average().orElse(0.0);

        // Round to 1 decimal place
        avgRating = Math.round(avgRating * 10.0) / 10.0;

        branch.setRating(avgRating);
        branch.setReviewCount(allReviews.size());
        branchRepository.save(branch);

        return ResponseEntity.ok(Map.of("message", "Review created successfully", "id", review.getId()));
    }

    @Operation(summary = "Like a review")
    @PostMapping("/{reviewId}/like")
    @PreAuthorize("hasRole('APP_USER')")
    public ResponseEntity<?> likeReview(Authentication auth, @PathVariable String reviewId) {
        String userId = auth.getName();
        Review review = reviewRepository.findById(reviewId).orElse(null);
        if (review == null)
            return ResponseEntity.notFound().build();

        if (reviewLikeRepository.existsByReviewIdAndUserId(reviewId, userId)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Already liked"));
        }

        AppUser user = appUserRepository.findById(userId).orElse(null);
        if (user == null)
            return ResponseEntity.badRequest().build();

        ReviewLike like = new ReviewLike();
        like.setReview(review);
        like.setUser(user);
        reviewLikeRepository.save(like);

        review.setLikeCount((review.getLikeCount() == null ? 0 : review.getLikeCount()) + 1);
        reviewRepository.save(review);

        return ResponseEntity.ok(Map.of("message", "Liked successfully", "likeCount", review.getLikeCount()));
    }

    @Operation(summary = "Unlike a review")
    @PostMapping("/{reviewId}/unlike")
    @PreAuthorize("hasRole('APP_USER')")
    public ResponseEntity<?> unlikeReview(Authentication auth, @PathVariable String reviewId) {
        String userId = auth.getName();
        Review review = reviewRepository.findById(reviewId).orElse(null);
        if (review == null)
            return ResponseEntity.notFound().build();

        Optional<ReviewLike> likeOpt = reviewLikeRepository.findByReviewIdAndUserId(reviewId, userId);
        if (likeOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Not liked yet"));
        }

        reviewLikeRepository.delete(likeOpt.get());

        review.setLikeCount(Math.max(0, (review.getLikeCount() == null ? 0 : review.getLikeCount()) - 1));
        reviewRepository.save(review);

        return ResponseEntity.ok(Map.of("message", "Unliked successfully", "likeCount", review.getLikeCount()));
    }
}
