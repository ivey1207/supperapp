package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.AppUser;
import uz.superapp.domain.UserStory;
import uz.superapp.repository.AppUserRepository;
import uz.superapp.repository.UserStoryRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Tag(name = "App User Story API")
@RestController
@RequestMapping("/api/v1/app/user-stories")
public class AppUserStoryController {

    private final UserStoryRepository userStoryRepository;
    private final AppUserRepository appUserRepository;

    public AppUserStoryController(UserStoryRepository userStoryRepository, AppUserRepository appUserRepository) {
        this.userStoryRepository = userStoryRepository;
        this.appUserRepository = appUserRepository;
    }

    @Operation(summary = "Get active user stories")
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getActiveStories() {
        LocalDateTime now = LocalDateTime.now();
        List<UserStory> stories = userStoryRepository.findByExpiresAtAfterAndArchivedFalseOrderByCreatedAtDesc(now);
        List<Map<String, Object>> result = stories.stream().map(s -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", s.getId());
            map.put("userId", s.getUser().getId());
            map.put("userName", s.getUser().getFullName());
            map.put("imageUrl", s.getImageUrl());
            map.put("createdAt", s.getCreatedAt());
            return map;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
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
}
