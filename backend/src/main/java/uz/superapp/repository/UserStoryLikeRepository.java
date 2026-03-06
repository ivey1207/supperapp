package uz.superapp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.superapp.domain.UserStoryLike;

import java.util.Optional;

@Repository
public interface UserStoryLikeRepository extends JpaRepository<UserStoryLike, String> {
    Optional<UserStoryLike> findByStoryIdAndUserId(String storyId, String userId);

    boolean existsByStoryIdAndUserId(String storyId, String userId);

    long countByStoryId(String storyId);
}
