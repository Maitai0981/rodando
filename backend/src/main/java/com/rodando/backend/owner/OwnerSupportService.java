package com.rodando.backend.owner;
import com.rodando.backend.core.RodandoService;

import com.rodando.backend.common.ApiException;
import com.rodando.backend.common.JsonSupport;
import com.rodando.backend.config.AppProperties;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class OwnerSupportService {

  private static final Set<String> IMAGE_MIME_TYPES = Set.of(
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif");

  private final RodandoService service;
  private final AppProperties properties;
  private final JsonSupport jsonSupport;

  public OwnerSupportService(RodandoService service, AppProperties properties, JsonSupport jsonSupport) {
    this.service = service;
    this.properties = properties;
    this.jsonSupport = jsonSupport;
  }

  public Map<String, Object> orderAnalytics(String rawPeriod) {
    String period = service.normalize(rawPeriod);
    int days = switch (period) {
      case "day" -> 1;
      case "week" -> 7;
      default -> 30;
    };
    Map<String, Object> metrics = service.one("""
        SELECT
          COUNT(*)::int AS "ordersCount",
          COALESCE(SUM(total), 0)::numeric(12,2) AS revenue,
          COALESCE(AVG(total), 0)::numeric(12,2) AS "ticketAverage",
          COUNT(*) FILTER (WHERE payment_status = 'paid')::int AS "paidCount",
          COUNT(*) FILTER (WHERE status = 'cancelled')::int AS "cancelledCount"
        FROM orders
        WHERE created_at >= NOW() - (?::text || ' days')::interval
        """, String.valueOf(days)).orElse(Map.of());
    List<Map<String, Object>> byCity = service.many("""
        SELECT COALESCE(delivery_city, 'Nao informado') AS city, COUNT(*)::int AS total
        FROM orders
        WHERE created_at >= NOW() - (?::text || ' days')::interval
        GROUP BY 1
        ORDER BY total DESC
        LIMIT 8
        """, String.valueOf(days)).stream().map(row -> service.orderedMap(
            "city", service.stringValue(row.get("city")),
            "total", service.intValue(row.get("total")))).toList();
    List<Map<String, Object>> byMethod = service.many("""
        SELECT COALESCE(delivery_method, 'pickup') AS method, COUNT(*)::int AS total
        FROM orders
        WHERE created_at >= NOW() - (?::text || ' days')::interval
        GROUP BY 1
        ORDER BY total DESC
        """, String.valueOf(days)).stream().map(row -> service.orderedMap(
            "method", service.stringValue(row.get("method")),
            "total", service.intValue(row.get("total")))).toList();
    return service.orderedMap(
        "periodDays", days,
        "metrics", service.orderedMap(
            "ordersCount", service.intValue(metrics.get("ordersCount")),
            "revenue", service.decimalValue(metrics.get("revenue")),
            "ticketAverage", service.decimalValue(metrics.get("ticketAverage")),
            "paidCount", service.intValue(metrics.get("paidCount")),
            "cancelledCount", service.intValue(metrics.get("cancelledCount"))),
        "byCity", byCity,
        "byMethod", byMethod);
  }

  public Map<String, Object> listReturns(String rawStatus, Long productId, Integer limit) {
    String status = service.normalize(rawStatus);
    int safeLimit = clamp(limit, 40, 1, 200);
    List<Object> args = new ArrayList<>();
    StringBuilder where = new StringBuilder();
    if (!status.isBlank()) {
      appendWhere(where, args, "pr.status = ?", status);
    }
    if (productId != null && productId > 0) {
      appendWhere(where, args, "pr.product_id = ?", productId);
    }
    args.add(safeLimit);
    List<Map<String, Object>> items = service.many("""
        SELECT
          pr.id,
          pr.product_id AS "productId",
          p.name AS "productName",
          p.sku AS "productSku",
          pr.order_id AS "orderId",
          pr.user_id AS "userId",
          pr.quantity,
          pr.reason_code AS "reasonCode",
          COALESCE(rrc.label, 'Sem motivo') AS "reasonLabel",
          pr.reason_detail AS "reasonDetail",
          pr.status,
          pr.owner_notes AS "ownerNotes",
          pr.created_at AS "createdAt",
          pr.updated_at AS "updatedAt",
          pr.resolved_at AS "resolvedAt"
        FROM product_returns pr
        JOIN products p ON p.id = pr.product_id
        LEFT JOIN return_reason_catalog rrc ON rrc.code = pr.reason_code
        """ + (where.isEmpty() ? "" : " " + where) + """
        ORDER BY pr.created_at DESC, pr.id DESC
        LIMIT ?
        """, args.toArray()).stream().map(this::mapReturnRow).toList();
    return service.orderedMap("items", items);
  }

  public Map<String, Object> createReturn(long ownerUserId, Map<String, Object> body) {
    long productId = service.longValue(body.get("productId"));
    int quantity = Math.max(1, service.intValue(body.get("quantity")));
    String reasonCode = defaultString(body.get("reasonCode"), "other").toLowerCase(Locale.ROOT);
    String reasonDetail = service.trim(service.stringValue(body.get("reasonDetail")));
    Long orderId = optionalLong(body.get("orderId"));
    Long userId = optionalLong(body.get("userId"));
    if (productId <= 0) {
      throw new ApiException(400, "Produto invalido para devolucao.");
    }
    if (service.one("SELECT code FROM return_reason_catalog WHERE code = ?", reasonCode).isEmpty()) {
      throw new ApiException(400, "Motivo de devolucao invalido.");
    }
    long id = service.insertId("""
        INSERT INTO product_returns (
          order_id, product_id, user_id, quantity, reason_code, reason_detail, status, owner_notes, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'open', '', NOW(), NOW())
        RETURNING id
        """, orderId, productId, userId, quantity, reasonCode, reasonDetail);
    Map<String, Object> item = fetchReturn(id);
    service.saveOwnerAuditLog(ownerUserId, "return_create", "product_return", id, Map.of(), item);
    return service.orderedMap("item", item);
  }

  public Map<String, Object> updateReturn(long ownerUserId, long id, Map<String, Object> body) {
    Map<String, Object> current = service.one("SELECT * FROM product_returns WHERE id = ? LIMIT 1", id)
        .orElseThrow(() -> new ApiException(404, "Devolucao nao encontrada."));
    String status = service.normalize(service.stringValue(body.get("status")));
    if (!Set.of("open", "in_review", "approved", "rejected", "resolved").contains(status)) {
      throw new ApiException(400, "Status de devolucao invalido.");
    }
    String ownerNotes = service.trim(service.stringValue(body.get("ownerNotes")));
    String resolvedAt = "resolved".equals(status) ? service.nowIso() : null;
    service.run("""
        UPDATE product_returns
        SET status = ?, owner_notes = ?, updated_at = NOW(), resolved_at = ?::timestamptz
        WHERE id = ?
        """, status, ownerNotes, resolvedAt, id);
    Map<String, Object> item = fetchReturn(id);
    service.saveOwnerAuditLog(ownerUserId, "return_update", "product_return", id, current, item);
    return service.orderedMap("item", item);
  }

  public Map<String, Object> listComplaints(String rawStatus, Long productId, Integer limit) {
    String status = service.normalize(rawStatus);
    int safeLimit = clamp(limit, 40, 1, 200);
    List<Object> args = new ArrayList<>();
    StringBuilder where = new StringBuilder();
    if (!status.isBlank()) {
      appendWhere(where, args, "cc.status = ?", status);
    }
    if (productId != null && productId > 0) {
      appendWhere(where, args, "cc.product_id = ?", productId);
    }
    args.add(safeLimit);
    List<Map<String, Object>> items = service.many("""
        SELECT
          cc.id,
          cc.user_id AS "userId",
          cc.product_id AS "productId",
          p.name AS "productName",
          p.sku AS "productSku",
          cc.order_id AS "orderId",
          cc.title,
          cc.message,
          cc.severity,
          cc.status,
          cc.owner_notes AS "ownerNotes",
          cc.created_at AS "createdAt",
          cc.updated_at AS "updatedAt",
          cc.resolved_at AS "resolvedAt"
        FROM customer_complaints cc
        LEFT JOIN products p ON p.id = cc.product_id
        """ + (where.isEmpty() ? "" : " " + where) + """
        ORDER BY cc.created_at DESC, cc.id DESC
        LIMIT ?
        """, args.toArray()).stream().map(this::mapComplaintRow).toList();
    return service.orderedMap("items", items);
  }

  public Map<String, Object> createComplaint(long ownerUserId, Map<String, Object> body) {
    Long productId = optionalLong(body.get("productId"));
    Long userId = optionalLong(body.get("userId"));
    Long orderId = optionalLong(body.get("orderId"));
    String title = service.trim(service.stringValue(body.get("title")));
    String message = service.trim(service.stringValue(body.get("message")));
    String severity = defaultString(body.get("severity"), "medium").toLowerCase(Locale.ROOT);
    if (title.length() < 3) {
      throw new ApiException(400, "Titulo da reclamacao invalido.");
    }
    if (message.length() < 6) {
      throw new ApiException(400, "Mensagem da reclamacao invalida.");
    }
    if (!Set.of("low", "medium", "high").contains(severity)) {
      throw new ApiException(400, "Severidade invalida.");
    }
    long id = service.insertId("""
        INSERT INTO customer_complaints (
          user_id, product_id, order_id, title, message, severity, status, owner_notes, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'open', '', NOW(), NOW())
        RETURNING id
        """, userId, productId, orderId, title, message, severity);
    Map<String, Object> item = fetchComplaint(id);
    service.saveOwnerAuditLog(ownerUserId, "complaint_create", "customer_complaint", id, Map.of(), item);
    return service.orderedMap("item", item);
  }

  public Map<String, Object> updateComplaint(long ownerUserId, long id, Map<String, Object> body) {
    Map<String, Object> current = service.one("SELECT * FROM customer_complaints WHERE id = ? LIMIT 1", id)
        .orElseThrow(() -> new ApiException(404, "Reclamacao nao encontrada."));
    String status = service.normalize(service.stringValue(body.get("status")));
    if (!Set.of("open", "in_progress", "resolved", "closed").contains(status)) {
      throw new ApiException(400, "Status de reclamacao invalido.");
    }
    String ownerNotes = service.trim(service.stringValue(body.get("ownerNotes")));
    String resolvedAt = Set.of("resolved", "closed").contains(status) ? service.nowIso() : null;
    service.run("""
        UPDATE customer_complaints
        SET status = ?, owner_notes = ?, updated_at = NOW(), resolved_at = ?::timestamptz
        WHERE id = ?
        """, status, ownerNotes, resolvedAt, id);
    Map<String, Object> item = fetchComplaint(id);
    service.saveOwnerAuditLog(ownerUserId, "complaint_update", "customer_complaint", id, current, item);
    return service.orderedMap("item", item);
  }

  public Map<String, Object> listAuditLogs(Integer limit) {
    int safeLimit = clamp(limit, 50, 1, 300);
    List<Map<String, Object>> items = service.many("""
        SELECT
          l.id,
          l.owner_user_id AS "ownerUserId",
          u.name AS "ownerName",
          l.action_type AS "actionType",
          l.entity_type AS "entityType",
          l.entity_id AS "entityId",
          l.before_json AS "before",
          l.after_json AS "after",
          l.created_at AS "createdAt"
        FROM owner_audit_logs l
        JOIN users u ON u.id = l.owner_user_id
        ORDER BY l.created_at DESC, l.id DESC
        LIMIT ?
        """, safeLimit).stream().map(row -> service.orderedMap(
            "id", service.longValue(row.get("id")),
            "ownerUserId", service.longValue(row.get("ownerUserId")),
            "ownerName", service.stringValue(row.get("ownerName")),
            "actionType", service.stringValue(row.get("actionType")),
            "entityType", service.stringValue(row.get("entityType")),
            "entityId", optionalLong(row.get("entityId")),
            "before", jsonSupport.readMap(row.get("before")),
            "after", jsonSupport.readMap(row.get("after")),
            "createdAt", service.stringValue(row.get("createdAt"))))
        .toList();
    return service.orderedMap("items", items);
  }

  public Map<String, Object> uploadImage(long ownerUserId, MultipartFile image, String publicBaseUrl) {
    if (image == null || image.isEmpty()) {
      throw new ApiException(400, "Nenhuma imagem enviada.");
    }
    String mimeType = service.trim(image.getContentType()).toLowerCase(Locale.ROOT);
    if (!IMAGE_MIME_TYPES.contains(mimeType)) {
      throw new ApiException(400, "Arquivo invalido. Envie JPG, PNG, WebP, GIF ou AVIF.");
    }
    if (image.getSize() > properties.uploadMaxBytes()) {
      throw new ApiException(400, "Imagem excede o limite de tamanho permitido.");
    }
    String fileName = System.currentTimeMillis() + "-" + UUID.randomUUID().toString().replace("-", "") + resolveExtension(image, mimeType);
    Path uploadPath = Path.of("uploads", fileName);
    try (InputStream input = image.getInputStream()) {
      Files.createDirectories(uploadPath.getParent());
      Files.copy(input, uploadPath, StandardCopyOption.REPLACE_EXISTING);
    } catch (Exception exception) {
      throw new ApiException(500, "Falha ao enviar imagem.");
    }
    String storageKey = "/uploads/" + fileName;
    String publicUrl = publicBaseUrl.replaceAll("/+$", "") + storageKey;
    Map<String, Object> row = service.one("""
        INSERT INTO media_assets (
          owner_user_id, storage_key, public_url, original_name, mime_type, size_bytes, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, NOW())
        RETURNING id, owner_user_id AS "ownerUserId", storage_key AS "storageKey", public_url AS "publicUrl",
                  original_name AS "originalName", mime_type AS "mimeType", size_bytes AS "sizeBytes", created_at AS "createdAt"
        """,
        ownerUserId,
        storageKey,
        publicUrl,
        service.stringValue(image.getOriginalFilename()),
        mimeType,
        image.getSize())
        .orElseThrow(() -> new ApiException(500, "Falha ao registrar imagem enviada."));
    return service.orderedMap("item", service.orderedMap(
        "id", service.longValue(row.get("id")),
        "ownerUserId", service.longValue(row.get("ownerUserId")),
        "storageKey", service.stringValue(row.get("storageKey")),
        "publicUrl", service.stringValue(row.get("publicUrl")),
        "originalName", service.stringValue(row.get("originalName")),
        "mimeType", service.stringValue(row.get("mimeType")),
        "sizeBytes", service.longValue(row.get("sizeBytes")),
        "createdAt", service.stringValue(row.get("createdAt"))));
  }

  private Map<String, Object> fetchReturn(long id) {
    return service.one("""
        SELECT
          pr.id,
          pr.product_id AS "productId",
          p.name AS "productName",
          p.sku AS "productSku",
          pr.order_id AS "orderId",
          pr.user_id AS "userId",
          pr.quantity,
          pr.reason_code AS "reasonCode",
          COALESCE(rrc.label, 'Sem motivo') AS "reasonLabel",
          pr.reason_detail AS "reasonDetail",
          pr.status,
          pr.owner_notes AS "ownerNotes",
          pr.created_at AS "createdAt",
          pr.updated_at AS "updatedAt",
          pr.resolved_at AS "resolvedAt"
        FROM product_returns pr
        JOIN products p ON p.id = pr.product_id
        LEFT JOIN return_reason_catalog rrc ON rrc.code = pr.reason_code
        WHERE pr.id = ?
        LIMIT 1
        """, id).map(this::mapReturnRow).orElseThrow(() -> new ApiException(404, "Devolucao nao encontrada."));
  }

  private Map<String, Object> mapReturnRow(Map<String, Object> row) {
    return service.orderedMap(
        "id", service.longValue(row.get("id")),
        "productId", service.longValue(row.get("productId")),
        "productName", service.stringValue(row.get("productName")),
        "productSku", service.stringValue(row.get("productSku")),
        "orderId", optionalLong(row.get("orderId")),
        "userId", optionalLong(row.get("userId")),
        "quantity", service.intValue(row.get("quantity")),
        "reasonCode", blankString(row.get("reasonCode")),
        "reasonLabel", service.stringValue(row.get("reasonLabel")),
        "reasonDetail", service.stringValue(row.get("reasonDetail")),
        "status", service.stringValue(row.get("status")),
        "ownerNotes", service.stringValue(row.get("ownerNotes")),
        "createdAt", blankString(row.get("createdAt")),
        "updatedAt", blankString(row.get("updatedAt")),
        "resolvedAt", blankString(row.get("resolvedAt")));
  }

  private Map<String, Object> fetchComplaint(long id) {
    return service.one("""
        SELECT
          cc.id,
          cc.user_id AS "userId",
          cc.product_id AS "productId",
          p.name AS "productName",
          p.sku AS "productSku",
          cc.order_id AS "orderId",
          cc.title,
          cc.message,
          cc.severity,
          cc.status,
          cc.owner_notes AS "ownerNotes",
          cc.created_at AS "createdAt",
          cc.updated_at AS "updatedAt",
          cc.resolved_at AS "resolvedAt"
        FROM customer_complaints cc
        LEFT JOIN products p ON p.id = cc.product_id
        WHERE cc.id = ?
        LIMIT 1
        """, id).map(this::mapComplaintRow).orElseThrow(() -> new ApiException(404, "Reclamacao nao encontrada."));
  }

  private Map<String, Object> mapComplaintRow(Map<String, Object> row) {
    return service.orderedMap(
        "id", service.longValue(row.get("id")),
        "userId", optionalLong(row.get("userId")),
        "productId", optionalLong(row.get("productId")),
        "productName", blankString(row.get("productName")),
        "productSku", blankString(row.get("productSku")),
        "orderId", optionalLong(row.get("orderId")),
        "title", service.stringValue(row.get("title")),
        "message", service.stringValue(row.get("message")),
        "severity", service.stringValue(row.get("severity")),
        "status", service.stringValue(row.get("status")),
        "ownerNotes", service.stringValue(row.get("ownerNotes")),
        "createdAt", blankString(row.get("createdAt")),
        "updatedAt", blankString(row.get("updatedAt")),
        "resolvedAt", blankString(row.get("resolvedAt")));
  }

  private void appendWhere(StringBuilder where, List<Object> args, String clause, Object value) {
    if (where.isEmpty()) {
      where.append("WHERE ");
    } else {
      where.append(" AND ");
    }
    where.append(clause);
    args.add(value);
  }

  private int clamp(Integer value, int fallback, int min, int max) {
    int safe = value == null ? fallback : value;
    return Math.max(min, Math.min(max, safe));
  }

  private Long optionalLong(Object value) {
    long parsed = service.longValue(value);
    return parsed > 0 ? parsed : null;
  }

  private String defaultString(Object value, String fallback) {
    String text = service.trim(service.stringValue(value));
    return text.isBlank() ? fallback : text;
  }

  private String blankString(Object value) {
    String text = service.trim(service.stringValue(value));
    return text.isBlank() ? null : text;
  }

  private String resolveExtension(MultipartFile image, String mimeType) {
    return switch (mimeType) {
      case "image/png" -> ".png";
      case "image/webp" -> ".webp";
      case "image/gif" -> ".gif";
      case "image/avif" -> ".avif";
      default -> {
        String name = service.trim(image.getOriginalFilename()).toLowerCase(Locale.ROOT);
        if (name.endsWith(".jpeg")) yield ".jpg";
        if (name.endsWith(".png")) yield ".png";
        if (name.endsWith(".webp")) yield ".webp";
        if (name.endsWith(".gif")) yield ".gif";
        if (name.endsWith(".avif")) yield ".avif";
        yield ".jpg";
      }
    };
  }
}


