package com.rodando.backend.catalog;
import com.rodando.backend.core.RodandoService;
import com.rodando.backend.core.PublicCacheService;

import com.rodando.backend.common.ApiException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.stereotype.Service;

@Service
public class CatalogService {

  private static final String PUBLIC_COMMENT_AUTHOR_FILTER_SQL = """
      NOT (
        lower(u.email) = 'cliente_demo@rodando.local'
        OR lower(u.email) = 'owner_e2e@rodando.local'
        OR lower(u.email) LIKE 'auth_ui_%@rodando.local'
        OR lower(u.email) LIKE 'customer_e2e_%@rodando.local'
        OR lower(u.email) LIKE '%_e2e_%@rodando.local'
      )""";

  private final RodandoService service;
  private final PublicCacheService cacheService;

  public CatalogService(RodandoService service, PublicCacheService cacheService) {
    this.service = service;
    this.cacheService = cacheService;
  }

  public Map<String, Object> listComments(Long productId, Integer limit) {
    int safeLimit = clamp(limit, 12, 1, 50);
    String cacheKey = "comments:" + (productId == null ? "all" : productId) + ":" + safeLimit;
    Object cached = cacheService.get(cacheKey);
    if (cached instanceof Map<?, ?> payload) {
      return castMap(payload);
    }

    List<Object> args = new ArrayList<>();
    StringBuilder where = new StringBuilder("r.is_public = TRUE AND " + PUBLIC_COMMENT_AUTHOR_FILTER_SQL);
    if (productId != null && productId > 0) {
      where.append(" AND r.product_id = ?");
      args.add(productId);
    }
    args.add(safeLimit);

    String commentsSql = """
        SELECT
          r.id,
          r.user_id AS "userId",
          r.product_id AS "productId",
          u.name AS "authorName",
          r.rating,
          r.message,
          r.created_at AS "createdAt",
          r.updated_at AS "updatedAt",
          p.name AS "productName",
          COALESCE(main_image.url, '') AS "productImageUrl"
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        JOIN products p ON p.id = r.product_id
        LEFT JOIN LATERAL (
          SELECT pi.url
          FROM product_images pi
          WHERE pi.product_id = p.id AND pi.kind = 'main'
          ORDER BY pi.sort_order ASC, pi.id ASC
          LIMIT 1
        ) main_image ON TRUE
        WHERE
          %s
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT ?
        """.formatted(where);

    List<Map<String, Object>> items = service.many(commentsSql, args.toArray()).stream().map(row -> service.orderedMap(
            "id", service.longValue(row.get("id")),
            "userId", service.longValue(row.get("userId")),
            "productId", service.longValue(row.get("productId")),
            "authorName", service.stringValue(row.get("authorName")),
            "rating", service.intValue(row.get("rating")),
            "message", service.stringValue(row.get("message")),
            "createdAt", service.stringValue(row.get("createdAt")),
            "updatedAt", service.stringValue(row.get("updatedAt")),
            "productName", service.stringValue(row.get("productName")),
            "productImageUrl", service.stringValue(row.get("productImageUrl"))))
        .toList();

    String summarySql = """
        SELECT COUNT(*) AS "totalReviews", COALESCE(AVG(rating), 0)::numeric(10,2) AS "averageRating"
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        WHERE r.is_public = TRUE
          AND %s
        """.formatted(PUBLIC_COMMENT_AUTHOR_FILTER_SQL);

    Map<String, Object> summaryRow = service.one(summarySql).orElse(Map.of());

    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("items", items);
    payload.put("summary", service.orderedMap(
        "totalReviews", service.intValue(summaryRow.get("totalReviews")),
        "averageRating", round1(service.doubleValue(summaryRow.get("averageRating")))));

    if (productId != null && productId > 0) {
      String summaryByProductSql = """
          SELECT COUNT(*) AS "totalReviews", COALESCE(AVG(r.rating), 0)::numeric(10,2) AS "averageRating"
          FROM reviews r
          JOIN users u ON u.id = r.user_id
          WHERE r.is_public = TRUE
            AND r.product_id = ?
            AND %s
          """.formatted(PUBLIC_COMMENT_AUTHOR_FILTER_SQL);
      Map<String, Object> byProduct = service.one(summaryByProductSql, productId).orElse(Map.of());
      payload.put("summaryByProduct", service.orderedMap(
          "totalReviews", service.intValue(byProduct.get("totalReviews")),
          "averageRating", round1(service.doubleValue(byProduct.get("averageRating")))));
    } else {
      payload.put("summaryByProduct", null);
    }

    cacheService.put(cacheKey, payload);
    return payload;
  }

