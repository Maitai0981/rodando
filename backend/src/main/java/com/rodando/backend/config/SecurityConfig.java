package com.rodando.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http, AuthFilter authFilter, ObjectMapper objectMapper) throws Exception {
    http
        .csrf(csrf -> csrf.disable())
        .cors(cors -> {})
        .httpBasic(httpBasic -> httpBasic.disable())
        .formLogin(form -> form.disable())
        .logout(logout -> logout.disable())
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .exceptionHandling(exceptions -> exceptions
            .authenticationEntryPoint((request, response, authException) -> writeJson(response, HttpServletResponse.SC_UNAUTHORIZED, objectMapper,
                "Autenticacao necessaria."))
            .accessDeniedHandler((request, response, accessDeniedException) -> writeJson(response, HttpServletResponse.SC_FORBIDDEN, objectMapper,
                "Acesso negado.")))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
            .requestMatchers("/error", "/actuator/**", "/api/health", "/api/ready", "/api/metrics").permitAll()
            .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
            .requestMatchers("/api/auth/me", "/api/auth/signin", "/api/auth/signup", "/api/auth/owner/signin", "/api/auth/logout").permitAll()
            .requestMatchers("/api/test/reset-non-user", "/api/payments/webhooks/**").permitAll()
            .requestMatchers("/api/bag", "/api/bag/**").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/comments", "/api/products/**", "/api/catalog/**", "/api/offers").permitAll()
            .requestMatchers("/ops", "/ops/assets/**", "/api/owner/**").hasRole("OWNER")
            .requestMatchers("/api/auth/profile", "/api/auth/profile/avatar", "/api/auth/profile/password", "/api/auth/addresses", "/api/auth/addresses/**", "/api/orders", "/api/orders/**",
                "/api/payments/mercadopago/complete",
                "/api/comments", "/api/ux/assist/**").authenticated()
            .anyRequest().denyAll())
        .addFilterBefore(authFilter, UsernamePasswordAuthenticationFilter.class);
    return http.build();
  }

  @Bean
  public UserDetailsService userDetailsService() {
    return username -> {
      throw new UsernameNotFoundException("Autenticacao por formulario nao suportada.");
    };
  }

  private void writeJson(HttpServletResponse response, int status, ObjectMapper objectMapper, String message) throws java.io.IOException {
    response.setStatus(status);
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.setCharacterEncoding("UTF-8");
    objectMapper.writeValue(response.getWriter(), java.util.Map.of("error", message));
  }
}


