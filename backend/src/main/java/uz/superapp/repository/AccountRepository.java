package uz.superapp.repository;

import uz.superapp.domain.Account;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface AccountRepository extends MongoRepository<Account, String> {
    Optional<Account> findByEmail(String email);

    Optional<Account> findFirstByEmail(String email);

    Optional<Account> findFirstByEmailAndArchivedFalse(String email);

    List<Account> findByArchivedFalse();

    List<Account> findByOrgIdAndArchivedFalse(String orgId);
}
