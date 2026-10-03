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
            .requestMatchers(menuApiPatterns()).permitAll()
            .requestMatchers(orderApiPatterns()).permitAll()
            .requestMatchers(userApiPatterns()).permitAll()
            .requestMatchers(tableApiPatterns()).permitAll()
            .requestMatchers(reservationApiPatterns()).permitAll()
            .requestMatchers(eventApiPatterns()).permitAll()
            .requestMatchers(newsletterApiPatterns()).permitAll()
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
            new AntPathRequestMatcher("/api/tables/**")
        };
    }
    // endregion

    // region reservation
    private static RequestMatcher[] reservationApiPatterns() {
        return new RequestMatcher[]{
            new AntPathRequestMatcher("/api/reservations"),
            new AntPathRequestMatcher("/api/reservations/**")
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
}
