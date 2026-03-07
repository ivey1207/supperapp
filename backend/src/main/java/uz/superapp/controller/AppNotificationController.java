package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.Notification;
import uz.superapp.repository.NotificationRepository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Tag(name = "App Notification API")
@RestController
@RequestMapping("/api/v1/app/notifications")
public class AppNotificationController {

    private final NotificationRepository notificationRepository;

    public AppNotificationController(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Operation(summary = "Get user notifications")
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getMyNotifications(Authentication auth) {
        String userId = auth.getName();
        List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);

        List<Map<String, Object>> result = notifications.stream().map(n -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", n.getId());
            map.put("title", n.getTitle());
            map.put("message", n.getMessage());
            map.put("type", n.getType());
            map.put("read", n.isRead());
            map.put("createdAt", n.getCreatedAt());
            map.put("relatedId", n.getRelatedId());
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Mark notification as read")
    @PostMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable String id, Authentication auth) {
        Notification notification = notificationRepository.findById(id).orElse(null);
        if (notification == null || !notification.getUser().getId().equals(auth.getName())) {
            return ResponseEntity.notFound().build();
        }

        notification.setRead(true);
        notificationRepository.save(notification);
        return ResponseEntity.ok(Map.of("message", "Marked as read"));
    }

    @Operation(summary = "Get unread count")
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(Authentication auth) {
        long count = notificationRepository.countByUserIdAndReadFalse(auth.getName());
        return ResponseEntity.ok(Map.of("count", count));
    }
}