  public Map<String, Object> createComment(long userId, Map<String, Object> body) {
    long productId = service.longValue(body.get("productId"));
    int rating = service.intValue(body.get("rating"));
    String message = service.trim(service.stringValue(body.get("message")));
    if (productId <= 0) {
      throw new ApiException(400, "Informe um produto valido para avaliar.");
    }
    if (rating < 1 || rating > 5) {
      throw new ApiException(400, "Avaliacao deve ser um numero entre 1 e 5.");
    }
    if (message.length() < 8 || message.length() > 500) {
      throw new ApiException(400, "Comentario deve ter entre 8 e 500 caracteres.");
    }

    Map<String, Object> product = service.getProductById(productId);
    if (product == null || !service.booleanValue(product.get("isActive"))) {
      throw new ApiException(404, "Produto nao encontrado para avaliacao.");
    }
    if (service.one("""
        SELECT 1
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.user_id = ?
          AND oi.product_id = ?
          AND o.status IN ('created', 'paid', 'shipped', 'completed')
        LIMIT 1
        """, userId, productId).isEmpty()) {
      throw new ApiException(403, "Somente clientes que compraram este produto podem avaliar.");
    }

    long reviewId = service.insertId("""
        INSERT INTO reviews (user_id, product_id, rating, message, is_public, created_at, updated_at)
        VALUES (?, ?, ?, ?, TRUE, NOW(), NOW())
        ON CONFLICT (user_id, product_id)
        DO UPDATE SET rating = EXCLUDED.rating, message = EXCLUDED.message, updated_at = NOW()
        RETURNING id
        """, userId, productId, rating, message);

    Map<String, Object> item = service.one("""
        SELECT
          r.id,
          r.user_id AS "userId",
          r.product_id AS "productId",
          u.name AS "authorName",
          r.rating,
          r.message,
          r.created_at AS "createdAt",
          r.updated_at AS "updatedAt",
          p.name AS "productName",
          COALESCE(main_image.url, '') AS "productImageUrl"
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        JOIN products p ON p.id = r.product_id
        LEFT JOIN LATERAL (
          SELECT pi.url
          FROM product_images pi
          WHERE pi.product_id = p.id AND pi.kind = 'main'
          ORDER BY pi.sort_order ASC, pi.id ASC
          LIMIT 1
        ) main_image ON TRUE
        WHERE r.id = ?
        LIMIT 1
        """, reviewId).orElseThrow(() -> new ApiException(500, "Falha ao carregar comentario."));

    service.invalidateStorefrontCache(List.of("comments:", "product-details:", "products:", "catalog:"));
    return service.orderedMap("item", service.orderedMap(
        "id", service.longValue(item.get("id")),
        "userId", service.longValue(item.get("userId")),
        "productId", service.longValue(item.get("productId")),
        "authorName", service.stringValue(item.get("authorName")),
        "rating", service.intValue(item.get("rating")),
        "message", service.stringValue(item.get("message")),
        "createdAt", service.stringValue(item.get("createdAt")),
        "updatedAt", service.stringValue(item.get("updatedAt")),
        "productName", service.stringValue(item.get("productName")),
        "productImageUrl", service.stringValue(item.get("productImageUrl"))));
  }

