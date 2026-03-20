package com.rodando.backend.ops;
import com.rodando.backend.core.RodandoService;
import com.rodando.backend.core.MetricsTracker;
import com.rodando.backend.core.RequestLogService;
import com.rodando.backend.core.OutboxService;

import com.zaxxer.hikari.HikariDataSource;
import com.rodando.backend.common.ApiException;
import com.rodando.backend.config.AppProperties;
import com.rodando.backend.config.EnvironmentValidator;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import javax.sql.DataSource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

@Service
public class OpsService {

  private final RodandoService service;
  private final AppProperties properties;
  private final EnvironmentValidator environmentValidator;
  private final MetricsTracker metricsTracker;
  private final RequestLogService requestLogService;
  private final OutboxService outboxService;
  private final DataSource dataSource;
  private final Map<String, SqlChallenge> sqlChallenges = new ConcurrentHashMap<>();

  public OpsService(
      RodandoService service,
      AppProperties properties,
      EnvironmentValidator environmentValidator,
      MetricsTracker metricsTracker,
      RequestLogService requestLogService,
      OutboxService outboxService,
      DataSource dataSource) {
    this.service = service;
    this.properties = properties;
    this.environmentValidator = environmentValidator;
    this.metricsTracker = metricsTracker;
    this.requestLogService = requestLogService;
    this.outboxService = outboxService;
    this.dataSource = dataSource;
  }

  public Resource opsIndex() {
    return new ClassPathResource("ops-ui/index.html");
  }

  public Resource opsAsset(String fileName) {
    return new ClassPathResource("ops-ui/" + fileName);
  }

  public Map<String, Object> health() {
    Map<String, Object> database = service.orderedMap("status", "ok");
    try {
      service.one("SELECT 1 AS ok");
    } catch (Exception exception) {
      database = service.orderedMap("status", "degraded");
    }
    Map<String, Object> pool = service.orderedMap("total", 0, "idle", 0, "waiting", 0);
    if (dataSource instanceof HikariDataSource hikari) {
      pool = service.orderedMap(
          "total", hikari.getHikariPoolMXBean().getTotalConnections(),
          "idle", hikari.getHikariPoolMXBean().getIdleConnections(),
          "waiting", hikari.getHikariPoolMXBean().getThreadsAwaitingConnection());
    }
    return service.orderedMap(
        "status", "ok".equals(database.get("status")) ? "ok" : "degraded",
        "timestamp", service.nowIso(),
        "database", database,
        "pool", pool);
  }

  public Map<String, Object> ready() {
    EnvironmentValidator.ValidationResult validation = environmentValidator.validate(properties);
    Map<String, Object> environment = service.orderedMap(
        "status", validation.ok() ? "ok" : "error",
        "appEnv", validation.appEnv(),
        "issues", validation.issues());
    Map<String, Object> database = service.orderedMap("status", "ok");
    try {
      service.one("SELECT 1 AS ok");
    } catch (Exception exception) {
      database = service.orderedMap("status", "error", "reason", "database_unavailable");
    }
    Map<String, Object> outbox = outboxService.runtimeSnapshot(properties.outboxPollIntervalMs());
    boolean hasHardFailure = !"ok".equals(environment.get("status")) || !"ok".equals(database.get("status"));
    return service.orderedMap(
        "status", hasHardFailure ? "not_ready" : "ready",
        "timestamp", service.nowIso(),
        "checks", service.orderedMap(
            "environment", environment,
            "database", database,
            "outbox", service.orderedMap(
                "status", outbox.get("lastError") == null ? "ok" : "degraded",
                "pollIntervalMs", outbox.get("pollIntervalMs"),
                "running", outbox.get("running"),
                "lastRunAt", outbox.get("lastRunAt"),
                "lastSuccessAt", outbox.get("lastSuccessAt"),
                "lastError", outbox.get("lastError"),
                "queue", ((Map<?, ?>) outbox.get("queue")))));
  }

  public Map<String, Object> metrics() {
    Map<String, Object> payload = new LinkedHashMap<>(metricsTracker.snapshot());
    Map<String, Long> byStatus = new LinkedHashMap<>();
    requestLogService.snapshot().forEach(entry ->
        byStatus.merge(String.valueOf(entry.status()), 1L, (left, right) -> left + right));
    @SuppressWarnings("unchecked")
    Map<String, Object> existingRequests = (Map<String, Object>) payload.getOrDefault("requests", Map.of());
    Map<String, Object> requests = new LinkedHashMap<>(existingRequests);
    requests.put("byStatus", byStatus);
    payload.put("requests", requests);
    payload.put("status", "ok");
    payload.put("generatedAt", service.nowIso());
    payload.put("cachePolicyPublicRead", "public, max-age=45");
    payload.put("outbox", outboxService.runtimeSnapshot(properties.outboxPollIntervalMs()));
    return payload;
  }

