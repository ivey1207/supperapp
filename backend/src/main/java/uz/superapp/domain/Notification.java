package uz.superapp.domain;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "notifications")
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    private String type; // e.g., ORDER_STATUS, PROMOTION, SYSTEM

    private boolean read = false;

    private String relatedId; // e.g., orderId

    private LocalDateTime createdAt = LocalDateTime.now();
}
