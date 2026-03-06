package uz.superapp.repository;

import uz.superapp.domain.UserStory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface UserStoryRepository extends JpaRepository<UserStory, String> {
    List<UserStory> findByExpiresAtAfterAndArchivedFalseOrderByCreatedAtDesc(LocalDateTime now);

    List<UserStory> findByUserId(String userId);
}
