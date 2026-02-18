package uz.superapp.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    public JwtAuthFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String auth = request.getHeader("Authorization");
        if (auth != null && auth.startsWith("Bearer ")) {
            String token = auth.substring(7);
            try {
                var claims = jwtUtil.parse(token);
                String sub = claims.getSubject();
                String role = claims.get("role", String.class);
                List<SimpleGrantedAuthority> authorities = role != null
                        ? Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role))
                        : Collections.emptyList();
                var authToken = new UsernamePasswordAuthenticationToken(sub, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(authToken);
            } catch (Exception ignored) {
            }
        }
        chain.doFilter(request, response);
    }
}
