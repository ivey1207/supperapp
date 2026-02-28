package uz.superapp.repository;

import uz.superapp.domain.Organization;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

import java.util.Optional;

public interface OrganizationRepository extends MongoRepository<Organization, String> {
    List<Organization> findByArchivedFalse();

    Optional<Organization> findFirstByNameAndArchivedFalse(String name);
}
