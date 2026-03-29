package com.rodando.backend.config;

import java.util.Objects;
import org.springframework.lang.NonNull;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

  private final AppProperties properties;
  private final AuditContextInterceptor auditContextInterceptor;

  public WebConfig(AppProperties properties, AuditContextInterceptor auditContextInterceptor) {
    this.properties = properties;
    this.auditContextInterceptor = auditContextInterceptor;
  }

  @Override
  public void addInterceptors(@NonNull InterceptorRegistry registry) {
    registry.addInterceptor(auditContextInterceptor);
  }

  @Override
  public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
    registry.addResourceHandler("/uploads/**").addResourceLocations("file:uploads/");
  }

  @Override
  public void addCorsMappings(@NonNull CorsRegistry registry) {
    String[] allowedOrigins = Objects.requireNonNull(properties.allowedOrigins().toArray(String[]::new));
    registry.addMapping("/**")
        .allowedOrigins(allowedOrigins)
        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
        .allowedHeaders("Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin",
            "X-Guest-Token", "Idempotency-Key")
        .allowCredentials(true)
        .maxAge(3600);
  }
}


