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
   
    @Bean //nghĩa là Spring gọi hàm này một lần khi khởi động, giữ kết quả để dùng chung.
    
    public PasswordEncoder passwordEncoder() {
         // Hàm băm pass thành chuỗi băm 1 chiều và chứa salt(không thể đảo ngược lại)
        return new BCryptPasswordEncoder();
    }


    @Bean
    // CORS dùng để cho phép các domain khác truy cập vào server.
    //Chỉ chặn truy cập trình duyệt không chặn truy cập Api vì CORS do trình duyệt thực thi không do máy chủ
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
    //Chuỗi lọc bảo mật
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))//Gọi hàm cho phép truy cập từ domain khác(Cors)
            .csrf(AbstractHttpConfigurer::disable)//Tắt bảo vệ CSRF(Cross-Site Request Forgery)
            .authorizeHttpRequests(this::configureAuthorizeHttpRequests)//Cấu hình quyền truy cập vào các API
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
            .requestMatchers(menuApiPatterns()).permitAll()
            .requestMatchers(orderApiPatterns()).permitAll()
            .requestMatchers(userApiPatterns()).permitAll()
            .requestMatchers(tableApiPatterns()).permitAll()
            .requestMatchers(eventApiPatterns()).permitAll()
            .requestMatchers(newsletterApiPatterns()).permitAll()
            .requestMatchers(voucherApiPatterns()).permitAll()
            .requestMatchers(new AntPathRequestMatcher("/ws/**")).permitAll()
            .requestMatchers(new AntPathRequestMatcher("/ws-raw/**")).permitAll()
            .requestMatchers(new AntPathRequestMatcher("/api/payments/**")).permitAll()
            .requestMatchers(new AntPathRequestMatcher("/api/ai/**")).permitAll()
            .requestMatchers(new AntPathRequestMatcher("/error")).permitAll()
            .requestMatchers(new AntPathRequestMatcher("/v3/api-docs/**")).permitAll()
            .requestMatchers(new AntPathRequestMatcher("/swagger-ui/**")).permitAll()
            .requestMatchers(new AntPathRequestMatcher("/swagger-ui.html")).permitAll()
            .anyRequest().authenticated();
    }
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
            new AntPathRequestMatcher("/api/tables/**"),
            new AntPathRequestMatcher("/api/table-sessions"),
            new AntPathRequestMatcher("/api/table-sessions/**")
        };
    }
    // endregion


    // region event
    private static RequestMatcher[] eventApiPatterns() {
        return new RequestMatcher[]{
            new AntPathRequestMatcher("/api/events"),
            new AntPathRequestMatcher("/api/events/**")
        };
    }
    // endregion

    // region newsletter
    private static RequestMatcher[] newsletterApiPatterns() {
        return new RequestMatcher[]{
            new AntPathRequestMatcher("/api/newsletter"),
            new AntPathRequestMatcher("/api/newsletter/**")
        };
    }
    // endregion

    // region voucher
    private static RequestMatcher[] voucherApiPatterns() {
        return new RequestMatcher[]{
            new AntPathRequestMatcher("/api/vouchers"),
            new AntPathRequestMatcher("/api/vouchers/**")
        };
    }
    // endregion
}
