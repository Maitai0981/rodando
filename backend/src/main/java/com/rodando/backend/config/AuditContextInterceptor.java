package com.rodando.backend.config;

import com.rodando.backend.core.AuditContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AuditContextInterceptor implements HandlerInterceptor {

  @Override
  public boolean preHandle(
      @NonNull HttpServletRequest request,
      @NonNull HttpServletResponse response,
      @NonNull Object handler) {
    String forwarded = request.getHeader("x-forwarded-for");
    String ip;
    if (forwarded != null && !forwarded.isBlank()) {
      int comma = forwarded.indexOf(',');
      ip = (comma >= 0 ? forwarded.substring(0, comma) : forwarded).strip();
    } else {
      ip = request.getRemoteAddr();
    }
    String ua = request.getHeader("user-agent");
    AuditContext.init(ip, ua);
    return true;
  }

  @Override
  public void afterCompletion(
      @NonNull HttpServletRequest request,
      @NonNull HttpServletResponse response,
      @NonNull Object handler,
      Exception ex) {
    AuditContext.clear();
  }
}
