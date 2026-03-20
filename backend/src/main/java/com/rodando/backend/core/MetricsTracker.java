package com.rodando.backend.core;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.stereotype.Component;

@Component
public class MetricsTracker {

  private final long startedAt = System.currentTimeMillis();
  private final AtomicLong requestTotal = new AtomicLong();
  private final AtomicLong queryTotal = new AtomicLong();
  private final AtomicLong querySlow = new AtomicLong();
  private final AtomicLong cacheHits = new AtomicLong();
  private final AtomicLong cacheMisses = new AtomicLong();
  private final AtomicLong cacheSets = new AtomicLong();
  private final AtomicLong cacheInvalidations = new AtomicLong();
  private final Map<String, RouteMetric> routes = new ConcurrentHashMap<>();
  private final List<Double> queryDurations = new ArrayList<>();

  public synchronized void recordQuery(double durationMs) {
    queryTotal.incrementAndGet();
    if (durationMs >= 250) {
      querySlow.incrementAndGet();
    }
    queryDurations.add(durationMs);
    while (queryDurations.size() > 1000) {
      queryDurations.remove(0);
    }
  }

  public void recordRequest(String method, String route, int status, double durationMs, long bytes) {
    requestTotal.incrementAndGet();
    String key = method.toUpperCase() + " " + route;
    routes.computeIfAbsent(key, ignored -> new RouteMetric()).record(status, durationMs, bytes);
  }

  public void recordCacheHit() {
    cacheHits.incrementAndGet();
  }

  public void recordCacheMiss() {
    cacheMisses.incrementAndGet();
  }

  public void recordCacheSet() {
    cacheSets.incrementAndGet();
  }

  public void recordCacheInvalidation(long count) {
    cacheInvalidations.addAndGet(Math.max(0, count));
  }

  public synchronized Map<String, Object> snapshot() {
    List<Map<String, Object>> routeItems = routes.entrySet().stream()
        .map(entry -> entry.getValue().toMap(entry.getKey()))
        .sorted(Comparator.comparingDouble(item -> -((Number) item.get("p95Ms")).doubleValue()))
        .toList();

    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("startedAt", startedAt);
    payload.put("uptimeSec", (System.currentTimeMillis() - startedAt) / 1000.0d);
    payload.put("requests", Map.of("total", requestTotal.get(), "routes", routeItems));
    payload.put("cache", Map.of(
        "hits", cacheHits.get(),
        "misses", cacheMisses.get(),
        "sets", cacheSets.get(),
        "invalidations", cacheInvalidations.get(),
        "hitRate", cacheHits.get() + cacheMisses.get() == 0 ? 0.0d
            : ((double) cacheHits.get() / (double) (cacheHits.get() + cacheMisses.get()))));
    payload.put("queries", Map.of(
        "total", queryTotal.get(),
        "slow", querySlow.get(),
        "p95Ms", percentile(queryDurations, 95),
        "p99Ms", percentile(queryDurations, 99),
        "avgMs", average(queryDurations)));
    return payload;
  }

  private double percentile(List<Double> values, int percentile) {
    if (values.isEmpty()) {
      return 0.0d;
    }
    List<Double> copy = new ArrayList<>(values);
    copy.sort(Double::compareTo);
    int index = Math.max(0, Math.min(copy.size() - 1, (int) Math.ceil((percentile / 100.0d) * copy.size()) - 1));
    return round(copy.get(index));
  }

  private double average(List<Double> values) {
    return values.isEmpty() ? 0.0d : round(values.stream().mapToDouble(Double::doubleValue).average().orElse(0.0d));
  }

  private double round(double value) {
    return Math.round(value * 100.0d) / 100.0d;
  }

  private static final class RouteMetric {
    private long count;
    private long errors;
    private long bytes;
    private final List<Double> durations = new ArrayList<>();

    synchronized void record(int status, double durationMs, long byteCount) {
      count += 1;
      if (status >= 400) {
        errors += 1;
      }
      bytes += byteCount;
      durations.add(durationMs);
      while (durations.size() > 600) {
        durations.remove(0);
      }
    }

    synchronized Map<String, Object> toMap(String route) {
      List<Double> copy = new ArrayList<>(durations);
      copy.sort(Double::compareTo);
      return Map.of(
          "route", route,
          "count", count,
          "errors", errors,
          "bytes", bytes,
          "p95Ms", percentile(copy, 95),
          "p99Ms", percentile(copy, 99),
          "avgMs", average(copy));
    }

    private double percentile(List<Double> values, int percentile) {
      if (values.isEmpty()) return 0.0d;
      int index = Math.max(0, Math.min(values.size() - 1, (int) Math.ceil((percentile / 100.0d) * values.size()) - 1));
      return Math.round(values.get(index) * 100.0d) / 100.0d;
    }

    private double average(List<Double> values) {
      return values.isEmpty() ? 0.0d
          : Math.round(values.stream().mapToDouble(Double::doubleValue).average().orElse(0.0d) * 100.0d) / 100.0d;
    }
  }
}


