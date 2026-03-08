package uz.superapp.controller;

import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.*;
import uz.superapp.repository.*; // ПРОВЕРЯЕМ ПУТЬ К РЕПОЗИТОРИЯМ
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/promo-broadcast")
public class AdminPromoBroadcastController {

    private final PromotionRepository promotionRepository;
    private final NotificationRepository notificationRepository;
    private final AppUserRepository userRepository;

    public AdminPromoBroadcastController(PromotionRepository promotionRepository,
            NotificationRepository notificationRepository,
            AppUserRepository userRepository) {
        this.promotionRepository = promotionRepository;
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @PostMapping("/{promoId}/broadcast")
    public void broadcastPromotion(@PathVariable String promoId) {
        Promotion promo = promotionRepository.findById(promoId)
                .orElseThrow(() -> new RuntimeException("Promotion not found"));

        List<AppUser> allUsers = userRepository.findAll();

        for (AppUser user : allUsers) {
            Notification notification = new Notification();
            notification.setUser(user);
            notification.setTitle("Новая акция: " + promo.getTitle());
            notification.setMessage(promo.getDescription());
            notification.setType("PROMOTION");
            notification.setRelatedId(promoId);
            notificationRepository.save(notification);
        }
    }
}
