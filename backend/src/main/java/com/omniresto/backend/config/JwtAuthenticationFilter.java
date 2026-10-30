package com.omniresto.backend.config;

import com.omniresto.backend.service.JwtService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Filter xác thực JWT Bearer token thống nhất.
 *
 * Phân quyền dựa trên claim "type" và "role":
 *   - ADMIN: được cấp ROLE_ADMIN, ROLE_STORE_MANAGER, ROLE_STAFF (toàn quyền)
 *   - STORE_MANAGER: được cấp ROLE_STORE_MANAGER, ROLE_STAFF
 *   - CASHIER / WAITER / CHEF: được cấp ROLE_STAFF và ROLE_{ROLE}
 *   - CUSTOMER: được cấp ROLE_CUSTOMER
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7);

        // Chỉ xử lý nếu SecurityContext chưa có xác thực và token hợp lệ
        if (SecurityContextHolder.getContext().getAuthentication() == null
                && jwtService.validateToken(jwt)) {

            String subjectId = jwtService.extractCustomerId(jwt);
            if (subjectId != null) {

                // Đọc claims để xác định loại tài khoản và role
                Claims claims = jwtService.extractAllClaims(jwt);
                String type = (String) claims.getOrDefault("type", "CUSTOMER");
                String roleStr = (String) claims.get("role");

                List<SimpleGrantedAuthority> authorities = new ArrayList<>();

                if ("STAFF".equalsIgnoreCase(type) && roleStr != null && !roleStr.isBlank()) {
                    String normRole = roleStr.toUpperCase();
                    if ("ADMIN".equals(normRole)) {
                        authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
                        authorities.add(new SimpleGrantedAuthority("ROLE_STORE_MANAGER"));
                        authorities.add(new SimpleGrantedAuthority("ROLE_STAFF"));
                    } else if ("STORE_MANAGER".equals(normRole)) {
                        authorities.add(new SimpleGrantedAuthority("ROLE_STORE_MANAGER"));
                        authorities.add(new SimpleGrantedAuthority("ROLE_STAFF"));
                    } else {
                        authorities.add(new SimpleGrantedAuthority("ROLE_" + normRole));
                        authorities.add(new SimpleGrantedAuthority("ROLE_STAFF"));
                    }
                    log.debug("Xác thực Staff [{}] qua JWT — authorities: {}", subjectId, authorities);
                } else {
                    authorities.add(new SimpleGrantedAuthority("ROLE_CUSTOMER"));
                    log.debug("Xác thực Customer [{}] qua JWT", subjectId);
                }

                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(subjectId, null, authorities);
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        filterChain.doFilter(request, response);
    }
}
