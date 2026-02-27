package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;


import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.superapp.config.JwtUtil;
import uz.superapp.domain.AppUser;
import uz.superapp.domain.Wallet;
import uz.superapp.repository.AppUserRepository;
import uz.superapp.repository.WalletRepository;

import java.util.Map;
import java.util.concurrent.TimeUnit;

@Tag(name = "App Auth API")
@RestController
@RequestMapping("/api/v1/app-auth")
public class AppAuthController {

    private static final String OTP_PREFIX = "otp:";
    private static final long OTP_TTL_MIN = 5;

    private final StringRedisTemplate redis;
    private final AppUserRepository appUserRepository;
    private final WalletRepository walletRepository;
    private final JwtUtil jwtUtil;

    public AppAuthController(StringRedisTemplate redis, AppUserRepository appUserRepository,
                            WalletRepository walletRepository, JwtUtil jwtUtil) {
        this.redis = redis;
        this.appUserRepository = appUserRepository;
        this.walletRepository = walletRepository;
        this.jwtUtil = jwtUtil;
    }

    @Operation(summary = "Execute requestOtp operation")
    @PostMapping("/otp/request")
    public ResponseEntity<?> requestOtp(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        if (phone == null || phone.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "phone required"));
        }
        String code = String.format("%06d", (int) (Math.random() * 1_000_000));
        redis.opsForValue().set(OTP_PREFIX + phone, code, OTP_TTL_MIN, TimeUnit.MINUTES);
        return ResponseEntity.ok(Map.of("devOtp", code));
    }

    @Operation(summary = "Execute verifyOtp operation")
    @PostMapping("/otp/verify")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        String otp = body.get("otp");
        if (phone == null || otp == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "phone and otp required"));
        }
        String stored = redis.opsForValue().get(OTP_PREFIX + phone);
        if (stored == null || !stored.equals(otp)) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid or expired code"));
        }
        redis.delete(OTP_PREFIX + phone);

        AppUser user = appUserRepository.findByPhone(phone).orElseGet(() -> {
            AppUser u = new AppUser();
            u.setPhone(phone);
            u.setFullName(phone);
            u = appUserRepository.save(u);
            Wallet w = new Wallet();
            w.setUserId(u.getId());
            w = walletRepository.save(w);
            u.setWalletId(w.getId());
            return appUserRepository.save(u);
        });

        String accessToken = jwtUtil.generate(user.getId(), "APP_USER");
        String refreshToken = jwtUtil.generate(user.getId() + ":refresh", "APP_USER");
        return ResponseEntity.ok(Map.of(
                "accessToken", accessToken,
                "refreshToken", refreshToken
        ));
    }
}
