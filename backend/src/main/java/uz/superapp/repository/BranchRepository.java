package uz.superapp.repository;

import uz.superapp.domain.Branch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BranchRepository extends JpaRepository<Branch, String> {
    List<Branch> findByArchivedFalse();

    List<Branch> findByOrgIdAndArchivedFalse(String orgId);

    List<Branch> findByOrgIdAndPartnerTypeAndArchivedFalse(String orgId, String partnerType);

    List<Branch> findByPartnerTypeAndArchivedFalse(String partnerType);

    List<Branch> findByStatusAndArchivedFalse(String status);
}