  public Map<String, Object> listProducts(Map<String, String> query) {
    String q = normalize(query.get("q"));
    String category = normalize(query.get("category"));
    String manufacturer = normalize(query.get("manufacturer"));
    Double minPrice = parseOptionalDouble(query.get("minPrice"));
    Double maxPrice = parseOptionalDouble(query.get("maxPrice"));
    Boolean inStock = parseOptionalBoolean(query.get("inStock"));
    Boolean promo = parseOptionalBoolean(query.get("promo"));
    String sort = parseProductSort(query.get("sort"));
    int page = clamp(parseInteger(query.get("page")), 1, 1, 10_000);
    int pageSize = clamp(parseInteger(query.get("pageSize")), 12, 1, 60);
    boolean onlyWithImage = parseBoolean(query.get("onlyWithImage"), true);
    if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
      throw new ApiException(400, "Faixa de preco invalida: minimo maior que maximo.");
    }

    String cacheKey = "products:" + new TreeMap<>(query);
    Object cached = cacheService.get(cacheKey);
    if (cached instanceof Map<?, ?> payload) {
      return castMap(payload);
    }

    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    List<Object> args = new ArrayList<>();
    args.add(now);
    args.add(now);
    StringBuilder where = new StringBuilder("WHERE p.is_active = TRUE");
    if (onlyWithImage) {
      where.append(" AND COALESCE(main_image.url, '') <> ''");
    }
    if (!q.isBlank()) {
      String term = "%" + q + "%";
      where.append("""
           AND (
             lower(p.name) LIKE ?
             OR lower(p.sku) LIKE ?
             OR lower(m.name) LIKE ?
             OR lower(c.name) LIKE ?
             OR lower(p.bike_model) LIKE ?
           )""");
      for (int index = 0; index < 5; index += 1) {
        args.add(term);
      }
    }
    if (!category.isBlank()) {
      where.append(" AND lower(c.name) = ?");
      args.add(category);
    }
    if (!manufacturer.isBlank()) {
      where.append(" AND lower(m.name) = ?");
      args.add(manufacturer);
    }
    if (minPrice != null) {
      where.append(" AND pr.price >= ?");
      args.add(minPrice);
    }
    if (maxPrice != null) {
      where.append(" AND pr.price <= ?");
      args.add(maxPrice);
    }
    if (Boolean.TRUE.equals(inStock)) {
      where.append(" AND st.quantity > 0");
    } else if (Boolean.FALSE.equals(inStock)) {
      where.append(" AND st.quantity <= 0");
    }
    if (Boolean.TRUE.equals(promo)) {
      where.append(" AND active_offer.compare_at_price IS NOT NULL");
    } else if (Boolean.FALSE.equals(promo)) {
      where.append(" AND active_offer.compare_at_price IS NULL");
    }

    String fromSql = """
        FROM products p
        JOIN categories c ON c.id = p.category_id
        JOIN manufacturers m ON m.id = p.manufacturer_id
        JOIN product_stocks st ON st.product_id = p.id
        JOIN LATERAL (
          SELECT pp.price
          FROM product_prices pp
          WHERE pp.product_id = p.id AND pp.valid_to IS NULL
          ORDER BY pp.valid_from DESC, pp.id DESC
          LIMIT 1
        ) pr ON TRUE
        LEFT JOIN LATERAL (
          SELECT pi.url
          FROM product_images pi
          WHERE pi.product_id = p.id AND pi.kind = 'main'
          ORDER BY pi.sort_order ASC, pi.id ASC
          LIMIT 1
        ) main_image ON TRUE
        LEFT JOIN LATERAL (
          SELECT pi.url
          FROM product_images pi
          WHERE pi.product_id = p.id AND pi.kind = 'hover'
          ORDER BY pi.sort_order ASC, pi.id ASC
          LIMIT 1
        ) hover_image ON TRUE
        LEFT JOIN (
          SELECT oi.product_id, SUM(oi.quantity)::int AS total_sold
          FROM order_items oi
          GROUP BY oi.product_id
        ) sales ON sales.product_id = p.id
        LEFT JOIN LATERAL (
          SELECT o.compare_at_price, o.badge, o.ends_at
          FROM offers o
          WHERE o.product_id = p.id
            AND o.is_active = TRUE
            AND (o.starts_at IS NULL OR o.starts_at <= ?)
            AND (o.ends_at IS NULL OR o.ends_at >= ?)
          ORDER BY o.updated_at DESC, o.id DESC
          LIMIT 1
        ) active_offer ON TRUE
        """;

