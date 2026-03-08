package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.superapp.config.JwtUtil;
import uz.superapp.domain.AppUser;
import uz.superapp.domain.Wallet;
import uz.superapp.repository.AppUserRepository;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Tag(name = "App Auth API")
@RestController
@RequestMapping("/api/v1/app-auth")
public class AppAuthController {

    private static final String OTP_PREFIX = "otp:";
    private static final long OTP_TTL_MIN = 5;

    private final StringRedisTemplate redis;
    private final AppUserRepository appUserRepository;
    private final JwtUtil jwtUtil;
    private final uz.superapp.service.EmailService emailService;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    public AppAuthController(StringRedisTemplate redis, AppUserRepository appUserRepository,
            JwtUtil jwtUtil,
            uz.superapp.service.EmailService emailService,
            org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        this.redis = redis;
        this.appUserRepository = appUserRepository;
        this.jwtUtil = jwtUtil;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
    }

    @Operation(summary = "Execute requestOtp operation")
    @PostMapping("/otp/request")
    public ResponseEntity<?> requestOtp(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        String email = body.get("email");
        if (phone == null || phone.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "phone required"));
        }
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "email required for OTP delivery"));
        }

        if (!email.contains("@") || !email.contains(".")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid email format"));
        }

        String code = String.format("%06d", (int) (Math.random() * 1_000_000));
        redis.opsForValue().set(OTP_PREFIX + phone, code, OTP_TTL_MIN, TimeUnit.MINUTES);

        try {
            emailService.sendOtp(email, code);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Failed to send email. please check the email address."));
        }

        return ResponseEntity.ok(Map.of("message", "OTP sent to your email"));
    }

    @Operation(summary = "Register new user with password and send OTP")
    @PostMapping("/register")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        String email = body.get("email");
        String fullName = body.get("fullName");
        String password = body.get("password");

        if (phone == null || email == null || fullName == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "phone, email, fullName and password required"));
        }

        if (appUserRepository.findByPhone(phone).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "User with this phone already exists"));
        }
        if (appUserRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "User with this email already exists"));
        }

        AppUser user = new AppUser();
        user.setPhone(phone);
        user.setEmail(email);
        user.setFullName(fullName);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setBlocked(true); // Blocked until OTP verified

        Wallet w = new Wallet();
        w.setCurrency("UZS");
        w.setUser(user);
        user.setWallet(w);

        appUserRepository.save(user);

        // Send OTP
        String code = String.format("%06d", (int) (Math.random() * 1_000_000));
        redis.opsForValue().set(OTP_PREFIX + phone, code, OTP_TTL_MIN, TimeUnit.MINUTES);

        try {
            emailService.sendOtp(email, code);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "User created but failed to send OTP. Please use forgot password."));
        }

        return ResponseEntity.ok(Map.of("message", "Registration successful. Please verify OTP sent to your email."));
    }

    @Operation(summary = "Verify OTP for registration and activate user")
    @PostMapping("/register/verify")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> verifyRegistration(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        String otp = body.get("otp");

        if (phone == null || otp == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "phone and otp required"));
        }

        String stored = redis.opsForValue().get(OTP_PREFIX + phone);
        if (stored == null || !stored.equals(otp)) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid or expired code"));
        }

        return appUserRepository.findByPhone(phone).map(user -> {
            user.setBlocked(false); // Activate user
            appUserRepository.save(user);

            String accessToken = jwtUtil.generate(user.getId(), "APP_USER");
            String refreshToken = jwtUtil.generate(user.getId() + ":refresh", "APP_USER");
            return ResponseEntity.ok(Map.of(
                    "accessToken", accessToken,
                    "refreshToken", refreshToken,
                    "user", user));
        }).orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found")));
    }

    @Operation(summary = "Execute verifyOtp operation")
    @PostMapping("/otp/verify")
    @org.springframework.transaction.annotation.Transactional
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
        Optional<AppUser> existingUser = appUserRepository.findByPhone(phone);
        boolean isNewUser = existingUser.isEmpty();

        AppUser user = existingUser.orElseGet(() -> {
            AppUser u = new AppUser();
            u.setPhone(phone);
            u.setFullName(phone);
            u.setBlocked(false);

            Wallet w = new Wallet();
            w.setCurrency("UZS");
            w.setUser(u);
            u.setWallet(w);

            return appUserRepository.save(u);
        });

        if (user.isBlocked()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Ваш аккаунт заблокирован. Пожалуйста, свяжитесь с поддержкой."));
        }

        String accessToken = jwtUtil.generate(user.getId(), "APP_USER");
        String refreshToken = jwtUtil.generate(user.getId() + ":refresh", "APP_USER");
        return ResponseEntity.ok(Map.of(
                "accessToken", accessToken,
                "refreshToken", refreshToken,
                "isNewUser", isNewUser));
    }

    @Operation(summary = "Login with password")
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String identifier = body.get("email");
        if (identifier == null)
            identifier = body.get("phone");
        String password = body.get("password");

        if (identifier == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email/Phone and password required"));
        }

        Optional<AppUser> userOpt = body.containsKey("email")
                ? appUserRepository.findByEmail(identifier)
                : appUserRepository.findByPhone(identifier);

        if (userOpt.isEmpty()) {
            // Also try phone if email was provided but not found (and vice versa) for
            // convenience
            if (body.containsKey("email")) {
                userOpt = appUserRepository.findByPhone(identifier);
            } else {
                userOpt = appUserRepository.findByEmail(identifier);
            }
        }

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid credentials"));
        }

        AppUser user = userOpt.get();
        if (user.getPasswordHash() == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid credentials"));
        }

        if (user.isBlocked()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Ваш аккаунт заблокирован. Пожалуйста, свяжитесь с поддержкой."));
        }

        String accessToken = jwtUtil.generate(user.getId(), "APP_USER");
        String refreshToken = jwtUtil.generate(user.getId() + ":refresh", "APP_USER");
        return ResponseEntity.ok(Map.of(
                "accessToken", accessToken,
                "refreshToken", refreshToken,
                "user", user));
    }

    @PostMapping("/password/forgot")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String identifier = body.get("email");
        if (identifier == null)
            identifier = body.get("phone");

        if (identifier == null || identifier.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "email or phone required"));
        }

        Optional<AppUser> user = body.containsKey("email")
                ? appUserRepository.findByEmail(identifier)
                : appUserRepository.findByPhone(identifier);

        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
        }

        String code = String.format("%06d", (int) (Math.random() * 1_000_000));
        redis.opsForValue().set("reset:" + identifier, code, 10, TimeUnit.MINUTES);

        String targetEmail = user.get().getEmail();
        if (targetEmail != null && !targetEmail.isBlank()) {
            try {
                emailService.sendOtp(targetEmail, code);
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("message", "Failed to send email: " + e.getMessage()));
            }
        }

        return ResponseEntity.ok(Map.of("message", "Reset code sent to your email"));
    }

    @PostMapping("/password/reset")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String identifier = body.get("email");
        if (identifier == null)
            identifier = body.get("phone");
        String otp = body.get("otp");
        String newPassword = body.get("newPassword");

        if (identifier == null || otp == null || newPassword == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "identifier, otp and newPassword required"));
        }

        String stored = redis.opsForValue().get("reset:" + identifier);
        if (stored == null || !stored.equals(otp)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid or expired code"));
        }

        Optional<AppUser> userOpt = body.containsKey("email")
                ? appUserRepository.findByEmail(identifier)
                : appUserRepository.findByPhone(identifier);

        if (userOpt.isEmpty())
            return ResponseEntity.notFound().build();

        AppUser user = userOpt.get();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        appUserRepository.save(user);

        redis.delete("reset:" + identifier);
        return ResponseEntity.ok(Map.of("message", "Password successfully reset"));
    }
}
