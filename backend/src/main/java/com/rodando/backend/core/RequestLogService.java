package com.rodando.backend.core;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class RequestLogService {

  private static final int MAX_ENTRIES = 5_000;

  private final Deque<RequestLogEntry> entries = new ArrayDeque<>();

  public synchronized void record(
      String requestId,
      String method,
      String path,
      String routeKey,
      int status,
      double durationMs,
      Long userId,
      Map<String, Object> queryMasked,
      Map<String, Object> bodyMasked) {
    entries.addFirst(new RequestLogEntry(
        System.currentTimeMillis(),
        requestId,
        method,
        path,
        routeKey,
        status,
        Math.round(durationMs * 100.0d) / 100.0d,
        userId,
        queryMasked == null ? Map.of() : new LinkedHashMap<>(queryMasked),
        bodyMasked == null ? Map.of() : new LinkedHashMap<>(bodyMasked)));
    while (entries.size() > MAX_ENTRIES) {
      entries.removeLast();
    }
  }

  public synchronized List<RequestLogEntry> snapshot() {
    return new ArrayList<>(entries);
  }

  public synchronized int size() {
    return entries.size();
  }

  public record RequestLogEntry(
      long ts,
      String requestId,
      String method,
      String path,
      String routeKey,
      int status,
      double durationMs,
      Long userId,
      Map<String, Object> queryMasked,
      Map<String, Object> bodyMasked) {
  }
}


