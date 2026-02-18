package uz.superapp.repository;

import uz.superapp.domain.Organization;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface OrganizationRepository extends MongoRepository<Organization, String> {
    List<Organization> findByArchivedFalse();
}
