package com.rodando.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import com.rodando.backend.core.MetricsTracker;
import com.rodando.backend.core.RequestLogService;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import com.rodando.backend.auth.AuthContext;

@Component
public class RequestMetricsFilter extends OncePerRequestFilter {

  private final MetricsTracker metricsTracker;
  private final RequestLogService requestLogService;

  public RequestMetricsFilter(MetricsTracker metricsTracker, RequestLogService requestLogService) {
    this.metricsTracker = metricsTracker;
    this.requestLogService = requestLogService;
  }

  @Override
  protected void doFilterInternal(
      @NonNull HttpServletRequest request,
      @NonNull HttpServletResponse response,
      @NonNull FilterChain filterChain) throws ServletException, IOException {
    long startedAt = System.nanoTime();
    String requestId = resolveRequestId(request);
    response.setHeader("x-request-id", requestId);
    filterChain.doFilter(request, response);
    double durationMs = (System.nanoTime() - startedAt) / 1_000_000.0d;
    metricsTracker.recordRequest(
        request.getMethod(),
        request.getRequestURI(),
        response.getStatus(),
        durationMs,
        response.getBufferSize());
    requestLogService.record(
        requestId,
        request.getMethod(),
        request.getRequestURI(),
        request.getRequestURI(),
        response.getStatus(),
        durationMs,
        resolveUserId(request),
        sanitizeQuery(request),
        Map.of());
  }

  private String resolveRequestId(HttpServletRequest request) {
    String current = request.getHeader("x-request-id");
    return current == null || current.isBlank() ? UUID.randomUUID().toString() : current.trim();
  }

  private Long resolveUserId(HttpServletRequest request) {
    Object auth = request.getAttribute(AuthContext.ATTRIBUTE);
    if (auth instanceof AuthContext context && context.authenticated()) {
      return context.user().id();
    }
    return null;
  }

  private Map<String, Object> sanitizeQuery(HttpServletRequest request) {
    Map<String, Object> query = new LinkedHashMap<>();
    request.getParameterMap().forEach((key, values) -> {
      if (values == null || values.length == 0) {
        query.put(key, "");
      } else if (values.length == 1) {
        query.put(key, values[0]);
      } else {
        query.put(key, values);
      }
    });
    return query;
  }
}


