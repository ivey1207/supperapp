package uz.superapp.repository;

import uz.superapp.domain.Service;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ServiceRepository extends MongoRepository<Service, String> {
    List<Service> findByArchivedFalse();

    List<Service> findByOrgIdAndArchivedFalse(String orgId);

    List<Service> findByBranchIdAndArchivedFalse(String branchId);

    List<Service> findByOrgIdAndBranchIdAndArchivedFalse(String orgId, String branchId);
}
