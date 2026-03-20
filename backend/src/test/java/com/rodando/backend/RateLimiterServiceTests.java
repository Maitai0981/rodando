package com.rodando.backend;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rodando.backend.core.RateLimiterService;
import com.rodando.backend.config.AppProperties;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class RateLimiterServiceTests {

  @Test
  void blocksAfterConfiguredThreshold() {
    MockEnvironment environment = new MockEnvironment()
        .withProperty("RATE_LIMIT_ENABLED", "1")
        .withProperty("APP_ENV", "local");
    RateLimiterService limiter = new RateLimiterService(new AppProperties(environment));

    assertTrue(limiter.check("auth", "owner-signin:test", Duration.ofSeconds(60), 2).allowed());
    assertTrue(limiter.check("auth", "owner-signin:test", Duration.ofSeconds(60), 2).allowed());
    RateLimiterService.Decision third = limiter.check("auth", "owner-signin:test", Duration.ofSeconds(60), 2);

    assertFalse(third.allowed());
    assertTrue(third.retryAfterSeconds() > 0);
  }
}


