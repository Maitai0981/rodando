package com.rodando.backend.api;

import com.rodando.backend.auth.AuthContext;
import com.rodando.backend.config.AuthFilter;
import com.rodando.backend.common.ApiException;
import com.rodando.backend.core.RateLimiterService;
import com.rodando.backend.config.AppProperties;
import com.rodando.backend.core.RodandoService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.util.Map;
import java.util.Objects;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.lang.NonNull;

public abstract class BaseApiController {

  protected final AppProperties properties;
  protected final RodandoService service;
  protected final RateLimiterService rateLimiter;

  protected BaseApiController(AppProperties properties, RodandoService service, RateLimiterService rateLimiter) {
    this.properties = properties;
    this.service = service;
    this.rateLimiter = rateLimiter;
  }

  protected AuthContext context(HttpServletRequest request) {
    Object auth = request.getAttribute(AuthContext.ATTRIBUTE);
    return auth instanceof AuthContext value
        ? value
        : new AuthContext(null, null, "", "");
  }

  protected AuthContext.AuthUser requireAuth(HttpServletRequest request) {
    AuthContext auth = context(request);
    if (!auth.authenticated()) {
      throw new ApiException(401, "Autenticacao necessaria.");
    }
    return auth.user();
  }

  protected AuthContext.AuthUser requireOwner(HttpServletRequest request) {
    AuthContext.AuthUser user = requireAuth(request);
    if (!"owner".equals(service.normalize(user.role()))) {
      throw new ApiException(403, "Acesso restrito ao owner.");
    }
    return user;
  }

  protected void setSessionCookie(HttpServletResponse response, @NonNull String token) {
    Duration maxAge = Objects.requireNonNull(Duration.ofMillis(properties.sessionTtlMs()));
    String sameSite = Objects.requireNonNullElse(properties.sameSite(), "Lax");
    ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(AuthFilter.SESSION_COOKIE, token)
        .httpOnly(true)
        .secure(properties.cookieSecure())
        .sameSite(sameSite)
        .path("/")
        .maxAge(maxAge);
    if (!properties.cookieDomain().isBlank()) {
      builder.domain(properties.cookieDomain());
    }
    response.addHeader(HttpHeaders.SET_COOKIE, builder.build().toString());
  }

  protected void clearSessionCookie(HttpServletResponse response) {
    String sameSite = Objects.requireNonNullElse(properties.sameSite(), "Lax");
    ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(AuthFilter.SESSION_COOKIE, "")
        .httpOnly(true)
        .secure(properties.cookieSecure())
        .sameSite(sameSite)
        .path("/")
        .maxAge(Objects.requireNonNull(Duration.ZERO));
    if (!properties.cookieDomain().isBlank()) {
      builder.domain(properties.cookieDomain());
    }
    response.addHeader(HttpHeaders.SET_COOKIE, builder.build().toString());
  }

  protected String clientKey(HttpServletRequest request) {
    // Usa apenas o primeiro IP do X-Forwarded-For para evitar spoofing com listas
    // fabricadas (ex: "1.2.3.4, attacker-ip"). O cabeçalho só é confiável quando
    // o servidor está atrás de um proxy reverso autenticado; em produção isso deve
    // ser restrito por CIDR do proxy. Fallback para remoteAddr sempre.
    String forwarded = service.trim(request.getHeader("x-forwarded-for"));
    if (!forwarded.isBlank()) {
      int comma = forwarded.indexOf(',');
      String firstIp = service.trim(comma >= 0 ? forwarded.substring(0, comma) : forwarded);
      if (!firstIp.isBlank()) return firstIp;
    }
    String remote = service.trim(request.getRemoteAddr());
    return remote.isBlank() ? "unknown" : remote;
  }

  protected void enforceRateLimit(
      HttpServletResponse response,
      String namespace,
      String key,
      Duration window,
      int limit,
      String message) {
    RateLimiterService.Decision decision = rateLimiter.check(namespace, key, window, limit);
    if (!decision.allowed()) {
      response.setHeader("Retry-After", String.valueOf(decision.retryAfterSeconds()));
      throw new ApiException(429, message);
    }
  }

  @SuppressWarnings("unchecked")
  protected Map<String, Object> mapValue(Object value) {
    return value instanceof Map<?, ?> map ? (Map<String, Object>) map : Map.of();
  }
}


