package uz.superapp.repository;

import uz.superapp.domain.Organization;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

import java.util.Optional;

public interface OrganizationRepository extends JpaRepository<Organization, String> {
    List<Organization> findByArchivedFalse();

    Optional<Organization> findFirstByNameAndArchivedFalse(String name);
}
