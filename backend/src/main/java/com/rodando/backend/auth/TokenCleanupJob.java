package com.rodando.backend.auth;

import com.rodando.backend.core.RodandoService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class TokenCleanupJob {

  private final RodandoService service;

  public TokenCleanupJob(RodandoService service) {
    this.service = service;
  }

  @Scheduled(fixedRateString = "${TOKEN_CLEANUP_INTERVAL_MS:3600000}")
  public void deleteExpiredTokens() {
    service.run("DELETE FROM sessions WHERE expires_at < NOW()");
    service.run("DELETE FROM password_reset_tokens WHERE expires_at < NOW()");
  }
}
