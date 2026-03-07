package uz.superapp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.superapp.domain.FavoriteBranch;
import java.util.List;
import java.util.Optional;

public interface FavoriteBranchRepository extends JpaRepository<FavoriteBranch, String> {
    List<FavoriteBranch> findByUserIdOrderByCreatedAtDesc(String userId);

    Optional<FavoriteBranch> findByUserIdAndBranchId(String userId, String branchId);

    boolean existsByUserIdAndBranchId(String userId, String branchId);
}
