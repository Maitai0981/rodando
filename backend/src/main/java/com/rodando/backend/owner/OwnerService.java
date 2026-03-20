package com.rodando.backend.owner;
import com.rodando.backend.core.RodandoService;
import com.rodando.backend.core.StoreDefaults;

import com.rodando.backend.common.ApiException;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.postgresql.util.PSQLException;
import org.springframework.stereotype.Service;

@Service
public class OwnerService {

  private final RodandoService service;

  public OwnerService(RodandoService service) {
    this.service = service;
  }

  public Map<String, Object> dashboard(Map<String, String> query) {
    int page = clamp(query.get("page"), 1, 1, 10_000);
    int pageSize = clamp(query.get("pageSize"), 20, 1, 120);
    Map<String, Object> result = service.listOwnerProductsDashboard(query.get("q"), page, pageSize);
    int total = service.intValue(result.get("total"));
    long activeProducts = service.longValue(result.get("active"));
    long outOfStock = service.longValue(result.get("outOfStock"));
    int safePage = service.intValue(result.get("safePage"));
    int totalPages = service.intValue(result.get("totalPages"));
    @SuppressWarnings("unchecked")
    List<Map<String, Object>> paged = (List<Map<String, Object>>) result.get("items");
    @SuppressWarnings("unchecked")
    List<String> categories = (List<String>) result.get("categories");
    @SuppressWarnings("unchecked")
    List<String> manufacturers = (List<String>) result.get("manufacturers");
    return service.orderedMap(
        "filters", service.orderedMap(
            "q", query.get("q"),
            "page", safePage,
            "pageSize", pageSize),
        "metrics", service.orderedMap(
            "totalProducts", total,
            "activeProducts", activeProducts,
            "inactiveProducts", total - activeProducts,
            "outOfStockProducts", outOfStock),
        "facets", service.orderedMap(
            "categories", categories,
            "manufacturers", manufacturers,
            "statuses", List.of("active", "inactive", "out-of-stock")),
        "products", service.orderedMap(
            "items", paged,
            "meta", service.orderedMap(
                "page", safePage,
                "pageSize", pageSize,
                "total", total,
                "totalPages", totalPages)));
  }

  public Map<String, Object> listProducts(String query) {
    return service.listOwnerProducts(query);
  }

  public Map<String, Object> getProduct(long id) {
    Map<String, Object> item = service.getProductById(id);
    if (item == null) {
      throw new ApiException(404, "Produto nao encontrado.");
    }
    return service.orderedMap("item", item);
  }

  public Map<String, Object> createProduct(long ownerUserId, Map<String, Object> body) {
    return service.createProduct(ownerUserId, body);
  }

