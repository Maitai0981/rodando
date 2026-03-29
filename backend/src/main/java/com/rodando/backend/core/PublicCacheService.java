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
    if (prefixes.isEmpty()) return 0;
    long[] removed = {0};
    cache.asMap().keySet().removeIf(key -> {
      for (String prefix : prefixes) {
        if (key.startsWith(prefix)) {
          removed[0]++;
          return true;
        }
      }
      return false;
    });
    metricsTracker.recordCacheInvalidation(removed[0]);
    return removed[0];
  }
}


