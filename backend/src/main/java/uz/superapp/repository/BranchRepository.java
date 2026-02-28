package uz.superapp.repository;

import uz.superapp.domain.Branch;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface BranchRepository extends MongoRepository<Branch, String> {
    List<Branch> findByArchivedFalse();

    List<Branch> findByOrgIdAndArchivedFalse(String orgId);

    List<Branch> findByOrgIdAndPartnerTypeAndArchivedFalse(String orgId, String partnerType);

    List<Branch> findByPartnerTypeAndArchivedFalse(String partnerType);

    List<Branch> findByStatusAndArchivedFalse(String status);
}