  public Map<String, Object> updateProduct(long ownerUserId, long id, Map<String, Object> body) {
    Map<String, Object> current = service.getProductById(id);
    if (current == null) {
      throw new ApiException(404, "Produto nao encontrado.");
    }
    Map<String, Object> value = service.validateProduct(body);
    try {
      Map<String, Object> item = service.inTransaction(() -> {
        long categoryId = service.insertId("""
            INSERT INTO categories (name, slug)
            VALUES (?, ?)
            ON CONFLICT (name)
            DO UPDATE SET slug = EXCLUDED.slug
            RETURNING id
            """, service.stringValue(value.get("category")), service.slugify(service.stringValue(value.get("category"))));
        long manufacturerId = service.insertId("""
            INSERT INTO manufacturers (name)
            VALUES (?)
            ON CONFLICT (name)
            DO UPDATE SET name = EXCLUDED.name
            RETURNING id
            """, service.stringValue(value.get("manufacturer")));
        service.run("""
            UPDATE products
            SET sku = ?, name = ?, description = ?, category_id = ?, manufacturer_id = ?, bike_model = ?,
                cost = ?, minimum_stock = ?, reorder_point = ?, seo_slug = NULLIF(?, ''), seo_meta_title = NULLIF(?, ''),
                seo_meta_description = NULLIF(?, ''), is_active = ?, updated_at = NOW()
            WHERE id = ?
            """,
            value.get("sku"),
            value.get("name"),
            value.get("description"),
            categoryId,
            manufacturerId,
            value.get("bikeModel"),
            value.get("cost"),
            value.get("minimumStock"),
            value.get("reorderPoint"),
            value.get("seoSlug"),
            value.get("seoMetaTitle"),
            value.get("seoMetaDescription"),
            value.get("isActive"),
            id);
        service.run("UPDATE product_stocks SET quantity = ? WHERE product_id = ?", value.get("stock"), id);
        service.run("""
            UPDATE product_prices
            SET valid_to = NOW()
            WHERE product_id = ? AND valid_to IS NULL
            """, id);
        service.run("INSERT INTO product_prices (product_id, price, valid_from) VALUES (?, ?, NOW())", id, value.get("price"));
        service.upsertProductImage(id, "main", service.stringValue(value.get("imageUrl")));
        service.upsertProductImage(id, "hover", service.stringValue(value.get("hoverImageUrl")));
        service.saveOwnerAuditLog(ownerUserId, "product_update", "product", id, current, value);
        return service.getProductById(id);
      });
      service.invalidateStorefrontCache(List.of("products:", "product-details:", "offers:", "catalog:"));
      return service.orderedMap("item", item);
    } catch (Exception exception) {
      Throwable cause = exception.getCause() != null ? exception.getCause() : exception;
      if (cause instanceof PSQLException psql && "23505".equals(psql.getSQLState())) {
        throw new ApiException(409, "SKU ja cadastrado.");
      }
      throw exception;
    }
  }

  public void deleteProduct(long ownerUserId, long id) {
    Map<String, Object> current = service.getProductById(id);
    if (current == null) {
      throw new ApiException(404, "Produto nao encontrado.");
    }
    service.run("DELETE FROM products WHERE id = ?", id);
    service.saveOwnerAuditLog(ownerUserId, "product_delete", "product", id, current, Map.of());
    service.invalidateStorefrontCache(List.of("products:", "product-details:", "offers:", "catalog:"));
  }

  public Map<String, Object> getSettings(long ownerUserId) {
    return service.orderedMap("item", getEffectiveOwnerSettings(ownerUserId));
  }

