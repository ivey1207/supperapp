package uz.superapp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.superapp.domain.Notification;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);

    long countByUserIdAndReadFalse(String userId);
}
