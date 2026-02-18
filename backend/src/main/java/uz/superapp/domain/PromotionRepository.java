package uz.superapp.domain;

import org.springframework.data.mongodb.repository.MongoRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface PromotionRepository extends MongoRepository<Promotion, String> {
    List<Promotion> findByOrgId(String orgId);

    List<Promotion> findByActiveTrueAndEndDateAfter(LocalDateTime now);

    List<Promotion> findByBranchIdAndArchivedFalse(String branchId);

    List<Promotion> findByOrgIdAndBranchIdAndArchivedFalse(String orgId, String branchId);
}