    int total = service.intValue(service.one("SELECT COUNT(*) AS total " + fromSql + " " + where, args.toArray())
        .orElse(Map.of()).get("total"));

    int offset = (page - 1) * pageSize;
    List<Object> dataArgs = new ArrayList<>(args);
    dataArgs.add(pageSize);
    dataArgs.add(offset);
    List<Map<String, Object>> items = service.many("""
        SELECT
          p.id,
          p.name,
          p.sku,
          m.name AS manufacturer,
          c.name AS category,
          p.bike_model AS "bikeModel",
          pr.price,
          st.quantity AS stock,
          COALESCE(main_image.url, '') AS "imageUrl",
          COALESCE(hover_image.url, '') AS "hoverImageUrl",
          p.description,
          p.seo_slug AS "seoSlug",
          p.seo_meta_title AS "seoMetaTitle",
          p.seo_meta_description AS "seoMetaDescription",
          p.cost,
          p.minimum_stock AS "minimumStock",
          p.reorder_point AS "reorderPoint",
          p.is_active AS "isActive",
          p.created_at AS "createdAt",
          p.updated_at AS "updatedAt",
          COALESCE(sales.total_sold, 0) AS "totalSold",
          active_offer.compare_at_price AS "compareAtPrice",
          active_offer.badge AS "offerBadge",
          active_offer.ends_at AS "offerEndsAt",
          CASE
            WHEN active_offer.compare_at_price IS NOT NULL AND active_offer.compare_at_price > pr.price
              THEN ROUND(((active_offer.compare_at_price - pr.price) / active_offer.compare_at_price) * 100)
            ELSE 0
          END AS "discountPercent"
        """ + fromSql + "\n" + where + "\nORDER BY " + orderBy(sort) + "\nLIMIT ? OFFSET ?\n",
        dataArgs.toArray()).stream().map(service::mapProductRow).toList();