  public Map<String, Object> listRequests(Map<String, String> query) {
    List<RequestLogService.RequestLogEntry> filtered = requestLogService.snapshot().stream()
        .filter(item -> matchesRequest(item, query))
        .sorted(Comparator.comparingLong(RequestLogService.RequestLogEntry::ts).reversed())
        .limit(clamp(query.get("limit"), 100, 1, 500))
        .toList();
    List<Map<String, Object>> items = filtered.stream().map(item -> service.orderedMap(
        "ts", java.time.Instant.ofEpochMilli(item.ts()).toString(),
        "requestId", item.requestId(),
        "method", item.method(),
        "path", item.path(),
        "routeKey", item.routeKey(),
        "status", item.status(),
        "durationMs", item.durationMs(),
        "userId", item.userId(),
        "queryMasked", item.queryMasked(),
        "bodyMasked", item.bodyMasked())).toList();
    return service.orderedMap(
        "items", items,
        "meta", service.orderedMap(
            "total", filtered.size(),
            "bufferSize", requestLogService.size()));
  }

  public Map<String, Object> listTables() {
    List<Map<String, Object>> items = service.many("""
        SELECT
          t.tablename AS name,
          COALESCE(s.n_live_tup, 0)::bigint AS "rowEstimate",
          pg_size_pretty(pg_total_relation_size(format('%I.%I', 'public', t.tablename)::regclass)) AS "sizePretty"
        FROM pg_tables t
        LEFT JOIN pg_stat_user_tables s ON s.relname = t.tablename
        WHERE t.schemaname = 'public'
        ORDER BY t.tablename ASC
        """).stream().map(row -> service.orderedMap(
            "name", service.stringValue(row.get("name")),
            "rowEstimate", service.longValue(row.get("rowEstimate")),
            "sizePretty", service.stringValue(row.get("sizePretty")))).toList();
    return service.orderedMap("items", items);
  }

  public Map<String, Object> previewTable(String table, Map<String, String> query) {
    String safeTable = validateIdentifier(table, "Tabela invalida.");
    List<Map<String, Object>> columns = service.many("""
        SELECT column_name AS name, data_type AS type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ?
        ORDER BY ordinal_position ASC
        """, safeTable);
    if (columns.isEmpty()) {
      throw new ApiException(404, "Tabela nao encontrada.");
    }
    int limit = clamp(query.get("limit"), 50, 1, 200);
    int offset = clamp(query.get("offset"), 0, 0, 1_000_000);
    String order = "asc".equalsIgnoreCase(query.get("order")) ? "asc" : "desc";
    String defaultOrderBy = columns.stream()
        .map(column -> service.stringValue(column.get("name")))
        .filter(name -> List.of("updated_at", "created_at", "id").contains(name))
        .findFirst()
        .orElse(service.stringValue(columns.getFirst().get("name")));
    String orderBy = query.get("orderBy") == null || query.get("orderBy").isBlank()
        ? defaultOrderBy
        : validateColumn(columns, query.get("orderBy"));
    List<Map<String, Object>> rows = service.many(
        "SELECT * FROM public." + safeTable + " ORDER BY " + orderBy + " " + order + " LIMIT " + limit + " OFFSET " + offset);
    Map<String, Object> meta = service.one("""
        SELECT COALESCE(n_live_tup, 0)::bigint AS "rowEstimate"
        FROM pg_stat_user_tables
        WHERE schemaname = 'public' AND relname = ?
        LIMIT 1
        """, safeTable).orElse(Map.of("rowEstimate", 0));
    return service.orderedMap(
        "table", safeTable,
        "columns", columns,
        "rows", rows,
        "meta", service.orderedMap(
            "rowEstimate", service.longValue(meta.get("rowEstimate")),
            "nextOffset", offset + rows.size()));
  }

  public Map<String, Object> createSqlChallenge(String sql) {
    if (service.trim(sql).isBlank()) {
      throw new ApiException(400, "Informe um SQL antes de gerar desafio.");
    }
    String challengeId = UUID.randomUUID().toString();
    String phrase = "confirmar " + challengeId.substring(0, 8);
    sqlChallenges.put(challengeId, new SqlChallenge(challengeId, phrase, System.currentTimeMillis() + 5 * 60_000L));
    return service.orderedMap("challengeId", challengeId, "phrase", phrase);
  }

