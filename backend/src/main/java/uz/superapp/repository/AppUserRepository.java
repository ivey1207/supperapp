package uz.superapp.repository;

import uz.superapp.domain.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, String> {
    Optional<AppUser> findByPhone(String phone);

    Optional<AppUser> findByEmail(String email);
}
