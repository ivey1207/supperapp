package uz.superapp.service;

import org.springframework.stereotype.Service;
import uz.superapp.domain.Promotion;
import uz.superapp.domain.PromotionRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PromoService {

    private final PromotionRepository promotionRepository;
    private final PromoConditionEngine conditionEngine;

    public PromoService(PromotionRepository promotionRepository, PromoConditionEngine conditionEngine) {
        this.promotionRepository = promotionRepository;
        this.conditionEngine = conditionEngine;
    }

    public List<Promotion> getEligiblePromotions(String branchId, Map<String, Object> context) {
        LocalDateTime now = LocalDateTime.now();
        List<Promotion> activePromos = promotionRepository.findByActiveTrueAndEndDateAfterAndArchivedFalse(now);

        return activePromos.stream()
                .filter(promo -> {
                    // Check branch scope
                    if (promo.getBranchId() != null && !promo.getBranchId().isEmpty()) {
                        if (!promo.getBranchId().equals(branchId))
                            return false;
                    }

                    // Evaluate dynamic conditions
                    return conditionEngine.evaluate(promo.getConfig(), context);
                })
                .collect(Collectors.toList());
    }

    public double calculateDiscount(Promotion promo, double originalPrice, Map<String, Object> context) {
        Map<String, Object> config = promo.getConfig();
        if (config == null || !config.containsKey("rewards"))
            return 0;

        List<Map<String, Object>> rewards = (List<Map<String, Object>>) config.get("rewards");
        double totalDiscount = 0;

        for (Map<String, Object> reward : rewards) {
            String type = (String) reward.get("type");
            Object value = reward.get("value");
            Double cap = reward.containsKey("cap_amount") ? Double.parseDouble(reward.get("cap_amount").toString())
                    : null;

            double discount = 0;
            switch (type) {
                case "PERCENTAGE_DISCOUNT":
                    double pct = Double.parseDouble(value.toString());
                    discount = originalPrice * (pct / 100.0);
                    break;
                case "FIXED_DISCOUNT":
                    discount = Double.parseDouble(value.toString());
                    break;
            }

            if (cap != null && discount > cap) {
                discount = cap;
            }
            totalDiscount += discount;
        }

        return totalDiscount;
    }
}