  public Map<String, Object> executeSql(long ownerUserId, Map<String, Object> body) {
    String sql = service.trim(service.stringValue(body.get("sql")));
    if (sql.isBlank()) {
      throw new ApiException(400, "Informe um SQL para executar.");
    }
    if (properties.productionLike()) {
      String challengeId = service.stringValue(body.get("challengeId"));
      String phrase = service.trim(service.stringValue(body.get("phrase")));
      SqlChallenge challenge = sqlChallenges.get(challengeId);
      if (challenge == null || challenge.expiresAt() < System.currentTimeMillis() || !challenge.phrase().equals(phrase)) {
        throw new ApiException(400, "Confirmacao dupla obrigatoria para este ambiente.");
      }
      sqlChallenges.remove(challengeId);
    }
    long startedAt = System.nanoTime();
    try (Connection connection = dataSource.getConnection(); Statement statement = connection.createStatement()) {
      statement.setMaxRows(2_000);
      boolean hasResultSet = statement.execute(sql);
      long durationMs = Math.round((System.nanoTime() - startedAt) / 1_000_000.0d);
      Map<String, Object> payload;
      if (hasResultSet) {
        try (ResultSet rs = statement.getResultSet()) {
          payload = mapResultSet(rs, durationMs);
        }
      } else {
        payload = service.orderedMap(
            "command", sqlCommand(sql),
            "rowCount", statement.getUpdateCount(),
            "executionMs", durationMs,
            "truncated", false,
            "notices", List.of(),
            "columns", List.of(),
            "rows", List.of());
      }
      service.saveOwnerAuditLog(ownerUserId, "ops_sql_execute", "ops_sql", null,
          Map.of("sql", sql),
          Map.of("command", payload.get("command"), "rowCount", payload.get("rowCount")));
      return payload;
    } catch (ApiException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new ApiException(400, exception.getMessage());
    }
  }

  private Map<String, Object> mapResultSet(ResultSet rs, long durationMs) throws Exception {
    ResultSetMetaData meta = rs.getMetaData();
    List<String> columnNames = new ArrayList<>();
    List<Map<String, Object>> columnDefs = new ArrayList<>();
    for (int index = 1; index <= meta.getColumnCount(); index += 1) {
      columnNames.add(meta.getColumnLabel(index));
      columnDefs.add(service.orderedMap("name", meta.getColumnLabel(index), "type", meta.getColumnTypeName(index)));
    }
    List<Map<String, Object>> rows = new ArrayList<>();
    while (rs.next()) {
      LinkedHashMap<String, Object> row = new LinkedHashMap<>();
      for (String columnName : columnNames) {
        row.put(columnName, rs.getObject(columnName));
      }
      rows.add(row);
    }
    return service.orderedMap(
        "command", "select",
        "rowCount", rows.size(),
        "executionMs", durationMs,
        "truncated", false,
        "notices", List.of(),
        "columns", columnDefs,
        "rows", rows);
  }

  private boolean matchesRequest(RequestLogService.RequestLogEntry item, Map<String, String> query) {
    String q = service.normalize(query.get("q"));
    if (!q.isBlank()) {
      String haystack = (item.requestId() + " " + item.path() + " " + item.routeKey() + " " + item.userId()).toLowerCase(Locale.ROOT);
      if (!haystack.contains(q)) {
        return false;
      }
    }
    String route = service.normalize(query.get("route"));
    if (!route.isBlank() && !service.normalize(item.path()).contains(route)) {
      return false;
    }
    String method = service.normalize(query.get("method"));
    if (!method.isBlank() && !method.equals(service.normalize(item.method()))) {
      return false;
    }
    int statusMin = clamp(query.get("statusMin"), 100, 100, 599);
    int statusMax = clamp(query.get("statusMax"), 599, 100, 599);
    return item.status() >= statusMin && item.status() <= statusMax;
  }

  private String validateIdentifier(String value, String message) {
    String normalized = service.trim(value);
    if (!normalized.matches("^[a-zA-Z_][a-zA-Z0-9_]*$")) {
      throw new ApiException(400, message);
    }
    return normalized;
  }

  private String validateColumn(List<Map<String, Object>> columns, String value) {
    String normalized = validateIdentifier(value, "Coluna invalida.");
    boolean exists = columns.stream().anyMatch(column -> normalized.equals(service.stringValue(column.get("name"))));
    if (!exists) {
      throw new ApiException(400, "Coluna invalida.");
    }
    return normalized;
  }

  private int clamp(String raw, int fallback, int min, int max) {
    try {
      return Math.max(min, Math.min(max, Integer.parseInt(service.trim(raw))));
    } catch (Exception exception) {
      return fallback;
    }
  }

  private String sqlCommand(String sql) {
    String normalized = service.trim(sql).toLowerCase(Locale.ROOT);
    int separator = normalized.indexOf(' ');
    return separator > 0 ? normalized.substring(0, separator) : normalized;
  }

  private record SqlChallenge(String id, String phrase, long expiresAt) {
  }
}


