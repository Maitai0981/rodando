package com.rodando.backend.core;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class PublicCacheService {

  private final Cache<String, Object> cache = Caffeine.newBuilder()
      .expireAfterWrite(Duration.ofMinutes(10))
      .maximumSize(500)
      .build();
  private final MetricsTracker metricsTracker;

  public PublicCacheService(MetricsTracker metricsTracker) {
    this.metricsTracker = metricsTracker;
  }

  public Object get(String key) {
    Object value = cache.getIfPresent(key);
    if (value == null) {
      metricsTracker.recordCacheMiss();
    } else {
      metricsTracker.recordCacheHit();
    }
    return value;
  }

  public void put(String key, Object value) {
    cache.put(key, value);
    metricsTracker.recordCacheSet();
  }

  public long invalidateByPrefix(List<String> prefixes) {
    long removed = 0;
    for (String key : cache.asMap().keySet()) {
      if (prefixes.stream().anyMatch(key::startsWith)) {
        cache.invalidate(key);
        removed += 1;
      }
    }
    metricsTracker.recordCacheInvalidation(removed);
    return removed;
  }
}


