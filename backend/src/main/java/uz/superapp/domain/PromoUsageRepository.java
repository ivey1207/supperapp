package uz.superapp.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PromoUsageRepository extends JpaRepository<PromoUsage, String> {
    List<PromoUsage> findByPromotionId(String promotionId);

    List<PromoUsage> findByUserId(String userId);
}
