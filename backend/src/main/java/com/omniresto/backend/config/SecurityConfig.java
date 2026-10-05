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

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

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
                .exceptionHandling(exceptionHandling -> exceptionHandling
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType("application/json");
                            String msg = accessDeniedException.getMessage() != null ? accessDeniedException.getMessage() : "Access is denied";
                            response.getWriter().write("{\"error\":\"access_denied\",\"error_description\":\"" + msg + "\"}");
                        })
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType("application/json");
                            response.getWriter().write("{\"error\":\"" + HttpStatus.UNAUTHORIZED.getReasonPhrase() + "\"}");
                        })
                )
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        return http.build();
    }

    private void configureAuthorizeHttpRequests(AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry authorizeRequests) {
        authorizeRequests
<<<<<<< Updated upstream
=======
                // [ADDED] Cho phép các request xác thực (Đăng ký, Đăng nhập, OTP...) không bị chặn 401
                .requestMatchers(authApiPatterns()).permitAll()
>>>>>>> Stashed changes
                .requestMatchers(branchApiPatterns()).permitAll()
                .requestMatchers(menuApiPatterns()).permitAll()
                .requestMatchers(orderApiPatterns()).permitAll()
                .requestMatchers(userApiPatterns()).permitAll()
                .requestMatchers(tableApiPatterns()).permitAll()
<<<<<<< Updated upstream
                .requestMatchers(customerApiPatterns()).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/error")).permitAll() // [THÊM] để thấy lỗi thật thay vì 401

=======
>>>>>>> Stashed changes
                .anyRequest().authenticated();
    }

    // [ADDED] region auth - Cấu hình cấp quyền truy cập công khai cho endpoint /api/auth/**
    private static RequestMatcher[] authApiPatterns() {
        return new RequestMatcher[]{
                new AntPathRequestMatcher("/api/auth"),
                new AntPathRequestMatcher("/api/auth/**")
        };
    }
    // endregion

    // region branch
    private static RequestMatcher[] branchApiPatterns() {
        return new RequestMatcher[]{
                new AntPathRequestMatcher("/api/branches"),
                new AntPathRequestMatcher("/api/branches/**")
        };
    }
    // endregion

    // region menu
    private static RequestMatcher[] menuApiPatterns() {
        return new RequestMatcher[]{
                new AntPathRequestMatcher("/api/menu-items"),
                new AntPathRequestMatcher("/api/menu-items/**")
        };
    }
    // endregion

    // region order
    private static RequestMatcher[] orderApiPatterns() {
        return new RequestMatcher[]{
                new AntPathRequestMatcher("/api/orders"),
                new AntPathRequestMatcher("/api/orders/**")
        };
    }
    // endregion

    // region user
    private static RequestMatcher[] userApiPatterns() {
        return new RequestMatcher[]{
                new AntPathRequestMatcher("/api/users"),
                new AntPathRequestMatcher("/api/users/**")
        };
    }
    // endregion

    // region table
    private static RequestMatcher[] tableApiPatterns() {
        return new RequestMatcher[]{
                new AntPathRequestMatcher("/api/tables"),
                new AntPathRequestMatcher("/api/tables/**")
        };
    }
    // endregion
<<<<<<< Updated upstream

    // region customer
    private static RequestMatcher[] customerApiPatterns() {
        return new RequestMatcher[]{
                new AntPathRequestMatcher("/api/customers"),    // [SỬA] mở API danh sách khách hàng
                new AntPathRequestMatcher("/api/customers/**")  // [SỬA] mở register và đổi trạng thái
        };
    }
    // endregion
=======
>>>>>>> Stashed changes
}