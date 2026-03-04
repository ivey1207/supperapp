package uz.superapp.repository;

import uz.superapp.domain.Account;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, String> {
    Optional<Account> findByEmail(String email);

    Optional<Account> findFirstByEmail(String email);

    Optional<Account> findFirstByEmailAndArchivedFalse(String email);

    List<Account> findByArchivedFalse();

    List<Account> findByOrgIdAndArchivedFalse(String orgId);
}
