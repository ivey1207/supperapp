package uz.superapp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.superapp.domain.StoryComment;
import java.util.List;

public interface StoryCommentRepository extends JpaRepository<StoryComment, String> {
    List<StoryComment> findByStoryIdOrderByCreatedAtDesc(String storyId);
}
