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

    public SecurityConfig(StaffKeyAuthenticationFilter staffKeyAuthenticationFilter) {
        this.staffKeyAuthenticationFilter = staffKeyAuthenticationFilter;
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
                // 1. File Upload (FileUploadController)
                .requestMatchers(uploadApiPatterns()).hasAnyRole("ADMIN", "STORE_MANAGER", "STAFF")
                // 2. Menu Item (MenuItemController)
                .requestMatchers(menuApiPatterns()).permitAll()
                // 3. Category (CategoryController)
                .requestMatchers(categoryApiPatterns()).permitAll()
                // 4. Order (OrderController)
                .requestMatchers(orderApiPatterns()).permitAll()
                // 5. User (UserController)
                .requestMatchers(userApiPatterns()).permitAll()
                // 6. Table (TableController)
                .requestMatchers(tableApiPatterns()).permitAll()
                // 7. Table Session (TableSessionController)
                .requestMatchers(tableSessionApiPatterns()).permitAll()
                // 8. Reservation (ReservationController)
                .requestMatchers(reservationApiPatterns()).permitAll()
                // 9. Voucher (VoucherController)
                .requestMatchers(voucherApiPatterns()).permitAll()
                // 10. Service Request (ServiceRequestController)
                .requestMatchers(serviceRequestApiPatterns()).permitAll()
                // 11. Payment (PaymentController)
                .requestMatchers(paymentApiPatterns()).permitAll()
                // 12. AI Chatbot (AiChatbotController)
                .requestMatchers(aiApiPatterns()).permitAll()
                // 13. Event (EventController)
                .requestMatchers(eventApiPatterns()).permitAll()
                // 14. Newsletter (NewsletterController)
                .requestMatchers(newsletterApiPatterns()).permitAll()
                // 15. Customer Authentication & Management (CustomerAuthController)
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
    // region customer-auth (CustomerAuthController)
    private static RequestMatcher[] customerAuthApiPatterns() {
        return new RequestMatcher[] {
                new AntPathRequestMatcher("/api/v1/auth/customer"),
                new AntPathRequestMatcher("/api/v1/auth/customer/**"),
                new AntPathRequestMatcher("/api/v1/customer/auth"),
                new AntPathRequestMatcher("/api/v1/customer/auth/**"),
                new AntPathRequestMatcher("/api/customers"),
                new AntPathRequestMatcher("/api/customers/**")
        };
    }
    // endregion
}

