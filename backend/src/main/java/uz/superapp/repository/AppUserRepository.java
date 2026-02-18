package uz.superapp.repository;

import uz.superapp.domain.AppUser;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface AppUserRepository extends MongoRepository<AppUser, String> {
    Optional<AppUser> findByPhone(String phone);
}
