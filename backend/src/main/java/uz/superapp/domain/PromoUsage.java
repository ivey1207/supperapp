package uz.superapp.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "promo_usage")
public class PromoUsage {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String promotionId;
    private String orderId;
    private String userId;
    private BigDecimal discountAmount;
    private LocalDateTime usedAt;

    public PromoUsage() {
    }

    public PromoUsage(String promotionId, String orderId, String userId, BigDecimal discountAmount) {
        this.promotionId = promotionId;
        this.orderId = orderId;
        this.userId = userId;
        this.discountAmount = discountAmount;
        this.usedAt = LocalDateTime.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getPromotionId() {
        return promotionId;
    }

    public void setPromotionId(String promotionId) {
        this.promotionId = promotionId;
    }

    public String getOrderId() {
        return orderId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public BigDecimal getDiscountAmount() {
        return discountAmount;
    }

    public void setDiscountAmount(BigDecimal discountAmount) {
        this.discountAmount = discountAmount;
    }

    public LocalDateTime getUsedAt() {
        return usedAt;
    }

    public void setUsedAt(LocalDateTime usedAt) {
        this.usedAt = usedAt;
    }
}
