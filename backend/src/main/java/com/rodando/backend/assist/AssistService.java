package com.rodando.backend.assist;
import com.rodando.backend.core.RodandoService;
import com.rodando.backend.core.RateLimiterService;

import com.rodando.backend.common.ApiException;
import com.rodando.backend.common.JsonSupport;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class AssistService {

  private static final Set<String> SCOPES = Set.of("public", "owner");
  private static final Duration WRITE_WINDOW = Duration.ofMinutes(1);
  private static final int WRITE_LIMIT = 60;

  private final RodandoService service;
  private final JsonSupport jsonSupport;
  private final RateLimiterService rateLimiterService;

  public AssistService(
      RodandoService service,
      JsonSupport jsonSupport,
      RateLimiterService rateLimiterService) {
    this.service = service;
    this.jsonSupport = jsonSupport;
    this.rateLimiterService = rateLimiterService;
  }

  public Map<String, Object> listState(long userId, String rawScope) {
    String scope = normalizeScope(rawScope, true);
    List<Object> args = new ArrayList<>();
    args.add(userId);
    StringBuilder where = new StringBuilder("WHERE user_id = ?");
    if (scope != null) {
      where.append(" AND scope = ?");
      args.add(scope);
    }
    List<Map<String, Object>> items = service.many("""
        SELECT *
        FROM user_ux_assist_state
        """ + where + """
        ORDER BY updated_at DESC, id DESC
        """, args.toArray()).stream().map(this::mapStateRow).toList();
    return service.orderedMap("items", items);
  }

  public Map<String, Object> updateState(long userId, Map<String, Object> body) {
    RateLimiterService.Decision decision = rateLimiterService.check(
        "ux-assist",
        "ux-assist:" + userId,
        WRITE_WINDOW,
        WRITE_LIMIT);
    if (!decision.allowed()) {
      throw new ApiException(429, "Muitas atualizacoes de assistente. Tente novamente em instantes.");
    }

    String scope = normalizeScope(service.stringValue(body.get("scope")), false);
    String routeKey = service.trim(service.stringValue(body.get("routeKey"))).toLowerCase(Locale.ROOT);
    if (!routeKey.matches("^[a-z0-9][a-z0-9-_/]{1,79}$")) {
      throw new ApiException(400, "routeKey invalido.");
    }

    boolean hasChecklistPatch = body.containsKey("checklistState");
    boolean hasDismissedPatch = body.containsKey("dismissedTips");
    boolean hasOverlayPatch = body.containsKey("overlaySeen");
    if (!hasChecklistPatch && !hasDismissedPatch && !hasOverlayPatch) {
      throw new ApiException(400, "Nada para atualizar no estado assistivo.");
    }

    Map<String, Object> checklistPatch = hasChecklistPatch ? sanitizeChecklist(body.get("checklistState")) : Map.of();
    List<String> dismissedTipsPatch = hasDismissedPatch ? sanitizeDismissedTips(body.get("dismissedTips")) : List.of();
    if (hasOverlayPatch && !(body.get("overlaySeen") instanceof Boolean)) {
      throw new ApiException(400, "overlaySeen deve ser booleano.");
    }

    Map<String, Object> item = service.inTransaction(() -> {
      Optional<Map<String, Object>> currentRow = service.one("""
          SELECT *
          FROM user_ux_assist_state
          WHERE user_id = ? AND scope = ? AND route_key = ?
          LIMIT 1
          """, userId, scope, routeKey);
      Map<String, Object> currentChecklist = currentRow
          .map(row -> jsonSupport.readMap(row.get("checklist_state")))
          .orElseGet(LinkedHashMap::new);
      List<String> currentDismissed = currentRow
          .map(row -> sanitizeDismissedTips(jsonSupport.readList(row.get("dismissed_tips"))))
          .orElse(List.of());
      boolean currentOverlay = currentRow.map(row -> service.booleanValue(row.get("overlay_seen"))).orElse(false);

      LinkedHashMap<String, Object> mergedChecklist = new LinkedHashMap<>(currentChecklist);
      mergedChecklist.putAll(checklistPatch);
      LinkedHashSet<String> mergedDismissed = new LinkedHashSet<>(currentDismissed);
      mergedDismissed.addAll(dismissedTipsPatch);
      boolean overlaySeen = hasOverlayPatch ? service.booleanValue(body.get("overlaySeen")) : currentOverlay;

      Map<String, Object> row = service.one("""
          INSERT INTO user_ux_assist_state (
            user_id, scope, route_key, checklist_state, dismissed_tips, overlay_seen, updated_at
          )
          VALUES (?, ?, ?, ?::jsonb, ?::jsonb, ?, NOW())
          ON CONFLICT (user_id, scope, route_key)
          DO UPDATE SET
            checklist_state = EXCLUDED.checklist_state,
            dismissed_tips = EXCLUDED.dismissed_tips,
            overlay_seen = EXCLUDED.overlay_seen,
            updated_at = NOW()
          RETURNING *
          """,
          userId,
          scope,
          routeKey,
          service.json(mergedChecklist),
          service.json(List.copyOf(mergedDismissed)),
          overlaySeen)
          .orElseThrow(() -> new ApiException(500, "Falha ao atualizar estado assistivo."));
      return mapStateRow(row);
    });

    return service.orderedMap("item", item);
  }

  public Map<String, Object> resetState(long userId, String rawScope) {
    String scope = normalizeScope(rawScope, true);
    if (scope == null) {
      service.run("DELETE FROM user_ux_assist_state WHERE user_id = ?", userId);
    } else {
      service.run("DELETE FROM user_ux_assist_state WHERE user_id = ? AND scope = ?", userId, scope);
    }
    return service.orderedMap("ok", true, "scope", scope);
  }

  private String normalizeScope(String rawScope, boolean allowEmpty) {
    String scope = service.trim(rawScope).toLowerCase(Locale.ROOT);
    if (scope.isBlank()) {
      return allowEmpty ? null : invalidScope();
    }
    if (!SCOPES.contains(scope)) {
      return invalidScope();
    }
    return scope;
  }

  private String invalidScope() {
    throw new ApiException(400, "Scope invalido. Use public ou owner.");
  }

  private Map<String, Object> sanitizeChecklist(Object raw) {
    if (!(raw instanceof Map<?, ?> rawMap)) {
      throw new ApiException(400, "checklistState deve ser um objeto.");
    }
    LinkedHashMap<String, Object> sanitized = new LinkedHashMap<>();
    for (Map.Entry<?, ?> entry : ((Map<?, ?>) rawMap).entrySet()) {
      String key = service.trim(String.valueOf(entry.getKey())).toLowerCase(Locale.ROOT);
      if (!key.matches("^[a-z0-9][a-z0-9-_/]{1,79}$")) {
        throw new ApiException(400, "Checklist contem chave invalida.");
      }
      Object value = entry.getValue();
      if (!(value instanceof Boolean)) {
        throw new ApiException(400, "Checklist deve conter apenas valores booleanos.");
      }
      sanitized.put(key, value);
    }
    return sanitized;
  }

  private List<String> sanitizeDismissedTips(Object raw) {
    if (raw == null) {
      return List.of();
    }
    if (!(raw instanceof List<?> list)) {
      throw new ApiException(400, "dismissedTips deve ser uma lista.");
    }
    LinkedHashSet<String> items = new LinkedHashSet<>();
    for (Object item : list) {
      String value = service.trim(service.stringValue(item)).toLowerCase(Locale.ROOT);
      if (value.isBlank()) {
        continue;
      }
      if (!value.matches("^[a-z0-9][a-z0-9-_/]{1,79}$")) {
        throw new ApiException(400, "dismissedTips contem item invalido.");
      }
      items.add(value);
    }
    return List.copyOf(items);
  }

  private Map<String, Object> mapStateRow(Map<String, Object> row) {
    return service.orderedMap(
        "id", service.longValue(row.get("id")),
        "userId", service.longValue(row.get("user_id")),
        "scope", service.stringValue(row.get("scope")),
        "routeKey", service.stringValue(row.get("route_key")),
        "checklistState", jsonSupport.readMap(row.get("checklist_state")),
        "dismissedTips", sanitizeDismissedTips(jsonSupport.readList(row.get("dismissed_tips"))),
        "overlaySeen", service.booleanValue(row.get("overlay_seen")),
        "updatedAt", service.stringValue(row.get("updated_at")));
  }
}


