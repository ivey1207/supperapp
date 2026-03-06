package uz.superapp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.superapp.domain.ReviewLike;
import java.util.Optional;

@Repository
public interface ReviewLikeRepository extends JpaRepository<ReviewLike, String> {
    Optional<ReviewLike> findByReviewIdAndUserId(String reviewId, String userId);

    long countByReviewId(String reviewId);

    boolean existsByReviewIdAndUserId(String reviewId, String userId);
}
