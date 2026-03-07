package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.FavoriteBranch;
import uz.superapp.domain.AppUser;
import uz.superapp.domain.Branch;
import uz.superapp.repository.FavoriteBranchRepository;
import uz.superapp.repository.AppUserRepository;
import uz.superapp.repository.BranchRepository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Tag(name = "App Favorites API")
@RestController
@RequestMapping("/api/v1/app/favorites")
public class AppFavoriteController {

    private final FavoriteBranchRepository favoriteBranchRepository;
    private final AppUserRepository appUserRepository;
    private final BranchRepository branchRepository;

    public AppFavoriteController(FavoriteBranchRepository favoriteBranchRepository,
            AppUserRepository appUserRepository,
            BranchRepository branchRepository) {
        this.favoriteBranchRepository = favoriteBranchRepository;
        this.appUserRepository = appUserRepository;
        this.branchRepository = branchRepository;
    }

    @Operation(summary = "Get my favorite branches")
    @GetMapping("/branches")
    public ResponseEntity<List<Map<String, Object>>> getMyFavorites(Authentication auth) {
        String userId = auth.getName();
        List<FavoriteBranch> favorites = favoriteBranchRepository.findByUserIdOrderByCreatedAtDesc(userId);

        List<Map<String, Object>> result = favorites.stream().map(f -> {
            Branch b = f.getBranch();
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", b.getId());
            map.put("name", b.getName());
            map.put("address", b.getAddress());
            map.put("partnerType", b.getPartnerType());
            map.put("photoUrl", b.getPhotoUrl());
            map.put("rating", b.getRating());
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Toggle favorite status for a branch")
    @PostMapping("/branches/{branchId}/toggle")
    public ResponseEntity<?> toggleFavorite(@PathVariable String branchId, Authentication auth) {
        String userId = auth.getName();
        Optional<FavoriteBranch> existing = favoriteBranchRepository.findByUserIdAndBranchId(userId, branchId);

        if (existing.isPresent()) {
            favoriteBranchRepository.delete(existing.get());
            return ResponseEntity.ok(Map.of("isFavorite", false));
        } else {
            AppUser user = appUserRepository.findById(userId).orElse(null);
            Branch branch = branchRepository.findById(branchId).orElse(null);

            if (user == null || branch == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "User or branch not found"));
            }

            FavoriteBranch fav = new FavoriteBranch();
            fav.setUser(user);
            fav.setBranch(branch);
            favoriteBranchRepository.save(fav);
            return ResponseEntity.ok(Map.of("isFavorite", true));
        }
    }

    @Operation(summary = "Check if branch is favorite")
    @GetMapping("/branches/{branchId}/check")
    public ResponseEntity<Map<String, Boolean>> checkFavorite(@PathVariable String branchId, Authentication auth) {
        boolean exists = favoriteBranchRepository.existsByUserIdAndBranchId(auth.getName(), branchId);
        return ResponseEntity.ok(Map.of("isFavorite", exists));
    }
}
