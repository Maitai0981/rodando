package com.rodando.backend.owner;
import com.rodando.backend.core.RodandoService;

import com.rodando.backend.common.ApiException;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class OwnerOfferService {

  private final RodandoService service;

  public OwnerOfferService(RodandoService service) {
    this.service = service;
  }

  public Map<String, Object> listOffers() {
    List<Map<String, Object>> items = service.many(ownerOfferSelectSql() + " ORDER BY o.updated_at DESC, o.id DESC").stream()
        .map(this::mapOwnerOfferRow)
        .toList();
    return service.orderedMap("items", items);
  }

  public Map<String, Object> createOffer(long ownerUserId, Map<String, Object> body) {
    Map<String, Object> value = validateOfferPayload(body);
    Map<String, Object> product = service.getProductById(service.longValue(value.get("productId")));
    if (product == null) {
      throw new ApiException(404, "Produto nao encontrado para oferta.");
    }
    if (service.decimalValue(value.get("compareAtPrice")).compareTo(service.decimalValue(product.get("price"))) <= 0) {
      throw new ApiException(400, "Preco comparativo deve ser maior que o preco atual do produto.");
    }
    try {
      long id = service.insertId("""
          INSERT INTO offers (product_id, badge, description, compare_at_price, is_active, starts_at, ends_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?::timestamptz, ?::timestamptz, NOW(), NOW())
          RETURNING id
          """,
          value.get("productId"),
          value.get("badge"),
          value.get("description"),
          value.get("compareAtPrice"),
          value.get("isActive"),
          value.get("startsAt"),
          value.get("endsAt"));
      Map<String, Object> item = getOfferById(id);
      service.saveOwnerAuditLog(ownerUserId, "offer_create", "offer", id, Map.of(), item);
      service.invalidateStorefrontCache(List.of("products:", "product-details:", "offers:", "catalog:"));
      return service.orderedMap("item", item);
    } catch (Exception exception) {
      if (service.stringValue(exception.getMessage()).toLowerCase(Locale.ROOT).contains("duplicate")) {
        throw new ApiException(409, "Este produto ja possui uma oferta.");
      }
      throw exception;
    }
  }

  public Map<String, Object> updateOffer(long ownerUserId, long id, Map<String, Object> body) {
    Map<String, Object> current = getOfferById(id);
    if (current == null) {
      throw new ApiException(404, "Oferta nao encontrada.");
    }
    Map<String, Object> value = validateOfferPayload(body);
    Map<String, Object> product = service.getProductById(service.longValue(value.get("productId")));
    if (product == null) {
      throw new ApiException(404, "Produto nao encontrado para oferta.");
    }
    if (service.decimalValue(value.get("compareAtPrice")).compareTo(service.decimalValue(product.get("price"))) <= 0) {
      throw new ApiException(400, "Preco comparativo deve ser maior que o preco atual do produto.");
    }
    try {
      Map<String, Object> item = service.one("""
          UPDATE offers
          SET product_id = ?, badge = ?, description = ?, compare_at_price = ?, is_active = ?, starts_at = ?::timestamptz,
              ends_at = ?::timestamptz, updated_at = NOW()
          WHERE id = ?
          RETURNING *
          """,
          value.get("productId"),
          value.get("badge"),
          value.get("description"),
          value.get("compareAtPrice"),
          value.get("isActive"),
          value.get("startsAt"),
          value.get("endsAt"),
          id)
          .map(ignored -> getOfferById(id))
          .orElseThrow(() -> new ApiException(404, "Oferta nao encontrada."));
      service.saveOwnerAuditLog(ownerUserId, "offer_update", "offer", id, current, item);
      service.invalidateStorefrontCache(List.of("products:", "product-details:", "offers:", "catalog:"));
      return service.orderedMap("item", item);
    } catch (Exception exception) {
      if (service.stringValue(exception.getMessage()).toLowerCase(Locale.ROOT).contains("duplicate")) {
        throw new ApiException(409, "Este produto ja possui uma oferta.");
      }
      throw exception;
    }
  }

  public void deleteOffer(long ownerUserId, long id) {
    Map<String, Object> current = getOfferById(id);
    if (current == null) {
      throw new ApiException(404, "Oferta nao encontrada.");
    }
    service.run("DELETE FROM offers WHERE id = ?", id);
    service.saveOwnerAuditLog(ownerUserId, "offer_delete", "offer", id, current, Map.of());
    service.invalidateStorefrontCache(List.of("products:", "product-details:", "offers:", "catalog:"));
  }

  public Map<String, Object> listShippingPromotions() {
    String now = service.nowIso();
    List<Map<String, Object>> items = service.many("""
        SELECT sp.*, p.name AS "productName", c.name AS "categoryName"
        FROM shipping_promotions sp
        LEFT JOIN products p ON p.id = sp.product_id
        LEFT JOIN categories c ON c.id = sp.category_id
        ORDER BY sp.is_active DESC, COALESCE(sp.ends_at, NOW() + INTERVAL '100 years') ASC, sp.id DESC
        """).stream().map(row -> mapShippingPromotionRow(row, now)).toList();
    return service.orderedMap("items", items);
  }

  public Map<String, Object> createShippingPromotion(Map<String, Object> body) {
    Map<String, Object> value = validateShippingPromotionPayload(body);
    Map<String, Object> row = service.one("""
        INSERT INTO shipping_promotions (
          name, scope, product_id, category_id, is_free_shipping, starts_at, ends_at, is_active, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?::timestamptz, ?::timestamptz, ?, NOW(), NOW())
        RETURNING *
        """,
        value.get("name"),
        value.get("scope"),
        value.get("productId"),
        value.get("categoryId"),
        value.get("isFreeShipping"),
        value.get("startsAt"),
        value.get("endsAt"),
        value.get("isActive"))
        .orElseThrow(() -> new ApiException(500, "Falha ao criar promocao."));
    return service.orderedMap("item", mapShippingPromotionRow(row, service.nowIso()));
  }

  public Map<String, Object> updateShippingPromotion(long id, Map<String, Object> body) {
    Map<String, Object> value = validateShippingPromotionPayload(body);
    Map<String, Object> row = service.one("""
        UPDATE shipping_promotions
        SET name = ?, scope = ?, product_id = ?, category_id = ?, is_free_shipping = ?, starts_at = ?::timestamptz,
            ends_at = ?::timestamptz, is_active = ?, updated_at = NOW()
        WHERE id = ?
        RETURNING *
        """,
        value.get("name"),
        value.get("scope"),
        value.get("productId"),
        value.get("categoryId"),
        value.get("isFreeShipping"),
        value.get("startsAt"),
        value.get("endsAt"),
        value.get("isActive"),
        id)
        .orElseThrow(() -> new ApiException(404, "Promocao nao encontrada."));
    return service.orderedMap("item", mapShippingPromotionRow(row, service.nowIso()));
  }

  public void deleteShippingPromotion(long id) {
    int removed = service.run("DELETE FROM shipping_promotions WHERE id = ?", id);
    if (removed == 0) {
      throw new ApiException(404, "Promocao nao encontrada.");
    }
  }

  private String ownerOfferSelectSql() {
    return """
        SELECT
          o.id,
          o.product_id AS "productId",
          o.badge,
          o.description,
          o.compare_at_price AS "compareAtPrice",
          o.is_active AS "isActive",
          o.starts_at AS "startsAt",
          o.ends_at AS "endsAt",
          o.created_at AS "createdAt",
          o.updated_at AS "updatedAt",
          p.name AS "productName",
          p.sku AS "productSku",
          pr.price AS "productPrice",
          st.quantity AS "productStock",
          p.is_active AS "productIsActive"
        FROM offers o
        JOIN products p ON p.id = o.product_id
        JOIN product_stocks st ON st.product_id = p.id
        JOIN LATERAL (
          SELECT pp.price
          FROM product_prices pp
          WHERE pp.product_id = p.id AND pp.valid_to IS NULL
          ORDER BY pp.valid_from DESC, pp.id DESC
          LIMIT 1
        ) pr ON TRUE
        """;
  }

  private Map<String, Object> getOfferById(long id) {
    return service.one(ownerOfferSelectSql() + " WHERE o.id = ? LIMIT 1", id).map(this::mapOwnerOfferRow).orElse(null);
  }

  private Map<String, Object> mapOwnerOfferRow(Map<String, Object> row) {
    double productPrice = service.doubleValue(row.get("productPrice"));
    double compareAtPrice = service.doubleValue(row.get("compareAtPrice"));
    double discountPercent = compareAtPrice > productPrice && compareAtPrice > 0
        ? Math.round(((compareAtPrice - productPrice) / compareAtPrice) * 100.0d)
        : 0.0d;
    return service.orderedMap(
        "id", service.longValue(row.get("id")),
        "productId", service.longValue(row.get("productId")),
        "badge", service.stringValue(row.get("badge")),
        "description", service.stringValue(row.get("description")),
        "compareAtPrice", service.decimalValue(row.get("compareAtPrice")),
        "isActive", service.booleanValue(row.get("isActive")),
        "startsAt", blankString(row.get("startsAt")),
        "endsAt", blankString(row.get("endsAt")),
        "createdAt", blankString(row.get("createdAt")),
        "updatedAt", blankString(row.get("updatedAt")),
        "productName", service.stringValue(row.get("productName")),
        "productSku", service.stringValue(row.get("productSku")),
        "productPrice", service.decimalValue(row.get("productPrice")),
        "productStock", service.intValue(row.get("productStock")),
        "productIsActive", service.booleanValue(row.get("productIsActive")),
        "discountPercent", discountPercent);
  }

  private Map<String, Object> validateOfferPayload(Map<String, Object> body) {
    long productId = service.longValue(body.get("productId"));
    if (productId <= 0) {
      throw new ApiException(400, "Produto invalido para oferta.");
    }
    String startsAt = parseOptionalTimestamp(body.get("startsAt"));
    String endsAt = parseOptionalTimestamp(body.get("endsAt"));
    validateDateRange(startsAt, endsAt, "Oferta");
    Map<String, Object> value = service.orderedMap(
        "productId", productId,
        "badge", defaultString(body.get("badge"), "Oferta"),
        "description", service.trim(service.stringValue(body.get("description"))),
        "compareAtPrice", service.decimalValue(body.get("compareAtPrice")),
        "isActive", body.get("isActive") == null || service.booleanValue(body.get("isActive")),
        "startsAt", startsAt,
        "endsAt", endsAt);
    if (service.decimalValue(value.get("compareAtPrice")).doubleValue() <= 0) {
      throw new ApiException(400, "Preco comparativo invalido.");
    }
    return value;
  }

  private Map<String, Object> validateShippingPromotionPayload(Map<String, Object> body) {
    String scope = service.normalize(service.stringValue(body.get("scope")));
    if (!Set.of("product", "category", "global").contains(scope)) {
      throw new ApiException(400, "Escopo de promocao invalido.");
    }
    Long productId = optionalLong(body.get("productId"));
    Long categoryId = optionalLong(body.get("categoryId"));
    if ("product".equals(scope) && productId == null) {
      throw new ApiException(400, "Promocao de produto exige productId.");
    }
    if ("category".equals(scope) && categoryId == null) {
      throw new ApiException(400, "Promocao de categoria exige categoryId.");
    }
    if (productId != null && service.getProductById(productId) == null) {
      throw new ApiException(404, "Produto nao encontrado.");
    }
    if (categoryId != null && service.one("SELECT id FROM categories WHERE id = ?", categoryId).isEmpty()) {
      throw new ApiException(404, "Categoria nao encontrada.");
    }
    String startsAt = parseOptionalTimestamp(body.get("startsAt"));
    String endsAt = parseOptionalTimestamp(body.get("endsAt"));
    validateDateRange(startsAt, endsAt, "Promocao");
    return service.orderedMap(
        "name", defaultString(body.get("name"), "Frete gratis"),
        "scope", scope,
        "productId", "product".equals(scope) ? productId : null,
        "categoryId", "category".equals(scope) ? categoryId : null,
        "isFreeShipping", body.get("isFreeShipping") == null || service.booleanValue(body.get("isFreeShipping")),
        "startsAt", startsAt,
        "endsAt", endsAt,
        "isActive", body.get("isActive") == null || service.booleanValue(body.get("isActive")));
  }

  private Map<String, Object> mapShippingPromotionRow(Map<String, Object> row, String now) {
    String startsAt = blankString(row.get("starts_at"));
    String endsAt = blankString(row.get("ends_at"));
    boolean running = service.booleanValue(row.get("is_active"));
    if (startsAt != null) {
      running = running && startsAt.compareTo(now) <= 0;
    }
    if (endsAt != null) {
      running = running && endsAt.compareTo(now) >= 0;
    }
    return service.orderedMap(
        "id", service.longValue(row.get("id")),
        "name", service.stringValue(row.get("name")),
        "scope", service.stringValue(row.get("scope")),
        "productId", optionalLong(row.get("product_id")),
        "productName", blankString(row.get("productName")),
        "categoryId", optionalLong(row.get("category_id")),
        "categoryName", blankString(row.get("categoryName")),
        "isFreeShipping", service.booleanValue(row.get("is_free_shipping")),
        "startsAt", startsAt,
        "endsAt", endsAt,
        "isActive", service.booleanValue(row.get("is_active")),
        "isRunning", running,
        "createdAt", blankString(row.get("created_at")),
        "updatedAt", blankString(row.get("updated_at")));
  }

  private String parseOptionalTimestamp(Object raw) {
    String value = service.trim(service.stringValue(raw));
    if (value.isBlank()) {
      return null;
    }
    try {
      return Instant.parse(value).toString();
    } catch (Exception exception) {
      throw new ApiException(400, "Data/hora invalida. Use formato ISO-8601.");
    }
  }

  private void validateDateRange(String startsAt, String endsAt, String entity) {
    if (startsAt != null && endsAt != null && Instant.parse(endsAt).isBefore(Instant.parse(startsAt))) {
      throw new ApiException(400, entity + " com periodo invalido.");
    }
  }

  private String defaultString(Object value, String fallback) {
    String text = service.trim(service.stringValue(value));
    return text.isBlank() ? fallback : text;
  }

  private Long optionalLong(Object value) {
    long parsed = service.longValue(value);
    return parsed > 0 ? parsed : null;
  }

  private String blankString(Object value) {
    String text = service.trim(service.stringValue(value));
    return text.isBlank() ? null : text;
  }
}