  public Map<String, Object> updateSettings(long ownerUserId, Map<String, Object> body) {
    String salesAlertEmail = service.normalize(service.stringValue(body.get("salesAlertEmail")));
    if (salesAlertEmail.isBlank() || !salesAlertEmail.contains("@")) {
      throw new ApiException(400, "Email de alerta de vendas invalido.");
    }
    String storeAddressState = service.trim(service.stringValue(body.get("storeAddressState"))).toUpperCase(Locale.ROOT);
    if (!storeAddressState.matches("^[A-Z]{2}$")) {
      throw new ApiException(400, "UF da loja invalida.");
    }
    Map<String, Object> row = service.one("""
        INSERT INTO owner_settings (
          owner_user_id, sales_alert_email, sales_alert_whatsapp, store_name, store_cnpj, store_ie,
          store_address_street, store_address_number, store_address_complement, store_address_district,
          store_address_city, store_address_state, store_address_cep, store_lat, store_lng,
          free_shipping_global_min, tax_profile, tax_percent, gateway_fee_percent, gateway_fixed_fee,
          operational_percent, packaging_cost, block_below_minimum, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON CONFLICT (owner_user_id)
        DO UPDATE SET
          sales_alert_email = EXCLUDED.sales_alert_email,
          sales_alert_whatsapp = EXCLUDED.sales_alert_whatsapp,
          store_name = EXCLUDED.store_name,
          store_cnpj = EXCLUDED.store_cnpj,
          store_ie = EXCLUDED.store_ie,
          store_address_street = EXCLUDED.store_address_street,
          store_address_number = EXCLUDED.store_address_number,
          store_address_complement = EXCLUDED.store_address_complement,
          store_address_district = EXCLUDED.store_address_district,
          store_address_city = EXCLUDED.store_address_city,
          store_address_state = EXCLUDED.store_address_state,
          store_address_cep = EXCLUDED.store_address_cep,
          store_lat = EXCLUDED.store_lat,
          store_lng = EXCLUDED.store_lng,
          free_shipping_global_min = EXCLUDED.free_shipping_global_min,
          tax_profile = EXCLUDED.tax_profile,
          tax_percent = EXCLUDED.tax_percent,
          gateway_fee_percent = EXCLUDED.gateway_fee_percent,
          gateway_fixed_fee = EXCLUDED.gateway_fixed_fee,
          operational_percent = EXCLUDED.operational_percent,
          packaging_cost = EXCLUDED.packaging_cost,
          block_below_minimum = EXCLUDED.block_below_minimum,
          updated_at = NOW()
        RETURNING *
        """,
        ownerUserId,
        salesAlertEmail,
        service.blankToNull(service.normalizePhone(body.get("salesAlertWhatsapp"))),
        fallback(body.get("storeName"), "Rodando Moto Center"),
        service.blankToNull(service.normalizeDocument(body.get("storeCnpj"))),
        service.blankToNull(service.stringValue(body.get("storeIe"))),
        fallback(body.get("storeAddressStreet"), "Av. Brasil, 8708"),
        service.blankToNull(service.stringValue(body.get("storeAddressNumber"))),
        service.blankToNull(service.stringValue(body.get("storeAddressComplement"))),
        service.blankToNull(service.stringValue(body.get("storeAddressDistrict"))),
        fallback(body.get("storeAddressCity"), StoreDefaults.CITY),
        storeAddressState,
        service.blankToNull(service.normalizeCep(body.get("storeAddressCep"))),
        body.get("storeLat") == null ? StoreDefaults.LAT : service.doubleValue(body.get("storeLat")),
        body.get("storeLng") == null ? StoreDefaults.LNG : service.doubleValue(body.get("storeLng")),
        body.get("freeShippingGlobalMin") == null ? RodandoService.FREE_SHIPPING_TARGET : service.doubleValue(body.get("freeShippingGlobalMin")),
        fallback(body.get("taxProfile"), "simples_nacional"),
        body.get("taxPercent") == null ? 0.06d : service.doubleValue(body.get("taxPercent")),
        body.get("gatewayFeePercent") == null ? 0.049d : service.doubleValue(body.get("gatewayFeePercent")),
        body.get("gatewayFixedFee") == null ? 0.0d : service.doubleValue(body.get("gatewayFixedFee")),
        body.get("operationalPercent") == null ? 0.03d : service.doubleValue(body.get("operationalPercent")),
        body.get("packagingCost") == null ? 0.0d : service.doubleValue(body.get("packagingCost")),
        body.get("blockBelowMinimum") == null ? false : service.booleanValue(body.get("blockBelowMinimum")))
        .orElseThrow(() -> new ApiException(500, "Falha ao salvar configuracoes."));
    service.saveOwnerAuditLog(ownerUserId, "owner_settings_update", "owner_settings", ownerUserId, Map.of(), row);
    return service.orderedMap("item", mapOwnerSettingsRow(row));
  }

  private Map<String, Object> getEffectiveOwnerSettings(long ownerUserId) {
    Map<String, Object> row = service.one("""
        SELECT *
        FROM owner_settings
        WHERE owner_user_id = ?
        LIMIT 1
        """, ownerUserId).orElse(null);
    if (row != null) {
      return mapOwnerSettingsRow(row);
    }
    return defaultOwnerSettings(ownerUserId);
  }

