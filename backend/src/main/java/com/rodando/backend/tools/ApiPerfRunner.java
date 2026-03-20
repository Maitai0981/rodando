package com.rodando.backend.tools;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class ApiPerfRunner {

  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
  private static final List<String> ENDPOINTS = List.of(
      "/api/health",
      "/api/products?page=1&pageSize=12&sort=best-sellers",
      "/api/offers",
      "/api/comments?limit=12",
      "/api/catalog/highlights",
      "/api/catalog/recommendations?limit=4");

  private ApiPerfRunner() {
  }

  public static void main(String[] args) throws Exception {
    String apiBase = normalizedApiBase(System.getenv("API_BASE"));
    int runsPerEndpoint = positiveInt(System.getenv("PERF_RUNS_PER_ENDPOINT"), 8);
    HttpClient client = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NORMAL).build();

    List<Map<String, Object>> results = new ArrayList<>();
    for (String endpoint : ENDPOINTS) {
      List<RequestSample> samples = new ArrayList<>();
      for (int index = 0; index < runsPerEndpoint; index += 1) {
        samples.add(timedRequest(client, apiBase + endpoint));
      }
      results.add(endpointResult(endpoint, samples));
    }

    results.sort(Comparator.comparingDouble(item -> -numberValue(item.get("p95Ms"))));
    printSummary(results);
    writeReport(apiBase, runsPerEndpoint, results);
  }

  private static RequestSample timedRequest(HttpClient client, String url)
      throws IOException, InterruptedException {
    HttpRequest request = HttpRequest.newBuilder(URI.create(url)).GET().build();
    long startedAt = System.nanoTime();
    HttpResponse<byte[]> response = client.send(request, HttpResponse.BodyHandlers.ofByteArray());
    double elapsedMs = round((System.nanoTime() - startedAt) / 1_000_000.0d);
    String cache = response.headers().firstValue("x-cache").orElse("");
    return new RequestSample(response.statusCode(), elapsedMs, cache);
  }

  private static Map<String, Object> endpointResult(String endpoint, List<RequestSample> samples) {
    List<Double> durations = samples.stream().map(RequestSample::elapsedMs).toList();
    Map<String, Integer> statusCounts = new LinkedHashMap<>();
    int cacheHits = 0;
    int cacheMisses = 0;
    for (RequestSample sample : samples) {
      statusCounts.merge(String.valueOf(sample.status()), 1, (left, right) -> left + right);
      if ("HIT".equalsIgnoreCase(sample.cache())) {
        cacheHits += 1;
      }
      if ("MISS".equalsIgnoreCase(sample.cache())) {
        cacheMisses += 1;
      }
    }

    LinkedHashMap<String, Object> result = new LinkedHashMap<>();
    result.put("endpoint", endpoint);
    result.put("runs", samples.size());
    result.put("avgMs", round(durations.stream().mapToDouble(Double::doubleValue).average().orElse(0.0d)));
    result.put("p95Ms", percentile(durations, 95));
    result.put("p99Ms", percentile(durations, 99));
    result.put("maxMs", round(durations.stream().mapToDouble(Double::doubleValue).max().orElse(0.0d)));
    result.put("statusCounts", statusCounts);
    result.put("cacheHits", cacheHits);
    result.put("cacheMisses", cacheMisses);
    return result;
  }

  private static void printSummary(List<Map<String, Object>> results) {
    System.out.println("API perf summary:");
    for (Map<String, Object> result : results) {
      System.out.printf(
          Locale.ROOT,
          "%-42s avg=%7.2fms p95=%7.2fms p99=%7.2fms max=%7.2fms hit=%2d miss=%2d%n",
          String.valueOf(result.get("endpoint")),
          numberValue(result.get("avgMs")),
          numberValue(result.get("p95Ms")),
          numberValue(result.get("p99Ms")),
          numberValue(result.get("maxMs")),
          ((Number) result.get("cacheHits")).intValue(),
          ((Number) result.get("cacheMisses")).intValue());
    }
  }

  private static void writeReport(String apiBase, int runsPerEndpoint, List<Map<String, Object>> results)
      throws IOException {
    Path outputDir = Path.of("perf");
    Files.createDirectories(outputDir);
    Path outputPath = outputDir.resolve("backend-api.json");

    LinkedHashMap<String, Object> payload = new LinkedHashMap<>();
    payload.put("generatedAt", Instant.now().toString());
    payload.put("apiBase", apiBase);
    payload.put("runsPerEndpoint", runsPerEndpoint);
    payload.put("results", results);

    OBJECT_MAPPER.writerWithDefaultPrettyPrinter().writeValue(outputPath.toFile(), payload);
    System.out.println("perf:api report: " + outputPath.toAbsolutePath());
  }

  private static String normalizedApiBase(String raw) {
    String value = raw == null ? "" : raw.trim();
    if (value.isEmpty()) {
      value = "http://127.0.0.1:4000";
    }
    while (value.endsWith("/")) {
      value = value.substring(0, value.length() - 1);
    }
    return value;
  }

  private static int positiveInt(String raw, int fallback) {
    try {
      int parsed = Integer.parseInt(raw == null ? "" : raw.trim());
      return parsed > 0 ? parsed : fallback;
    } catch (Exception exception) {
      return fallback;
    }
  }

  private static double percentile(List<Double> values, int percentile) {
    if (values.isEmpty()) {
      return 0.0d;
    }
    List<Double> sorted = values.stream().sorted().toList();
    int index = Math.max(0, Math.min(sorted.size() - 1, (int) Math.ceil((percentile / 100.0d) * sorted.size()) - 1));
    return round(sorted.get(index));
  }

  private static double round(double value) {
    return Math.round(value * 100.0d) / 100.0d;
  }

  private static double numberValue(Object value) {
    return value instanceof Number number ? number.doubleValue() : 0.0d;
  }

  private record RequestSample(int status, double elapsedMs, String cache) {
  }
}


