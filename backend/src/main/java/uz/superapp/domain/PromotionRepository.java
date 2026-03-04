package uz.superapp.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface PromotionRepository extends JpaRepository<Promotion, String> {
    List<Promotion> findByOrgId(String orgId);

    List<Promotion> findByActiveTrueAndEndDateAfter(LocalDateTime now);

    List<Promotion> findByBranchIdAndArchivedFalse(String branchId);

    List<Promotion> findByOrgIdAndArchivedFalse(String orgId);

    List<Promotion> findByOrgIdAndBranchIdAndArchivedFalse(String orgId, String branchId);
}
