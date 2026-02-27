package uz.superapp.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import uz.superapp.domain.WashSession;

import java.util.List;
import java.util.Optional;

public interface WashSessionRepository extends MongoRepository<WashSession, String> {

    /** Активная сессия для конкретного киоска */
    Optional<WashSession> findByKioskIdAndStatus(String kioskId, String status);

    /** Активная сессия пользователя */
    Optional<WashSession> findByUserIdAndStatus(String userId, String status);

    /** Все сессии по киоску (для мониторинга) */
    List<WashSession> findByKioskIdOrderByStartedAtDesc(String kioskId);

    /** Все активные сессии (для admin мониторинга) */
    List<WashSession> findByStatusOrderByStartedAtDesc(String status);

    /** История сессий пользователя */
    List<WashSession> findByUserIdOrderByStartedAtDesc(String userId);

    /** Все сессии по orgId */
    List<WashSession> findByOrgIdOrderByStartedAtDesc(String orgId);
}
