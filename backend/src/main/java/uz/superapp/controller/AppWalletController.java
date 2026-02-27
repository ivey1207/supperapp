package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;


import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.Wallet;
import uz.superapp.repository.WalletRepository;
import uz.superapp.repository.AppUserRepository;

import java.util.Map;

@Tag(name = "App Wallet API")
@RestController
@RequestMapping("/api/v1/app/wallet")
public class AppWalletController {

    private final WalletRepository walletRepository;
    private final AppUserRepository appUserRepository;

    public AppWalletController(WalletRepository walletRepository, AppUserRepository appUserRepository) {
        this.walletRepository = walletRepository;
        this.appUserRepository = appUserRepository;
    }

    @Operation(summary = "Get item by ID")
    @GetMapping
    @PreAuthorize("hasRole('APP_USER') or hasRole('USER')")
    public ResponseEntity<Map<String, Object>> get(Authentication auth) {
        String userId = auth.getName();
        Wallet w = appUserRepository.findById(userId).flatMap(u -> walletRepository.findById(u.getWalletId())).orElse(null);
        if (w == null) {
            return ResponseEntity.ok(Map.of("walletId", "", "balance", 0, "currency", "UZS"));
        }
        return ResponseEntity.ok(Map.of(
                "walletId", w.getId(),
                "balance", w.getBalance(),
                "currency", w.getCurrency()
        ));
    }
}
