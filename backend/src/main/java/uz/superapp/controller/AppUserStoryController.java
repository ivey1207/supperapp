package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.AppUser;
import uz.superapp.domain.UserStory;
import uz.superapp.domain.UserStoryLike;
import uz.superapp.domain.StoryComment;
import uz.superapp.repository.AppUserRepository;
import uz.superapp.repository.UserStoryLikeRepository;
import uz.superapp.repository.UserStoryRepository;
import uz.superapp.repository.StoryCommentRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Tag(name = "App User Story API")
@RestController
@RequestMapping("/api/v1/app/user-stories")
public class AppUserStoryController {

    private final UserStoryRepository userStoryRepository;
    private final AppUserRepository appUserRepository;
    private final UserStoryLikeRepository userStoryLikeRepository;
    private final StoryCommentRepository storyCommentRepository;

    public AppUserStoryController(UserStoryRepository userStoryRepository, AppUserRepository appUserRepository,
            UserStoryLikeRepository userStoryLikeRepository, StoryCommentRepository storyCommentRepository) {
        this.userStoryRepository = userStoryRepository;
        this.appUserRepository = appUserRepository;
        this.userStoryLikeRepository = userStoryLikeRepository;
        this.storyCommentRepository = storyCommentRepository;
    }

    @Operation(summary = "Get active user stories")
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getActiveStories(Authentication auth) {
        String currentUserId = auth != null ? auth.getName() : null;
        LocalDateTime now = LocalDateTime.now();
        List<UserStory> stories = userStoryRepository.findByExpiresAtAfterAndArchivedFalseOrderByCreatedAtDesc(now);
        List<Map<String, Object>> result = stories.stream().map(s -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", s.getId());
            map.put("userId", s.getUser().getId());
            map.put("userName", s.getUser().getFullName());
            map.put("userAvatarUrl", s.getUser().getAvatarUrl());
            map.put("imageUrl", s.getImageUrl());
            map.put("createdAt", s.getCreatedAt());
            map.put("likeCount", s.getLikeCount() != null ? s.getLikeCount() : 0);
            if (currentUserId != null) {
                map.put("isLiked", userStoryLikeRepository.existsByStoryIdAndUserId(s.getId(), currentUserId));
            } else {
                map.put("isLiked", false);
            }
            return map;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Like a story")
    @PostMapping("/{storyId}/like")
    @PreAuthorize("hasRole('APP_USER')")
    public ResponseEntity<?> likeStory(Authentication auth, @PathVariable String storyId) {
        String userId = auth.getName();
        UserStory story = userStoryRepository.findById(storyId).orElse(null);
        if (story == null) {
            return ResponseEntity.notFound().build();
        }

        if (userStoryLikeRepository.existsByStoryIdAndUserId(storyId, userId)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Already liked"));
        }

        AppUser user = appUserRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().build();
        }

        UserStoryLike like = new UserStoryLike();
        like.setStory(story);
        like.setUser(user);
        userStoryLikeRepository.save(like);

        story.setLikeCount((story.getLikeCount() == null ? 0 : story.getLikeCount()) + 1);
        userStoryRepository.save(story);

        return ResponseEntity.ok(Map.of("message", "Liked successfully", "likeCount", story.getLikeCount()));
    }

    @Operation(summary = "Unlike a story")
    @PostMapping("/{storyId}/unlike")
    @PreAuthorize("hasRole('APP_USER')")
    public ResponseEntity<?> unlikeStory(Authentication auth, @PathVariable String storyId) {
        String userId = auth.getName();
        UserStory story = userStoryRepository.findById(storyId).orElse(null);
        if (story == null) {
            return ResponseEntity.notFound().build();
        }

        Optional<UserStoryLike> likeOpt = userStoryLikeRepository.findByStoryIdAndUserId(storyId, userId);
        if (likeOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Not liked yet"));
        }

        userStoryLikeRepository.delete(likeOpt.get());

        story.setLikeCount(Math.max(0, (story.getLikeCount() == null ? 0 : story.getLikeCount()) - 1));
        userStoryRepository.save(story);

        return ResponseEntity.ok(Map.of("message", "Unliked successfully", "likeCount", story.getLikeCount()));
    }

    @Operation(summary = "Create a user story")
    @PostMapping
    @PreAuthorize("hasRole('APP_USER')")
    public ResponseEntity<?> createStory(Authentication auth, @RequestBody Map<String, String> body) {
        String userId = auth.getName();
        String imageUrl = body.get("imageUrl");

        if (imageUrl == null || imageUrl.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Image URL is required"));
        }

        AppUser user = appUserRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "User not found"));
        }

        UserStory story = new UserStory();
        story.setUser(user);
        story.setImageUrl(imageUrl);
        story.setCreatedAt(LocalDateTime.now());
        story.setExpiresAt(LocalDateTime.now().plusHours(24));
        story.setArchived(false);

        userStoryRepository.save(story);

        return ResponseEntity.ok(Map.of("message", "Story created successfully", "id", story.getId()));
    }

    @Operation(summary = "Add a comment to a story")
    @PostMapping("/{storyId}/comments")
    @PreAuthorize("hasRole('APP_USER')")
    public ResponseEntity<?> commentOnStory(Authentication auth, @PathVariable String storyId,
            @RequestBody Map<String, String> body) {
        String userId = auth.getName();
        String content = body.get("content");

        if (content == null || content.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Comment content is required"));
        }

        UserStory story = userStoryRepository.findById(storyId).orElse(null);
        if (story == null) {
            return ResponseEntity.notFound().build();
        }

        AppUser user = appUserRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "User not found"));
        }

        StoryComment comment = new StoryComment();
        comment.setStory(story);
        comment.setUser(user);
        comment.setContent(content);
        comment.setCreatedAt(LocalDateTime.now());

        storyCommentRepository.save(comment);

        return ResponseEntity.ok(Map.of("message", "Comment added successfully", "id", comment.getId()));
    }

    @Operation(summary = "Get comments for a story")
    @GetMapping("/{storyId}/comments")
    public ResponseEntity<List<Map<String, Object>>> getStoryComments(@PathVariable String storyId) {
        List<StoryComment> comments = storyCommentRepository.findByStoryIdOrderByCreatedAtDesc(storyId);
        List<Map<String, Object>> result = comments.stream().map(c -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", c.getId());
            map.put("userName", c.getUser().getFullName());
            map.put("content", c.getContent());
            map.put("createdAt", c.getCreatedAt());
            return map;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }
}