  private Map<String, Object> defaultOwnerSettings(long ownerUserId) {
    return service.orderedMap(
        "ownerUserId", ownerUserId,
        "salesAlertEmail", "",
        "salesAlertWhatsapp", "",
        "storeName", "Rodando Moto Center",
        "storeCnpj", "",
        "storeIe", "",
        "storeAddressStreet", "Av. Brasil, 8708",
        "storeAddressNumber", "",
        "storeAddressComplement", "",
        "storeAddressDistrict", "",
        "storeAddressCity", StoreDefaults.CITY,
        "storeAddressState", StoreDefaults.STATE,
        "storeAddressCep", "85807080",
        "storeLat", StoreDefaults.LAT,
        "storeLng", StoreDefaults.LNG,
        "freeShippingGlobalMin", RodandoService.FREE_SHIPPING_TARGET,
        "taxProfile", "simples_nacional",
        "taxPercent", 0.06d,
        "gatewayFeePercent", 0.049d,
        "gatewayFixedFee", 0.0d,
        "operationalPercent", 0.03d,
        "packagingCost", 0.0d,
        "blockBelowMinimum", false,
        "createdAt", null,
        "updatedAt", null);
  }

  private Map<String, Object> mapOwnerSettingsRow(Map<String, Object> row) {
    return service.orderedMap(
        "ownerUserId", service.longValue(row.get("owner_user_id")),
        "salesAlertEmail", service.stringValue(row.get("sales_alert_email")),
        "salesAlertWhatsapp", service.stringValue(row.get("sales_alert_whatsapp")),
        "storeName", fallback(row.get("store_name"), "Rodando Moto Center"),
        "storeCnpj", service.stringValue(row.get("store_cnpj")),
        "storeIe", service.stringValue(row.get("store_ie")),
        "storeAddressStreet", service.stringValue(row.get("store_address_street")),
        "storeAddressNumber", service.stringValue(row.get("store_address_number")),
        "storeAddressComplement", service.stringValue(row.get("store_address_complement")),
        "storeAddressDistrict", service.stringValue(row.get("store_address_district")),
        "storeAddressCity", fallback(row.get("store_address_city"), StoreDefaults.CITY),
        "storeAddressState", fallback(row.get("store_address_state"), StoreDefaults.STATE),
        "storeAddressCep", service.normalizeCep(row.get("store_address_cep")),
        "storeLat", row.get("store_lat") == null ? StoreDefaults.LAT : service.doubleValue(row.get("store_lat")),
        "storeLng", row.get("store_lng") == null ? StoreDefaults.LNG : service.doubleValue(row.get("store_lng")),
        "freeShippingGlobalMin", row.get("free_shipping_global_min") == null ? RodandoService.FREE_SHIPPING_TARGET : service.doubleValue(row.get("free_shipping_global_min")),
        "taxProfile", fallback(row.get("tax_profile"), "simples_nacional"),
        "taxPercent", row.get("tax_percent") == null ? 0.06d : service.doubleValue(row.get("tax_percent")),
        "gatewayFeePercent", row.get("gateway_fee_percent") == null ? 0.049d : service.doubleValue(row.get("gateway_fee_percent")),
        "gatewayFixedFee", row.get("gateway_fixed_fee") == null ? 0.0d : service.doubleValue(row.get("gateway_fixed_fee")),
        "operationalPercent", row.get("operational_percent") == null ? 0.03d : service.doubleValue(row.get("operational_percent")),
        "packagingCost", row.get("packaging_cost") == null ? 0.0d : service.doubleValue(row.get("packaging_cost")),
        "blockBelowMinimum", service.booleanValue(row.get("block_below_minimum")),
        "createdAt", service.blankToNull(service.stringValue(row.get("created_at"))),
        "updatedAt", service.blankToNull(service.stringValue(row.get("updated_at"))));
  }

  private int clamp(String value, int fallback, int min, int max) {
    try {
      return Math.max(min, Math.min(max, Integer.parseInt(service.trim(value))));
    } catch (Exception ignored) {
      return fallback;
    }
  }

  private String fallback(Object value, String fallback) {
    String text = service.trim(service.stringValue(value));
    return text.isBlank() ? fallback : text;
  }
}