    Map<String, Object> payload = service.orderedMap(
        "items", items,
        "meta", service.orderedMap(
            "page", page,
            "pageSize", pageSize,
            "total", total,
            "totalPages", Math.max(1, (int) Math.ceil(total / (double) pageSize))));
    cacheService.put(cacheKey, payload);
    return payload;
  }

  public Map<String, Object> getPublicProductDetails(long id) {
    String cacheKey = "product-details:" + id;
    Object cached = cacheService.get(cacheKey);
    if (cached instanceof Map<?, ?> payload) {
      return castMap(payload);
    }

    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    Map<String, Object> row = service.one("""
        SELECT
          p.id,
          p.name,
          p.sku,
          m.name AS manufacturer,
          c.name AS category,
          p.bike_model AS "bikeModel",
          pr.price,
          st.quantity AS stock,
          COALESCE(main_image.url, '') AS "imageUrl",
          COALESCE(hover_image.url, '') AS "hoverImageUrl",
          p.description,
          p.seo_slug AS "seoSlug",
          p.seo_meta_title AS "seoMetaTitle",
          p.seo_meta_description AS "seoMetaDescription",
          p.cost,
          p.minimum_stock AS "minimumStock",
          p.reorder_point AS "reorderPoint",
          p.is_active AS "isActive",
          p.created_at AS "createdAt",
          p.updated_at AS "updatedAt",
          active_offer.compare_at_price AS "compareAtPrice",
          active_offer.badge AS "offerBadge",
          active_offer.ends_at AS "offerEndsAt",
          CASE
            WHEN active_offer.compare_at_price IS NOT NULL AND active_offer.compare_at_price > pr.price
              THEN ROUND(((active_offer.compare_at_price - pr.price) / active_offer.compare_at_price) * 100)
            ELSE 0
          END AS "discountPercent",
          COALESCE(reviews.total_reviews, 0) AS "totalReviews",
          COALESCE(reviews.average_rating, 0) AS "averageRating"
        FROM products p
        JOIN categories c ON c.id = p.category_id
        JOIN manufacturers m ON m.id = p.manufacturer_id
        JOIN product_stocks st ON st.product_id = p.id
        JOIN LATERAL (
          SELECT pp.price
          FROM product_prices pp
          WHERE pp.product_id = p.id AND pp.valid_to IS NULL
          ORDER BY pp.valid_from DESC, pp.id DESC
          LIMIT 1
        ) pr ON TRUE
        LEFT JOIN LATERAL (
          SELECT pi.url
          FROM product_images pi
          WHERE pi.product_id = p.id AND pi.kind = 'main'
          ORDER BY pi.sort_order ASC, pi.id ASC
          LIMIT 1
        ) main_image ON TRUE
        LEFT JOIN LATERAL (
          SELECT pi.url
          FROM product_images pi
          WHERE pi.product_id = p.id AND pi.kind = 'hover'
          ORDER BY pi.sort_order ASC, pi.id ASC
          LIMIT 1
        ) hover_image ON TRUE
        LEFT JOIN LATERAL (
          SELECT o.compare_at_price, o.badge, o.ends_at
          FROM offers o
          WHERE o.product_id = p.id
            AND o.is_active = TRUE
            AND (o.starts_at IS NULL OR o.starts_at <= ?)
            AND (o.ends_at IS NULL OR o.ends_at >= ?)
          ORDER BY o.updated_at DESC, o.id DESC
          LIMIT 1
        ) active_offer ON TRUE
        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS total_reviews, COALESCE(AVG(r.rating), 0)::numeric(4,2) AS average_rating
          FROM reviews r
          WHERE r.product_id = p.id AND r.is_public = TRUE
        ) reviews ON TRUE
        WHERE p.id = ? AND p.is_active = TRUE
        LIMIT 1
        """, now, now, id).orElse(null);
    if (row == null) {
      return null;
    }

    List<String> images = service.many("""
        SELECT url
        FROM product_images
        WHERE product_id = ?
        ORDER BY CASE kind WHEN 'main' THEN 0 WHEN 'hover' THEN 1 ELSE 2 END, sort_order ASC, id ASC
        """, id).stream()
        .map(item -> service.trim(service.stringValue(item.get("url"))))
        .filter(item -> !item.isBlank())
        .toList();
    String mainUrl = service.trim(service.stringValue(row.get("imageUrl")));
    if (mainUrl.isBlank() && !images.isEmpty()) {
      mainUrl = images.getFirst();
    }
    String hoverUrl = service.trim(service.stringValue(row.get("hoverImageUrl")));
    String finalMainUrl = mainUrl;
    String finalHoverUrl = hoverUrl;
    List<String> extra = images.stream().filter(url -> !url.equals(finalMainUrl) && !url.equals(finalHoverUrl)).toList();
    int stock = service.intValue(row.get("stock"));
    String urgencyLabel = stock <= 0 ? "Sem estoque" : stock <= 3 ? "Ultimas unidades" : null;

    Map<String, Object> payload = service.orderedMap(
        "item", service.mapProductRow(row),
        "gallery", service.orderedMap("mainUrl", finalMainUrl, "hoverUrl", finalHoverUrl, "extra", extra),
        "pricing", service.orderedMap(
            "price", service.decimalValue(row.get("price")),
            "compareAtPrice", row.get("compareAtPrice") == null ? null : service.decimalValue(row.get("compareAtPrice")),
            "discountPercent", service.intValue(row.get("discountPercent"))),
        "availability", service.orderedMap(
            "stock", stock,
            "isActive", service.booleanValue(row.get("isActive")),
            "urgencyLabel", urgencyLabel),
        "compatibility", service.orderedMap("bikeModel", service.stringValue(row.get("bikeModel")), "fitments", List.of()),
        "seo", service.orderedMap(
            "slug", service.blankToNull(service.stringValue(row.get("seoSlug"))) == null
                ? service.slugify(service.stringValue(row.get("name")))
                : service.stringValue(row.get("seoSlug")),
            "metaTitle", service.blankToNull(service.stringValue(row.get("seoMetaTitle"))) == null
                ? service.stringValue(row.get("name")) + " | Rodando Moto Center"
                : service.stringValue(row.get("seoMetaTitle")),
            "metaDescription", service.trim(service.blankToNull(service.stringValue(row.get("seoMetaDescription"))) == null
                ? service.stringValue(row.get("description"))
                : service.stringValue(row.get("seoMetaDescription")))),
        "socialProof", service.orderedMap(
            "averageRating", round1(service.doubleValue(row.get("averageRating"))),
            "totalReviews", service.intValue(row.get("totalReviews"))));

    service.trackProductEvent(id, "view", 1);
    cacheService.put(cacheKey, payload);
    return payload;
  }

  public Map<String, Object> listHighlights() {
    Map<String, Object> result = listProducts(Map.of("sort", "discount-desc", "page", "1", "pageSize", "8", "onlyWithImage", "true"));
    return service.orderedMap("items", result.get("items"));
  }

  public Map<String, Object> listCategories() {
    List<Map<String, Object>> rows = service.many("""
        SELECT c.name, COUNT(p.id) AS count
        FROM categories c
        JOIN products p ON p.category_id = c.id AND p.is_active = TRUE
        GROUP BY c.name
        ORDER BY count DESC, c.name ASC
        LIMIT 20
        """);
    return service.orderedMap("items", rows);
  }

  public Map<String, Object> listRecommendations(String excludeRaw, Integer limit) {
    int safeLimit = clamp(limit, 4, 1, 24);
    List<Long> excludedIds = parseIdList(excludeRaw);
    List<Object> args = new ArrayList<>();
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    args.add(now);
    args.add(now);
    StringBuilder where = new StringBuilder("""
        WHERE p.is_active = TRUE
          AND COALESCE(main_image.url, '') <> ''
          AND st.quantity > 0
        """);
    if (!excludedIds.isEmpty()) {
      where.append(" AND p.id NOT IN (");
      for (int index = 0; index < excludedIds.size(); index += 1) {
        if (index > 0) {
          where.append(", ");
        }
        where.append("?");
        args.add(excludedIds.get(index));
      }
      where.append(")");
    }
    args.add(safeLimit);

    List<Map<String, Object>> items = service.many("""
        SELECT
          p.id,
          p.name,
          p.sku,
          m.name AS manufacturer,
          c.name AS category,
          p.bike_model AS "bikeModel",
          pr.price,
          st.quantity AS stock,
          COALESCE(main_image.url, '') AS "imageUrl",
          COALESCE(hover_image.url, '') AS "hoverImageUrl",
          p.description,
          p.seo_slug AS "seoSlug",
          p.seo_meta_title AS "seoMetaTitle",
          p.seo_meta_description AS "seoMetaDescription",
          p.cost,
          p.minimum_stock AS "minimumStock",
          p.reorder_point AS "reorderPoint",
          p.is_active AS "isActive",
          p.created_at AS "createdAt",
          p.updated_at AS "updatedAt",
          COALESCE(sales.total_sold, 0) AS "totalSold",
          active_offer.compare_at_price AS "compareAtPrice",
          active_offer.badge AS "offerBadge",
          active_offer.ends_at AS "offerEndsAt",
          CASE
            WHEN active_offer.compare_at_price IS NOT NULL AND active_offer.compare_at_price > pr.price
              THEN ROUND(((active_offer.compare_at_price - pr.price) / active_offer.compare_at_price) * 100)
            ELSE 0
          END AS "discountPercent"
        FROM products p
        JOIN categories c ON c.id = p.category_id
        JOIN manufacturers m ON m.id = p.manufacturer_id
        JOIN product_stocks st ON st.product_id = p.id
        JOIN LATERAL (
          SELECT pp.price
          FROM product_prices pp
          WHERE pp.product_id = p.id AND pp.valid_to IS NULL
          ORDER BY pp.valid_from DESC, pp.id DESC
          LIMIT 1
        ) pr ON TRUE
        LEFT JOIN LATERAL (
          SELECT pi.url
          FROM product_images pi
          WHERE pi.product_id = p.id AND pi.kind = 'main'
          ORDER BY pi.sort_order ASC, pi.id ASC
          LIMIT 1
        ) main_image ON TRUE
        LEFT JOIN LATERAL (
          SELECT pi.url
          FROM product_images pi
          WHERE pi.product_id = p.id AND pi.kind = 'hover'
          ORDER BY pi.sort_order ASC, pi.id ASC
          LIMIT 1
        ) hover_image ON TRUE
        LEFT JOIN (
          SELECT oi.product_id, SUM(oi.quantity)::int AS total_sold
          FROM order_items oi
          GROUP BY oi.product_id
        ) sales ON sales.product_id = p.id
        LEFT JOIN LATERAL (
          SELECT o.compare_at_price, o.badge, o.ends_at
          FROM offers o
          WHERE o.product_id = p.id
            AND o.is_active = TRUE
            AND (o.starts_at IS NULL OR o.starts_at <= ?)
            AND (o.ends_at IS NULL OR o.ends_at >= ?)
          ORDER BY o.updated_at DESC, o.id DESC
          LIMIT 1
        ) active_offer ON TRUE
        """ + "\n" + where + "\nORDER BY COALESCE(sales.total_sold, 0) DESC, p.updated_at DESC\nLIMIT ?\n",
        args.toArray()).stream().map(service::mapProductRow).toList();

    items.forEach(item -> service.trackProductEvent(service.longValue(item.get("id")), "view", 1));
    return service.orderedMap("items", items);
  }

  public Map<String, Object> listOffers() {
    String cacheKey = "offers:active";
    Object cached = cacheService.get(cacheKey);
    if (cached instanceof Map<?, ?> payload) {
      return castMap(payload);
    }
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    List<Map<String, Object>> items = service.many("""
        SELECT
          o.id,
          o.product_id AS "productId",
          o.badge,
          o.description,
          o.compare_at_price AS "compareAtPrice",
          o.starts_at AS "startsAt",
          o.ends_at AS "endsAt",
          o.updated_at AS "updatedAt",
          p.name,
          p.sku,
          m.name AS manufacturer,
          c.name AS category,
          p.bike_model AS "bikeModel",
          pr.price,
          st.quantity AS stock,
          COALESCE(main_image.url, '') AS "imageUrl",
          COALESCE(hover_image.url, '') AS "hoverImageUrl",
          p.description AS "productDescription",
          p.is_active AS "isActive",
          CASE
            WHEN o.compare_at_price > pr.price
              THEN ROUND(((o.compare_at_price - pr.price) / o.compare_at_price) * 100)
            ELSE 0
          END AS "discountPercent"
        FROM offers o
        JOIN products p ON p.id = o.product_id
        JOIN categories c ON c.id = p.category_id
        JOIN manufacturers m ON m.id = p.manufacturer_id
        JOIN product_stocks st ON st.product_id = p.id
        JOIN LATERAL (
          SELECT pp.price
          FROM product_prices pp
          WHERE pp.product_id = p.id AND pp.valid_to IS NULL
          ORDER BY pp.valid_from DESC, pp.id DESC
          LIMIT 1
        ) pr ON TRUE
        LEFT JOIN LATERAL (
          SELECT pi.url
          FROM product_images pi
          WHERE pi.product_id = p.id AND pi.kind = 'main'
          ORDER BY pi.sort_order ASC, pi.id ASC
          LIMIT 1
        ) main_image ON TRUE
        LEFT JOIN LATERAL (
          SELECT pi.url
          FROM product_images pi
          WHERE pi.product_id = p.id AND pi.kind = 'hover'
          ORDER BY pi.sort_order ASC, pi.id ASC
          LIMIT 1
        ) hover_image ON TRUE
        WHERE o.is_active = TRUE
          AND p.is_active = TRUE
          AND (o.starts_at IS NULL OR o.starts_at <= ?)
          AND (o.ends_at IS NULL OR o.ends_at >= ?)
        ORDER BY o.updated_at DESC, o.id DESC
        LIMIT 24
        """, now, now).stream().map(row -> service.orderedMap(
            "id", service.longValue(row.get("id")),
            "productId", service.longValue(row.get("productId")),
            "badge", service.stringValue(row.get("badge")),
            "description", service.stringValue(row.get("description")),
            "compareAtPrice", service.decimalValue(row.get("compareAtPrice")),
            "startsAt", service.blankToNull(service.stringValue(row.get("startsAt"))),
            "endsAt", service.blankToNull(service.stringValue(row.get("endsAt"))),
            "updatedAt", service.blankToNull(service.stringValue(row.get("updatedAt"))),
            "name", service.stringValue(row.get("name")),
            "sku", service.stringValue(row.get("sku")),
            "manufacturer", service.stringValue(row.get("manufacturer")),
            "category", service.stringValue(row.get("category")),
            "bikeModel", service.stringValue(row.get("bikeModel")),
            "price", service.decimalValue(row.get("price")),
            "stock", service.intValue(row.get("stock")),
            "imageUrl", service.stringValue(row.get("imageUrl")),
            "hoverImageUrl", service.stringValue(row.get("hoverImageUrl")),
            "productDescription", service.stringValue(row.get("productDescription")),
            "isActive", service.booleanValue(row.get("isActive")),
            "discountPercent", service.intValue(row.get("discountPercent"))))
        .toList();
    Map<String, Object> payload = service.orderedMap("items", items);
    cacheService.put(cacheKey, payload);
    return payload;
  }

  private String normalize(String value) {
    return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
  }

  private Integer parseInteger(String value) {
    try {
      return value == null || value.isBlank() ? null : Integer.parseInt(value.trim());
    } catch (Exception ignored) {
      return null;
    }
  }

  private int clamp(Integer value, int fallback, int min, int max) {
    int safe = value == null ? fallback : value;
    return Math.max(min, Math.min(max, safe));
  }

  private Double parseOptionalDouble(String value) {
    try {
      return value == null || value.isBlank() ? null : Double.parseDouble(value.trim());
    } catch (Exception ignored) {
      return null;
    }
  }

  private Boolean parseOptionalBoolean(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    String normalized = value.trim().toLowerCase(Locale.ROOT);
    if (List.of("1", "true", "yes", "y").contains(normalized)) {
      return true;
    }
    if (List.of("0", "false", "no", "n").contains(normalized)) {
      return false;
    }
    return null;
  }

  private boolean parseBoolean(String value, boolean fallback) {
    Boolean parsed = parseOptionalBoolean(value);
    return parsed == null ? fallback : parsed;
  }

  private String parseProductSort(String value) {
    String normalized = normalize(value);
    return switch (normalized) {
      case "name-desc", "price-asc", "price-desc", "newest", "best-sellers", "discount-desc" -> normalized;
      default -> "name-asc";
    };
  }

  private String orderBy(String sort) {
    return switch (sort) {
      case "name-desc" -> "p.name DESC, p.id DESC";
      case "price-asc" -> "pr.price ASC, p.name ASC";
      case "price-desc" -> "pr.price DESC, p.name ASC";
      case "newest" -> "p.created_at DESC, p.id DESC";
      case "best-sellers" -> "COALESCE(sales.total_sold, 0) DESC, p.name ASC";
      case "discount-desc" -> """
          CASE
            WHEN active_offer.compare_at_price IS NOT NULL AND active_offer.compare_at_price > pr.price
              THEN ((active_offer.compare_at_price - pr.price) / active_offer.compare_at_price)
            ELSE 0
          END DESC,
          pr.price ASC
          """;
      default -> "p.name ASC, p.id ASC";
    };
  }

  private List<Long> parseIdList(String value) {
    if (value == null || value.isBlank()) {
      return List.of();
    }
    return List.of(value.split(",")).stream()
        .map(String::trim)
        .map(chunk -> {
          try {
            return Long.parseLong(chunk);
          } catch (Exception ignored) {
            return -1L;
          }
        })
        .filter(item -> item > 0)
        .toList();
  }

  private double round1(double value) {
    return Math.round(value * 10.0d) / 10.0d;
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> castMap(Map<?, ?> payload) {
    return (Map<String, Object>) payload;
  }
}


