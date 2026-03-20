package com.rodando.backend.config;

import com.rodando.backend.auth.AuthContext;
import com.rodando.backend.account.AccountService;
import com.rodando.backend.core.RodandoService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class AuthFilter extends OncePerRequestFilter {

  public static final String SESSION_COOKIE = "rodando_session";
  public static final String GUEST_COOKIE = "rodando_guest";

  private final AccountService accountService;
  private final RodandoService service;
  private final AppProperties properties;

  public AuthFilter(AccountService accountService, RodandoService service, AppProperties properties) {
    this.accountService = accountService;
    this.service = service;
    this.properties = properties;
  }

  @Override
  protected void doFilterInternal(
      @NonNull HttpServletRequest request,
      @NonNull HttpServletResponse response,
      @NonNull FilterChain filterChain) throws ServletException, IOException {
    try {
      String sessionToken = readCookie(request, SESSION_COOKIE);
      String guestToken = readCookie(request, GUEST_COOKIE);
      if (guestToken.isBlank()) {
        guestToken = Objects.requireNonNull(service.generateGuestToken());
        response.addHeader(HttpHeaders.SET_COOKIE, buildCookie(GUEST_COOKIE, guestToken, Duration.ofMillis(properties.guestTtlMs())).toString());
      }

      AuthContext.AuthUser user = sessionToken.isBlank() ? null : accountService.findUserFromSessionToken(sessionToken);
      request.setAttribute(AuthContext.ATTRIBUTE, new AuthContext(
          sessionToken.isBlank() ? null : sessionToken,
          user,
          guestToken,
          service.hashToken(guestToken)));

      if (user != null && user.id() > 0) {
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
            user,
            null,
            List.of(new SimpleGrantedAuthority("ROLE_" + service.normalize(user.role()).toUpperCase())));
        SecurityContextHolder.getContext().setAuthentication(authentication);
      }

      filterChain.doFilter(request, response);
    } finally {
      SecurityContextHolder.clearContext();
    }
  }

  private String readCookie(HttpServletRequest request, String name) {
    Cookie[] cookies = request.getCookies();
    if (cookies == null) {
      return "";
    }
    return Arrays.stream(cookies)
        .filter(cookie -> name.equals(cookie.getName()))
        .map(Cookie::getValue)
        .findFirst()
        .orElse("");
  }

  private ResponseCookie buildCookie(@NonNull String name, @NonNull String value, Duration maxAge) {
    String sameSite = Objects.requireNonNullElse(properties.sameSite(), "Lax");
    ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(name, value)
        .httpOnly(true)
        .secure(properties.cookieSecure())
        .sameSite(sameSite)
        .maxAge(Objects.requireNonNull(maxAge))
        .path("/");
    if (!properties.cookieDomain().isBlank()) {
      builder.domain(properties.cookieDomain());
    }
    return builder.build();
  }
}


