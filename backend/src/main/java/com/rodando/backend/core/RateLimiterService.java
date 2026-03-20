package com.rodando.backend.core;

import com.rodando.backend.config.AppProperties;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.stereotype.Service;

@Service
public class RateLimiterService {

  private final AppProperties properties;
  private final ConcurrentMap<String, Bucket> buckets = new ConcurrentHashMap<>();

  public RateLimiterService(AppProperties properties) {
    this.properties = properties;
  }

  public Decision check(String namespace, String key, Duration window, int limit) {
    if (!properties.rateLimitEnabled()) {
      return new Decision(true, 0);
    }
    long now = Instant.now().toEpochMilli();
    long windowMs = Math.max(1000L, window.toMillis());
    int safeLimit = Math.max(1, limit);
    String bucketKey = namespace + ":" + key;
    Bucket bucket = buckets.compute(bucketKey, (ignored, current) -> {
      if (current == null || now >= current.resetAt()) {
        return new Bucket(1, now + windowMs);
      }
      return new Bucket(current.count() + 1, current.resetAt());
    });
    if (bucket.count() > safeLimit) {
      long retryAfterSeconds = Math.max(1L, (bucket.resetAt() - now + 999L) / 1000L);
      return new Decision(false, retryAfterSeconds);
    }
    return new Decision(true, 0);
  }

  private record Bucket(int count, long resetAt) {
  }

  public record Decision(boolean allowed, long retryAfterSeconds) {
  }
}


