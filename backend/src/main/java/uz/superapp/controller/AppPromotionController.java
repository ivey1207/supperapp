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

    @Operation(summary = "Execute getActivePromotions operation")
    @GetMapping
    public List<Promotion> getActivePromotions(@RequestParam(required = false) String branchId) {
        LocalDateTime now = LocalDateTime.now();
        if (branchId != null && !branchId.isEmpty()) {
            return promotionRepository.findByActiveTrueAndEndDateAfter(now).stream()
                    .filter(p -> branchId.equals(p.getBranchId()))
                    .toList();
        }
        return promotionRepository.findByActiveTrueAndEndDateAfter(now);
    }

    @Operation(summary = "Execute getByBranch operation")
    @GetMapping("/branch/{branchId}")
    public List<Promotion> getByBranch(@PathVariable String branchId) {
        return promotionRepository.findByBranchIdAndArchivedFalse(branchId);
    }
}
