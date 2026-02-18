package uz.superapp.repository;

import uz.superapp.domain.Branch;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface BranchRepository extends MongoRepository<Branch, String> {
    List<Branch> findByArchivedFalse();
    List<Branch> findByOrgIdAndArchivedFalse(String orgId);
    List<Branch> findByStatusAndArchivedFalse(String status);
}
