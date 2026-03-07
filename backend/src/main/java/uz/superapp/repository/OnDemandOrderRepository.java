package uz.superapp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.superapp.domain.OnDemandOrder;

import java.util.List;

@Repository
public interface OnDemandOrderRepository extends JpaRepository<OnDemandOrder, String> {
    List<OnDemandOrder> findByUserId(String userId);

    List<OnDemandOrder> findByOrgId(String orgId);

    List<OnDemandOrder> findByProviderIdAndStatus(String providerId, String status);

    List<OnDemandOrder> findByStatus(String status);

    List<OnDemandOrder> findByContractorId(String contractorId);

    List<OnDemandOrder> findByContractorIdAndStatusIn(String contractorId, List<String> statuses);
}
