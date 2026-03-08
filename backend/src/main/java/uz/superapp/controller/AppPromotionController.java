package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.Promotion;
import uz.superapp.domain.PromotionRepository;

import java.time.LocalDateTime;
import java.util.List;

@Tag(name = "App Promotion API")
@RestController
@RequestMapping("/api/v1/app/promotions")
public class AppPromotionController {

    @Autowired
    private PromotionRepository promotionRepository;

    @Autowired
    private uz.superapp.service.PromoService promoService;

    @Operation(summary = "Execute getActivePromotions operation")
    @GetMapping
    public List<Promotion> getActivePromotions(
            @RequestParam(required = false) String branchId,
            @RequestParam(required = false) String serviceType,
            @RequestParam(required = false) Double orderAmount) {

        java.util.Map<String, Object> context = new java.util.HashMap<>();
        context.put("currentTime", java.time.LocalTime.now().toString());
        context.put("currentDay", java.time.LocalDateTime.now().getDayOfWeek().toString());
        if (serviceType != null)
            context.put("serviceType", serviceType);
        if (orderAmount != null)
            context.put("orderAmount", orderAmount);

        return promoService.getEligiblePromotions(branchId, context);
    }

    @Operation(summary = "Execute getByBranch operation")
    @GetMapping("/branch/{branchId}")
    public List<Promotion> getByBranch(@PathVariable String branchId) {
        return promotionRepository.findByBranchIdAndArchivedFalse(branchId);
    }
}
