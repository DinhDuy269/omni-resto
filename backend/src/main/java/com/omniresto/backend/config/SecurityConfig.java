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

import lombok.RequiredArgsConstructor;
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

    @Bean // nghĩa là Spring gọi hàm này một lần khi khởi động, giữ kết quả để dùng chung.
    public PasswordEncoder passwordEncoder() {
        // Hàm băm pass thành chuỗi băm 1 chiều và chứa salt(không thể đảo ngược lại)
        return new BCryptPasswordEncoder();
    }

    @Bean
    // CORS dùng để cho phép các domain khác truy cập vào server.
    // Chỉ chặn truy cập trình duyệt không chặn truy cập Api vì CORS do trình duyệt thực thi không do máy chủ
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
    // Chuỗi lọc bảo mật
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))// Gọi hàm cho phép truy cập từ domain khác(Cors)
                .csrf(AbstractHttpConfigurer::disable)// Tắt bảo vệ CSRF(Cross-Site Request Forgery)
                .authorizeHttpRequests(this::configureAuthorizeHttpRequests)// Cấu hình quyền truy cập vào các API
                .addFilterBefore(staffKeyAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
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
                .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/users", "/api/users/**").hasAnyRole("ADMIN", "STORE_MANAGER")
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/users", "/api/users/**").hasRole("ADMIN")

                // 3. Customer Admin Management (CustomerAuthController - Admin only)
                .requestMatchers(customerAdminApiPatterns()).hasAnyRole("ADMIN", "STORE_MANAGER")

                // 4. Menu Items: GET public, POST/PUT/PATCH/DELETE yêu cầu quyền Admin/Staff
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/menu-items", "/api/menu-items/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/menu-items", "/api/menu-items/**").hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/menu-items", "/api/menu-items/**").hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")
                .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/menu-items", "/api/menu-items/**").hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/menu-items", "/api/menu-items/**").hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")

                // 5. Category: GET public, POST/PUT/DELETE yêu cầu quyền Admin/Staff
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/categories", "/api/categories/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/categories", "/api/categories/**").hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/categories", "/api/categories/**").hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/categories", "/api/categories/**").hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")

                // 6. Reservations: Khách đặt bàn online & tra cứu là public; toàn bộ quản trị (danh sách PII, xếp bàn, check-in, hủy) yêu cầu Admin/Staff
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/tables/reservations/online", "/api/reservations/online").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/tables/reservations/track/**", "/api/reservations/track/**").permitAll()
                .requestMatchers(reservationApiPatterns()).hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")

                // 7. Table Sessions: Các thao tác thu ngân / nhân viên (verify, confirm-payment, close) yêu cầu Admin/Staff
                .requestMatchers(org.springframework.http.HttpMethod.POST,
                        "/api/table-sessions/verify",
                        "/api/table-sessions/confirm-payment",
                        "/api/table-sessions/tables/**",
                        "/api/table-sessions/close"
                ).hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")
                .requestMatchers(tableSessionApiPatterns()).permitAll()

                // 8. Tables: GET public, POST/PATCH/DELETE yêu cầu quyền Admin/Staff
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/tables", "/api/tables/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/tables", "/api/tables/**").hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")
                .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/tables", "/api/tables/**").hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/tables", "/api/tables/**").hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")

                // 9. Vouchers: GET /available & /validate public, mọi thao tác danh sách quản trị yêu cầu quyền Admin/Staff
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/vouchers/available", "/api/vouchers/validate").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/vouchers/validate").permitAll()
                .requestMatchers(voucherApiPatterns()).hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")

                // 10. Service Requests: Khách tại bàn gửi yêu cầu là public; xem danh sách active và resolve yêu cầu Admin/Staff
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/service-requests").permitAll()
                .requestMatchers(serviceRequestApiPatterns()).hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")

                // 11. Order Management: Thao tác cập nhật trạng thái đơn/món của nhân viên
                .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/orders/**").hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/orders/*/items/*/cancel").hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")
                .requestMatchers(orderApiPatterns()).permitAll()

                // 12. Public & Customer Endpoints
                .requestMatchers(paymentApiPatterns()).permitAll()
                .requestMatchers(aiApiPatterns()).permitAll()
                .requestMatchers(eventApiPatterns()).permitAll()
                .requestMatchers(newsletterApiPatterns()).permitAll()
                .requestMatchers(customerAuthApiPatterns()).permitAll()

                // Infrastructure / Static / Docs
                .requestMatchers(websocketPatterns()).permitAll()
                .requestMatchers(swaggerPatterns()).permitAll()
                .requestMatchers(staticResourcePatterns()).permitAll()
                .anyRequest().authenticated();
    }

    // region upload (FileUploadController)
    private static RequestMatcher[] uploadApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/upload"),
                new AntPathRequestMatcher("/api/upload/**")
        };
    }
    // endregion

    // region menu (MenuItemController)
    private static RequestMatcher[] menuApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/menu-items"),
                new AntPathRequestMatcher("/api/menu-items/**")
        };
    }
    // endregion

    // region category (CategoryController)
    private static RequestMatcher[] categoryApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/categories"),
                new AntPathRequestMatcher("/api/categories/**")
        };
    }
    // endregion

    // region order (OrderController)
    private static RequestMatcher[] orderApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/orders"),
                new AntPathRequestMatcher("/api/orders/**")
        };
    }
    // endregion

    // region user (UserController)
    private static RequestMatcher[] userApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/users"),
                new AntPathRequestMatcher("/api/users/**")
        };
    }
    // endregion

    // region table (TableController)
    private static RequestMatcher[] tableApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/tables"),
                new AntPathRequestMatcher("/api/tables/**")
        };
    }
    // endregion

    // region table-session (TableSessionController)
    private static RequestMatcher[] tableSessionApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/table-sessions"),
                new AntPathRequestMatcher("/api/table-sessions/**")
        };
    }
    // endregion

    // region reservation (ReservationController)
    private static RequestMatcher[] reservationApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/tables/reservations"),
                new AntPathRequestMatcher("/api/tables/reservations/**"),
                new AntPathRequestMatcher("/api/reservations"),
                new AntPathRequestMatcher("/api/reservations/**")
        };
    }
    // endregion

    // region voucher (VoucherController)
    private static RequestMatcher[] voucherApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/vouchers"),
                new AntPathRequestMatcher("/api/vouchers/**")
        };
    }
    // endregion

    // region service-request (ServiceRequestController)
    private static RequestMatcher[] serviceRequestApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/service-requests"),
                new AntPathRequestMatcher("/api/service-requests/**")
        };
    }
    // endregion

    // region payment (PaymentController)
    private static RequestMatcher[] paymentApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/payments"),
                new AntPathRequestMatcher("/api/payments/**")
        };
    }
    // endregion

    // region ai (AiChatbotController)
    private static RequestMatcher[] aiApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/ai"),
                new AntPathRequestMatcher("/api/ai/**")
        };
    }
    // endregion

    // region event (EventController)
    private static RequestMatcher[] eventApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/events"),
                new AntPathRequestMatcher("/api/events/**")
        };
    }
    // endregion

    // region newsletter (NewsletterController)
    private static RequestMatcher[] newsletterApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/newsletter"),
                new AntPathRequestMatcher("/api/newsletter/**")
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
    // region customer-admin (CustomerAuthController - Admin only)
    private static RequestMatcher[] customerAdminApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/customers/admin/**"),
                new AntPathRequestMatcher("/api/v1/auth/customer/admin/**"),
                new AntPathRequestMatcher("/api/v1/customer/auth/admin/**"),
                new AntPathRequestMatcher("/api/auth/admin/**")
        };
    }
    // endregion

    // region customer-auth (CustomerAuthController)
    private static RequestMatcher[] customerAuthApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/v1/auth/customer"),
                new AntPathRequestMatcher("/api/v1/auth/customer/**"),
                new AntPathRequestMatcher("/api/v1/customer/auth"),
                new AntPathRequestMatcher("/api/v1/customer/auth/**"),
                new AntPathRequestMatcher("/api/customers"),
                new AntPathRequestMatcher("/api/customers/**"),
                new AntPathRequestMatcher("/api/auth"),
                new AntPathRequestMatcher("/api/auth/**")
        };
    }
    // endregion
}

