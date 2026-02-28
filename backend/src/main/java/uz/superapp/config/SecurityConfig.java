package uz.superapp.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import jakarta.servlet.DispatcherType;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(c -> {
                })
                .csrf(c -> c.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(a -> a
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        // Swagger / OpenAPI UI & docs - открываем без авторизации,
                        // чтобы ты мог спокойно смотреть и тестировать эндпоинты.
                        .requestMatchers(
                                "/swagger-ui.html",
                                "/swagger-ui/**",
                                "/v3/api-docs",
                                "/v3/api-docs/**")
                        .permitAll()
                        .requestMatchers("/actuator/**").permitAll()
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers("/api/v1/app-auth/**").permitAll()
                        .requestMatchers("/api/v1/admin/auth/**").permitAll()
                        .requestMatchers("/api/v1/hardware/**").permitAll()
                        .requestMatchers("/api/v1/controller/**").permitAll()
                        .requestMatchers("/api/v1/files/**").permitAll()
                        .requestMatchers("/error").permitAll()
                        .requestMatchers("/api/v1/app/kiosk/**").permitAll() // QR-скан: инфо киоска без авторизации
                        .requestMatchers("/api/v1/admin/hardware-kiosks/*/top-up").permitAll()
                        .requestMatchers("/api/v1/admin/**").hasAnyRole("SUPER_ADMIN", "PARTNER_ADMIN", "MANAGER")
                        .requestMatchers("/api/v1/app/**").permitAll() // TEMPORARY: Allow public access for UI
                                                                       // verification
                        // .requestMatchers("/api/v1/app/**").hasAnyRole("APP_USER", "USER")
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
