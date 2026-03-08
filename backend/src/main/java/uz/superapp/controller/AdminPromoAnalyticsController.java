package uz.superapp.controller;

import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.Promotion;
import uz.superapp.domain.PromotionRepository;
import uz.superapp.domain.PromoUsage;
import uz.superapp.domain.PromoUsageRepository;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/promo-analytics")
public class AdminPromoAnalyticsController {

    private final PromotionRepository promotionRepository;
    private final PromoUsageRepository promoUsageRepository;

    public AdminPromoAnalyticsController(PromotionRepository promotionRepository,
            PromoUsageRepository promoUsageRepository) {
        this.promotionRepository = promotionRepository;
        this.promoUsageRepository = promoUsageRepository;
    }

    @GetMapping("/{promoId}/summary")
    public Map<String, Object> getPromoSummary(@PathVariable String promoId) {
        Promotion promo = promotionRepository.findById(promoId)
                .orElseThrow(() -> new RuntimeException("Promotion not found"));

        Map<String, Object> summary = new HashMap<>();
        summary.put("id", promo.getId());
        summary.put("title", promo.getTitle());
        summary.put("totalBudget", promo.getTotalBudget());
        summary.put("currentSpend", promo.getCurrentSpend());
        summary.put("usageCount", promo.getUsageCount());

        BigDecimal burnRate = BigDecimal.ZERO;
        if (promo.getTotalBudget() != null && promo.getTotalBudget().compareTo(BigDecimal.ZERO) > 0) {
            burnRate = promo.getCurrentSpend()
                    .divide(promo.getTotalBudget(), 4, BigDecimal.ROUND_HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        }
        summary.put("burnRate", burnRate);

        return summary;
    }

    @GetMapping("/{promoId}/daily-stats")
    public List<Map<String, Object>> getDailyStats(@PathVariable String promoId) {
        List<PromoUsage> usages = promoUsageRepository.findByPromotionId(promoId);

        return usages.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        u -> u.getUsedAt().toLocalDate().toString(),
                        java.util.stream.Collectors.collectingAndThen(
                                java.util.stream.Collectors.toList(),
                                list -> {
                                    Map<String, Object> map = new HashMap<>();
                                    map.put("date", list.get(0).getUsedAt().toLocalDate().toString());
                                    map.put("count", list.size());
                                    map.put("spend", list.stream()
                                            .map(PromoUsage::getDiscountAmount)
                                            .reduce(BigDecimal.ZERO, BigDecimal::add));
                                    return map;
                                })))
                .values().stream()
                .sorted((a, b) -> a.get("date").toString().compareTo(b.get("date").toString()))
                .collect(java.util.stream.Collectors.toList());
    }

    @GetMapping("/{promoId}/usage-history")
    public List<PromoUsage> getUsageHistory(@PathVariable String promoId) {
        return promoUsageRepository.findByPromotionId(promoId);
    }
}
