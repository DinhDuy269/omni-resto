package com.omniresto.backend.config;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final StaffKeyAuthenticationFilter staffKeyAuthenticationFilter;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(
            StaffKeyAuthenticationFilter staffKeyAuthenticationFilter,
            JwtAuthenticationFilter jwtAuthenticationFilter
    ) {
        this.staffKeyAuthenticationFilter = staffKeyAuthenticationFilter;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(this::configureAuthorizeHttpRequests)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(staffKeyAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .exceptionHandling(exceptionHandling -> exceptionHandling
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType("application/json");
                            String msg = accessDeniedException.getMessage() != null ? accessDeniedException.getMessage()
                                    : "Access is denied";
                            response.getWriter()
                                    .write("{\"error\":\"access_denied\",\"error_description\":\"" + msg + "\"}");
                        })
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType("application/json");
                            response.getWriter()
                                    .write("{\"error\":\"" + HttpStatus.UNAUTHORIZED.getReasonPhrase() + "\"}");
                        }))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        return http.build();
    }

    private void configureAuthorizeHttpRequests(
            AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry authorizeRequests) {
        authorizeRequests
                // 1. File Upload (FileUploadController) - Admin/Staff only
                .requestMatchers(uploadApiPatterns()).hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")

                // 2. User & Staff RBAC Management (UserController) - Chỉ Quản trị viên (ADMIN) & Quản lý (STORE_MANAGER)
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/users", "/api/users/**").hasAnyRole("ADMIN", "STORE_MANAGER")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/users", "/api/users/**").hasAnyRole("ADMIN", "STORE_MANAGER")
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/users", "/api/users/**").hasAnyRole("ADMIN", "STORE_MANAGER")
                .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/users", "/api/users/**").hasAnyRole("ADMIN", "STORE_MANAGER")
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/users", "/api/users/**").hasAnyRole("ADMIN", "STORE_MANAGER")

                // 3. Customer Admin Management (Admin only)
                .requestMatchers(customerAdminApiPatterns()).hasAnyRole("ADMIN", "STORE_MANAGER")

                // 4. Action Logs (Nhật ký thao tác) - Xem: Admin & Manager, Ghi: Staff
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/action-logs", "/api/action-logs/**").hasAnyRole("ADMIN", "STORE_MANAGER")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/action-logs", "/api/action-logs/**").hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")

                // 5. Menu Items: GET public, POST/PUT/PATCH/DELETE yêu cầu quyền Admin/Staff
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/menu-items", "/api/menu-items/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/menu-items", "/api/menu-items/**").hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/menu-items", "/api/menu-items/**").hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")
                .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/menu-items", "/api/menu-items/**").hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/menu-items", "/api/menu-items/**").hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")

                // 6. Category: GET public, POST/PUT/DELETE yêu cầu quyền Admin/Staff
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/categories", "/api/categories/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/categories", "/api/categories/**").hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/categories", "/api/categories/**").hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/categories", "/api/categories/**").hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")

                // 7. Reservations: Khách đặt bàn online & tra cứu là public; quản trị yêu cầu Admin/Staff
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/tables/reservations/online", "/api/reservations/online").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/tables/reservations/track/**", "/api/reservations/track/**", "/api/tables/reservations/check-phone", "/api/reservations/check-phone").permitAll()
                .requestMatchers(reservationApiPatterns()).hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")

                // 8. Table Sessions: Các thao tác thu ngân / nhân viên yêu cầu Admin/Staff
                .requestMatchers(org.springframework.http.HttpMethod.POST,
                        "/api/table-sessions/verify",
                        "/api/table-sessions/confirm-payment",
                        "/api/table-sessions/tables/**",
                        "/api/table-sessions/close"
                ).hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")
                .requestMatchers(tableSessionApiPatterns()).permitAll()

                // 9. Tables: GET public, POST/PATCH/DELETE yêu cầu quyền Admin/Staff
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/tables", "/api/tables/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/tables", "/api/tables/**").hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")
                .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/tables", "/api/tables/**").hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/tables", "/api/tables/**").hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")

                // 10. Vouchers: GET /available & /validate public, quản trị yêu cầu quyền Admin/Staff
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/vouchers/available", "/api/vouchers/validate").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/vouchers/validate").permitAll()
                .requestMatchers(voucherApiPatterns()).hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")

                // 11. Service Requests: Khách tại bàn gửi yêu cầu là public; xem & resolve yêu cầu Admin/Staff
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/service-requests").permitAll()
                .requestMatchers(serviceRequestApiPatterns()).hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")

                // 12. Order Management: Khách hủy món PENDING; cập nhật khác yêu cầu Staff
                .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/orders/*/items/*/cancel").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/orders/**").hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/orders/*/confirm-payment").hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")
                .requestMatchers(orderApiPatterns()).permitAll()

                // 13. Public Endpoints & Unified Auth (login, register)
                .requestMatchers(paymentApiPatterns()).permitAll()
                .requestMatchers(aiApiPatterns()).permitAll()
                .requestMatchers(authApiPatterns()).permitAll()

                // Infrastructure / Static / Docs
                .requestMatchers(websocketPatterns()).permitAll()
                .requestMatchers(swaggerPatterns()).permitAll()
                .requestMatchers(staticResourcePatterns()).permitAll()
                .anyRequest().authenticated();
    }

    // region upload
    private static RequestMatcher[] uploadApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/upload"),
                new AntPathRequestMatcher("/api/upload/**")
        };
    }
    // endregion

    // region menu
    private static RequestMatcher[] menuApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/menu-items"),
                new AntPathRequestMatcher("/api/menu-items/**")
        };
    }
    // endregion

    // region category
    private static RequestMatcher[] categoryApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/categories"),
                new AntPathRequestMatcher("/api/categories/**")
        };
    }
    // endregion

    // region order
    private static RequestMatcher[] orderApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/orders"),
                new AntPathRequestMatcher("/api/orders/**")
        };
    }
    // endregion

    // region user
    private static RequestMatcher[] userApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/users"),
                new AntPathRequestMatcher("/api/users/**")
        };
    }
    // endregion

    // region table
    private static RequestMatcher[] tableApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/tables"),
                new AntPathRequestMatcher("/api/tables/**")
        };
    }
    // endregion

    // region table-session
    private static RequestMatcher[] tableSessionApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/table-sessions"),
                new AntPathRequestMatcher("/api/table-sessions/**")
        };
    }
    // endregion

    // region reservation
    private static RequestMatcher[] reservationApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/tables/reservations"),
                new AntPathRequestMatcher("/api/tables/reservations/**"),
                new AntPathRequestMatcher("/api/reservations"),
                new AntPathRequestMatcher("/api/reservations/**")
        };
    }
    // endregion

    // region voucher
    private static RequestMatcher[] voucherApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/vouchers"),
                new AntPathRequestMatcher("/api/vouchers/**")
        };
    }
    // endregion

    // region service-request
    private static RequestMatcher[] serviceRequestApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/service-requests"),
                new AntPathRequestMatcher("/api/service-requests/**")
        };
    }
    // endregion

    // region payment
    private static RequestMatcher[] paymentApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/payments"),
                new AntPathRequestMatcher("/api/payments/**")
        };
    }
    // endregion

    // region ai
    private static RequestMatcher[] aiApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/ai"),
                new AntPathRequestMatcher("/api/ai/**")
        };
    }
    // endregion

    // region websocket
    private static RequestMatcher[] websocketPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/ws/**"),
                new AntPathRequestMatcher("/ws-raw/**")
        };
    }
    // endregion

    // region swagger
    private static RequestMatcher[] swaggerPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/v3/api-docs/**"),
                new AntPathRequestMatcher("/swagger-ui/**"),
                new AntPathRequestMatcher("/swagger-ui.html")
        };
    }
    // endregion

    // region static resources
    private static RequestMatcher[] staticResourcePatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/uploads/**"),
                new AntPathRequestMatcher("/error")
        };
    }
    // endregion

    // region customer-admin (Admin only)
    private static RequestMatcher[] customerAdminApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/auth/admin/**")
        };
    }
    // endregion

    // region auth (Unified AuthController — /api/auth)
    private static RequestMatcher[] authApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/auth"),
                new AntPathRequestMatcher("/api/auth/**")
        };
    }
    // endregion
}
