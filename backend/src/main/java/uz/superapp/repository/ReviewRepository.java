package uz.superapp.repository;

import uz.superapp.domain.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, String> {
    List<Review> findByBranchId(String branchId);

    List<Review> findByUserId(String userId);

    List<Review> findByBranchIdOrderByCreatedAtDesc(String branchId);
}
