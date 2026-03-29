package com.rodando.backend.core;

import com.rodando.backend.auth.AuthContext;
import com.rodando.backend.common.ApiException;
import com.rodando.backend.common.JsonSupport;
import com.rodando.backend.config.AppProperties;
import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.bouncycastle.crypto.generators.SCrypt;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;

@Service
public class RodandoService {

  private static final Logger log = LoggerFactory.getLogger(RodandoService.class);
  public static final int FREE_SHIPPING_TARGET = 199;
  private static final HexFormat HEX = HexFormat.of();
  private static final SecureRandom RANDOM = new SecureRandom();
  private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

  private final JdbcTemplate jdbc;
  private final TransactionTemplate tx;
  private final JsonSupport jsonSupport;
  private final AppProperties properties;
  private final MetricsTracker metricsTracker;
  private final PublicCacheService cacheService;
  private final WebClient webClient;
  public RodandoService(
      JdbcTemplate jdbc,
      TransactionTemplate tx,
      JsonSupport jsonSupport,
      AppProperties properties,
      MetricsTracker metricsTracker,
      PublicCacheService cacheService,
      WebClient webClient) {
    this.jdbc = jdbc;
    this.tx = tx;
    this.jsonSupport = jsonSupport;
    this.properties = properties;
    this.metricsTracker = metricsTracker;
    this.cacheService = cacheService;
    this.webClient = webClient;
  }

  @PostConstruct
  void init() {
    try {
      Files.createDirectories(Path.of("uploads"));
    } catch (Exception exception) {
      throw new IllegalStateException("Falha ao preparar pasta de uploads.", exception);
    }
  }

  public String nowIso() {
    return ISO.format(OffsetDateTime.now(ZoneOffset.UTC));
  }

  public String generateGuestToken() {
    byte[] bytes = new byte[24];
    RANDOM.nextBytes(bytes);
    return HEX.formatHex(bytes);
  }

  public String hashToken(String token) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      return HEX.formatHex(digest.digest(Objects.requireNonNullElse(token, "").getBytes(StandardCharsets.UTF_8)));
    } catch (Exception exception) {
      throw new IllegalStateException("Falha ao gerar hash.", exception);
    }
  }

  public String hashPassword(String password) {
    byte[] salt = new byte[16];
    RANDOM.nextBytes(salt);
    byte[] derived = SCrypt.generate(password.getBytes(StandardCharsets.UTF_8), salt, 16384, 8, 1, 64);
    return HEX.formatHex(salt) + ":" + HEX.formatHex(derived);
  }

  public boolean verifyPassword(String password, String storedHash) {
    String[] parts = Objects.requireNonNullElse(storedHash, "").split(":");
    if (parts.length != 2) {
      return false;
    }
    byte[] salt = HEX.parseHex(parts[0]);
    byte[] expected = HEX.parseHex(parts[1]);
    byte[] actual = SCrypt.generate(password.getBytes(StandardCharsets.UTF_8), salt, 16384, 8, 1, 64);
    // Comparação em tempo constante: nunca retorna cedo, evita timing attacks
    // mesmo que comprimentos difiram (não deve ocorrer com SCrypt output fixo de 64 bytes).
    int len = Math.max(expected.length, actual.length);
    int diff = expected.length ^ actual.length;
    for (int index = 0; index < len; index += 1) {
      int e = index < expected.length ? expected[index] : 0;
      int a = index < actual.length ? actual[index] : 0;
      diff |= e ^ a;
    }
    return diff == 0;
  }

  // region JDBC helpers

  public Optional<Map<String, Object>> one(String sql, Object... args) {
    long startedAt = System.nanoTime();
    try {
      List<Map<String, Object>> rows = jdbc.queryForList(Objects.requireNonNull(sql), args);
      return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
    } finally {
      metricsTracker.recordQuery((System.nanoTime() - startedAt) / 1_000_000.0d);
    }
  }

  public List<Map<String, Object>> many(String sql, Object... args) {
    long startedAt = System.nanoTime();
    try {
      return jdbc.queryForList(Objects.requireNonNull(sql), args);
    } finally {
      metricsTracker.recordQuery((System.nanoTime() - startedAt) / 1_000_000.0d);
    }
  }

  public int run(String sql, Object... args) {
    long startedAt = System.nanoTime();
    try {
      return jdbc.update(Objects.requireNonNull(sql), args);
    } finally {
      metricsTracker.recordQuery((System.nanoTime() - startedAt) / 1_000_000.0d);
    }
  }

  public long insertId(String sql, Object... args) {
    long startedAt = System.nanoTime();
    try {
      Long value = jdbc.queryForObject(Objects.requireNonNull(sql), Long.class, args);
      return value == null ? 0L : value;
    } finally {
      metricsTracker.recordQuery((System.nanoTime() - startedAt) / 1_000_000.0d);
    }
  }

  public <T> T inTransaction(TransactionCallback<T> callback) {
    return tx.execute(status -> callback.apply());
  }

  @FunctionalInterface
  public interface TransactionCallback<T> {
    T apply();
  }

  public long longValue(Object value) {
    return value == null ? 0L : ((Number) value).longValue();
  }

  public int intValue(Object value) {
    return value == null ? 0 : ((Number) value).intValue();
  }

  public double doubleValue(Object value) {
    return value == null ? 0.0d : ((Number) value).doubleValue();
  }

  public BigDecimal decimalValue(Object value) {
    if (value instanceof BigDecimal decimal) {
      return decimal;
    }
    if (value == null) {
      return BigDecimal.ZERO;
    }
    return new BigDecimal(String.valueOf(value));
  }

  public String stringValue(Object value) {
    return value == null ? "" : String.valueOf(value);
  }

  public boolean booleanValue(Object value) {
    if (value instanceof Boolean bool) {
      return bool;
    }
    return value != null && ("1".equals(String.valueOf(value)) || "true".equalsIgnoreCase(String.valueOf(value)));
  }

  public String json(Object value) {
    return jsonSupport.write(value);
  }

  // endregion

  // region bootstrap and auth

  public void bootstrap() {
    ensureSeedOwner();
    if (properties.seedBaseCatalog()) {
      seedProducts();
    }
    if (properties.seedDemoData()) {
      seedOffers();
      seedDemoReview();
    }
  }

  public void ensureSeedOwner() {
    String email = normalize(properties.ownerSeedEmail());
    String password = properties.ownerSeedPassword();
    if (email.isBlank() || password.isBlank()) {
      return;
    }

    Optional<Map<String, Object>> role = one("SELECT id FROM roles WHERE code = ?", "owner");
    if (role.isEmpty()) {
      return;
    }

    Optional<Map<String, Object>> existing = one("SELECT id FROM users WHERE lower(email) = lower(?)", email);
    long userId;
    if (existing.isPresent()) {
      userId = longValue(existing.get().get("id"));
    } else {
      userId = insertId(
          """
              INSERT INTO users (name, email, password_hash, created_at, updated_at)
              VALUES (?, ?, ?, NOW(), NOW())
              RETURNING id
              """,
          properties.ownerSeedName(),
          email,
          hashPassword(password));
    }
    run("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?) ON CONFLICT DO NOTHING", userId, longValue(role.get().get("id")));
  }

  public void seedProducts() {
    if (intValue(one("SELECT COUNT(*) AS total FROM products").orElse(Map.of()).get("total")) > 0) {
      return;
    }

    List<Map<String, Object>> sample = List.of(
        orderedMap(
            "name", "Camara de Ar Aro 18 Fina",
            "sku", "CA-AR18-F",
            "manufacturer", "Rodando",
            "category", "Camara de Ar",
            "bikeModel", "CG 160 / Fan 160",
            "price", 49.9d,
            "stock", 120,
            "imageUrl", "https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=1200&q=80",
            "hoverImageUrl", "https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=900&q=80",
            "description", "Alta resistencia para uso urbano e estrada.",
            "cost", 29.9d),
        orderedMap(
            "name", "Pastilha de Freio Dianteira Pro",
            "sku", "PF-DI-PRO",
            "manufacturer", "Rodaflex",
            "category", "Freio",
            "bikeModel", "CB 300 / Twister",
            "price", 79.9d,
            "stock", 45,
            "imageUrl", "https://images.unsplash.com/photo-1613214150331-6b3f6dd43d58?auto=format&fit=crop&w=1200&q=80",
            "hoverImageUrl", "https://images.unsplash.com/photo-1613214150331-6b3f6dd43d58?auto=format&fit=crop&w=900&q=80",
            "description", "Composto com boa resposta e durabilidade.",
            "cost", 48.9d));

    inTransaction(() -> {
      for (Map<String, Object> item : sample) {
        long categoryId = ensureCategoryId(stringValue(item.get("category")));
        long manufacturerId = ensureManufacturerId(stringValue(item.get("manufacturer")));
        long productId = insertId(
            """
                INSERT INTO products (
                  sku, name, description, category_id, manufacturer_id, bike_model,
                  cost, minimum_stock, reorder_point, is_active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 5, 10, TRUE, NOW(), NOW())
                RETURNING id
                """,
            stringValue(item.get("sku")),
            stringValue(item.get("name")),
            stringValue(item.get("description")),
            categoryId,
            manufacturerId,
            stringValue(item.get("bikeModel")),
            decimalValue(item.get("cost")));
        run("INSERT INTO product_stocks (product_id, quantity) VALUES (?, ?)", productId, intValue(item.get("stock")));
        run("INSERT INTO product_prices (product_id, price, valid_from) VALUES (?, ?, NOW())", productId, decimalValue(item.get("price")));
        run("INSERT INTO product_images (product_id, kind, url, sort_order) VALUES (?, 'main', ?, 0)", productId, stringValue(item.get("imageUrl")));
        run("INSERT INTO product_images (product_id, kind, url, sort_order) VALUES (?, 'hover', ?, 0)", productId, stringValue(item.get("hoverImageUrl")));
      }
      return null;
    });
  }

  public void seedOffers() {
    if (intValue(one("SELECT COUNT(*) AS total FROM offers").orElse(Map.of()).get("total")) > 0) {
      return;
    }
    List<Map<String, Object>> products = many("""
        SELECT p.id, pp.price
        FROM products p
        JOIN product_prices pp ON pp.product_id = p.id AND pp.valid_to IS NULL
        WHERE p.is_active = TRUE
        ORDER BY p.id ASC
        LIMIT 3
        """);
    int index = 0;
    for (Map<String, Object> product : products) {
      double multiplier = switch (index) {
        case 0 -> 1.18d;
        case 1 -> 1.14d;
        default -> 1.12d;
      };
      BigDecimal price = decimalValue(product.get("price"));
      BigDecimal compareAt = price.multiply(BigDecimal.valueOf(multiplier)).setScale(2, RoundingMode.HALF_UP);
      run("""
          INSERT INTO offers (product_id, badge, description, compare_at_price, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, TRUE, NOW(), NOW())
          """,
          longValue(product.get("id")),
          index == 0 ? "Oferta da semana" : index == 1 ? "Mais procurado" : "Preco especial",
          "Valor promocional por tempo limitado.",
          compareAt);
      index += 1;
    }
  }

  public void seedDemoReview() {
    if (intValue(one("SELECT COUNT(*) AS total FROM reviews").orElse(Map.of()).get("total")) > 0) {
      return;
    }
    long productId = longValue(one("SELECT id FROM products WHERE is_active = TRUE ORDER BY id ASC LIMIT 1").orElse(Map.of()).get("id"));
    if (productId <= 0) {
      return;
    }
    long customerRole = longValue(one("SELECT id FROM roles WHERE code = 'customer'").orElse(Map.of()).get("id"));
    long userId = insertId("""
        INSERT INTO users (name, email, password_hash, created_at, updated_at)
        VALUES (?, ?, ?, NOW(), NOW())
        ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
        RETURNING id
        """, "Cliente Demo", "cliente_demo@rodando.local", hashPassword("123456"));
    run("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?) ON CONFLICT DO NOTHING", userId, customerRole);
    run("""
        INSERT INTO reviews (user_id, product_id, rating, message, is_public, created_at, updated_at)
        VALUES (?, ?, 5, ?, TRUE, NOW(), NOW())
        ON CONFLICT (user_id, product_id)
        DO UPDATE SET rating = EXCLUDED.rating, message = EXCLUDED.message, updated_at = NOW()
        """, userId, productId, "Compra com entrega rapida e atendimento claro no WhatsApp.");
  }

  public Map<String, Object> collectOperationalCounts() {
    return Map.of(
        "products", intValue(one("SELECT COUNT(*) AS total FROM products").orElse(Map.of()).get("total")),
        "offers", intValue(one("SELECT COUNT(*) AS total FROM offers").orElse(Map.of()).get("total")),
        "reviews", intValue(one("SELECT COUNT(*) AS total FROM reviews").orElse(Map.of()).get("total")),
        "orders", intValue(one("SELECT COUNT(*) AS total FROM orders").orElse(Map.of()).get("total")),
        "carts", intValue(one("SELECT COUNT(*) AS total FROM carts").orElse(Map.of()).get("total")),
        "product_events", intValue(one("SELECT COUNT(*) AS total FROM product_events").orElse(Map.of()).get("total")),
        "owner_audit_logs", intValue(one("SELECT COUNT(*) AS total FROM owner_audit_logs").orElse(Map.of()).get("total")));
  }

  public void resetNonUserData(boolean reseedBase) {
    String tableList = String.join(", ", List.of(
        "sessions", "idempotency_keys", "payment_webhook_events", "payment_events", "outbox_jobs",
        "product_images", "product_prices", "product_stocks", "offers", "product_vehicle_fitment", "vehicles",
        "inventory_movements", "carts", "cart_items", "orders", "order_items", "reviews", "product_events",
        "product_returns", "customer_complaints", "owner_audit_logs", "owner_notifications", "fiscal_documents",
        "payment_transactions", "order_events", "shipping_quotes", "shipping_promotions", "geo_cache", "media_assets",
        "user_ux_assist_state", "user_addresses", "owner_settings", "products", "categories", "manufacturers"));
    jdbc.execute("TRUNCATE TABLE " + tableList + " RESTART IDENTITY CASCADE");
    if (reseedBase) {
      seedProducts();
    }
  }

  public int purgeDemoUsers() {
    List<Map<String, Object>> rows = many("SELECT id, email FROM users");
    int removed = 0;
    for (Map<String, Object> row : rows) {
      String email = normalize(stringValue(row.get("email")));
      if (isDemoUserEmail(email)) {
        run("DELETE FROM users WHERE id = ?", longValue(row.get("id")));
        removed += 1;
      }
    }
    return removed;
  }

  public AuthContext.AuthUser findUserFromSessionToken(String token) {
    Optional<Map<String, Object>> row = one("""
        SELECT u.*, COALESCE(r.code, 'customer') AS role
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE s.token_hash = ? AND s.expires_at > NOW()
        LIMIT 1
        """, hashToken(token));
    return row.map(this::mapAuthUser).orElse(null);
  }

  public Optional<Map<String, Object>> findUserByEmail(String email) {
    return one("""
        SELECT u.*, COALESCE(r.code, 'customer') AS role
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE lower(u.email) = lower(?)
        LIMIT 1
        """, email);
  }

  public AuthContext.AuthUser createUser(Map<String, Object> payload) {
    String name = trim(stringValue(payload.get("name")));
    String email = normalize(stringValue(payload.get("email")));
    String password = stringValue(payload.get("password"));
    String role = normalize(String.valueOf(payload.getOrDefault("role", "customer")));
    String cep = normalizeCep(payload.get("cep"));
    String addressStreet = trim(stringValue(payload.get("addressStreet")));
    String addressCity = trim(stringValue(payload.get("addressCity")));
    String addressState = trim(stringValue(payload.get("addressState"))).toUpperCase(Locale.ROOT);

    long userId = insertId("""
        INSERT INTO users (
          name, email, password_hash, phone, document, cep, address_street, address_city, address_state, created_at, updated_at
        ) VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, ?, NOW(), NOW())
        RETURNING id
        """, name, email, hashPassword(password), nullable(cep), nullable(addressStreet), nullable(addressCity), nullable(addressState));
    long roleId = longValue(one("SELECT id FROM roles WHERE code = ?", role).orElseThrow(() -> new ApiException(500, "Role nao encontrada.")).get("id"));
    run("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?) ON CONFLICT DO NOTHING", userId, roleId);
    return mapAuthUser(one("""
        SELECT u.*, COALESCE(r.code, 'customer') AS role
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE u.id = ?
        LIMIT 1
        """, userId).orElseThrow());
  }

  public SessionInfo createSession(long userId) {
    String token = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
    OffsetDateTime expiresAt = OffsetDateTime.now(ZoneOffset.UTC).plusSeconds(properties.sessionTtlMs() / 1000);
    run("INSERT INTO sessions (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, NOW())", userId, hashToken(token), expiresAt);
    return new SessionInfo(token, expiresAt);
  }

  public void deleteSessionByToken(String token) {
    if (token == null || token.isBlank()) return;
    run("DELETE FROM sessions WHERE token_hash = ?", hashToken(token));
  }

  public Map<String, Object> mePayload(AuthContext context) {
    if (context == null || !context.authenticated()) {
      return orderedMap("user", null);
    }
    Map<String, Object> row = one("""
        SELECT u.*, COALESCE(r.code, 'customer') AS role
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE u.id = ?
        LIMIT 1
        """, context.user().id()).orElseThrow(() -> new ApiException(500, "Falha ao carregar sessao."));
    List<Map<String, Object>> addresses = listUserAddresses(context.user().id());
    Map<String, Object> user = authUserPayload(mapAuthUser(row), addresses);
    return orderedMap("user", user);
  }

  public Map<String, Object> signUp(Map<String, Object> body, AuthContext context) {
    String name = trim(stringValue(body.get("name")));
    String email = normalize(stringValue(body.get("email")));
    String password = stringValue(body.get("password"));
    String cep = normalizeCep(body.get("cep"));
    String street = trim(stringValue(body.get("addressStreet")));
    String city = trim(stringValue(body.get("addressCity")));
    String state = trim(stringValue(body.get("addressState"))).toUpperCase(Locale.ROOT);

    if (name.length() < 2) throw new ApiException(400, "Nome deve ter pelo menos 2 caracteres.");
    if (!email.contains("@") || email.length() < 5) throw new ApiException(400, "Email invalido.");
    if (password.length() < 6) throw new ApiException(400, "Senha deve ter pelo menos 6 caracteres.");
    if (!isValidCep(cep)) throw new ApiException(400, "CEP invalido. Informe 8 digitos.");
    if (findUserByEmail(email).isPresent()) throw new ApiException(409, "Email ja cadastrado.");

    Map<String, String> resolvedAddress = resolveAddressForSignup(cep, street, city, state);
    AuthContext.AuthUser user = createUser(Map.of(
        "name", name,
        "email", email,
        "password", password,
        "role", "customer",
        "cep", cep,
        "addressStreet", resolvedAddress.get("street"),
        "addressCity", resolvedAddress.get("city"),
        "addressState", resolvedAddress.get("state")));
    upsertUserAddress(user.id(), null, Map.of(
        "label", "Principal",
        "cep", cep,
        "street", resolvedAddress.get("street"),
        "number", "",
        "complement", "",
        "district", "",
        "city", resolvedAddress.get("city"),
        "state", resolvedAddress.get("state"),
        "reference", "",
        "isDefault", true));
    mergeGuestBagToUser(context == null ? "" : context.guestTokenHash(), user.id());
    List<Map<String, Object>> addresses = listUserAddresses(user.id());
    return Map.of(
        "message", "Conta de cliente criada e autenticada.",
        "user", authUserPayload(user, addresses));
  }

  public Map<String, Object> signIn(Map<String, Object> body, AuthContext context, boolean ownerOnly) {
    String email = normalize(stringValue(body.get("email")));
    String password = stringValue(body.get("password"));
    if (email.isBlank() || password.isBlank()) throw new ApiException(400, "Informe email e senha.");
    Map<String, Object> row = findUserByEmail(email).orElseThrow(() -> new ApiException(401, "Credenciais invalidas."));
    if (!verifyPassword(password, stringValue(row.get("password_hash")))) {
      throw new ApiException(401, "Credenciais invalidas.");
    }
    String role = stringValue(row.get("role"));
    if (ownerOnly && !"owner".equals(role)) {
      throw new ApiException(403, "Acesso restrito ao owner.");
    }
    if (!ownerOnly && "owner".equals(role)) {
      throw new ApiException(403, "Conta owner deve usar /owner/login.");
    }
    long userId = longValue(row.get("id"));
    mergeGuestBagToUser(context == null ? "" : context.guestTokenHash(), userId);
    List<Map<String, Object>> addresses = listUserAddresses(userId);
    return Map.of(
        "message", ownerOnly ? "Login owner realizado com sucesso." : "Login realizado com sucesso.",
        "user", authUserPayload(mapAuthUser(row), addresses));
  }

  public Map<String, Object> updateProfile(long userId, String role, Map<String, Object> body) {
    String name = trim(stringValue(body.get("name")));
    String phone = normalizePhone(body.get("phone"));
    String document = normalizeDocument(body.get("document"));
    if (name.length() < 2) throw new ApiException(400, "Nome deve ter pelo menos 2 caracteres.");
    if (!phone.isBlank() && phone.length() < 10) throw new ApiException(400, "Telefone invalido.");
    if (!document.isBlank() && !isValidDocument(document)) throw new ApiException(400, "CPF/CNPJ invalido.");

    Map<String, Object> row = one("""
        UPDATE users
        SET name = ?, phone = ?, document = ?, updated_at = NOW()
        WHERE id = ?
        RETURNING *
        """, name, nullable(phone), nullable(document), userId)
        .orElseThrow(() -> new ApiException(404, "Usuario nao encontrado."));
    row.put("role", role);
    List<Map<String, Object>> addresses = listUserAddresses(userId);
    return Map.of("user", authUserPayload(mapAuthUser(row), addresses));
  }

  public List<Map<String, Object>> listUserAddresses(long userId) {
    return many("""
        SELECT *
        FROM user_addresses
        WHERE user_id = ?
        ORDER BY is_default DESC, created_at ASC, id ASC
        """, userId).stream().map(this::mapUserAddressRow).toList();
  }

  public Map<String, Object> createAddress(long userId, Map<String, Object> body) {
    return upsertUserAddress(userId, null, body);
  }

  public Map<String, Object> updateAddress(long userId, long id, Map<String, Object> body) {
    if (one("SELECT id FROM user_addresses WHERE id = ? AND user_id = ?", id, userId).isEmpty()) {
      throw new ApiException(404, "Endereco nao encontrado.");
    }
    return upsertUserAddress(userId, id, body);
  }

  public Map<String, Object> setDefaultAddress(long userId, long id) {
    if (one("SELECT id FROM user_addresses WHERE id = ? AND user_id = ?", id, userId).isEmpty()) {
      throw new ApiException(404, "Endereco nao encontrado.");
    }
    inTransaction(() -> {
      run("UPDATE user_addresses SET is_default = FALSE, updated_at = NOW() WHERE user_id = ?", userId);
      run("UPDATE user_addresses SET is_default = TRUE, updated_at = NOW() WHERE id = ? AND user_id = ?", id, userId);
      syncLegacyUserAddressFromDefault(userId);
      return null;
    });
    List<Map<String, Object>> items = listUserAddresses(userId);
    return Map.of("items", items, "defaultAddressId", id);
  }

  public void deleteAddress(long userId, long id) {
    Map<String, Object> existing = one("SELECT id, is_default FROM user_addresses WHERE id = ? AND user_id = ?", id, userId)
        .orElseThrow(() -> new ApiException(404, "Endereco nao encontrado."));
    int openOrders = intValue(one("""
        SELECT COUNT(*) AS total
        FROM orders
        WHERE address_id = ?
          AND status IN ('created', 'paid', 'shipped')
        """, id).orElse(Map.of()).get("total"));
    if (openOrders > 0) throw new ApiException(409, "Endereco vinculado a pedido em andamento.");
    inTransaction(() -> {
      run("DELETE FROM user_addresses WHERE id = ? AND user_id = ?", id, userId);
      if (booleanValue(existing.get("is_default"))) {
        run("""
            UPDATE user_addresses
            SET is_default = TRUE, updated_at = NOW()
            WHERE id = (
              SELECT ua.id
              FROM user_addresses ua
              WHERE ua.user_id = ?
              ORDER BY ua.created_at ASC
              LIMIT 1
            )
            """, userId);
        syncLegacyUserAddressFromDefault(userId);
      }
      return null;
    });
  }

  public Map<String, Object> authUserPayload(AuthContext.AuthUser user, List<Map<String, Object>> addresses) {
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("id", user.id());
    payload.put("name", user.name());
    payload.put("email", user.email());
    payload.put("role", user.role());
    payload.put("phone", blankToNull(user.phone()));
    payload.put("document", blankToNull(user.document()));
    payload.put("cep", blankToNull(user.cep()));
    payload.put("addressStreet", blankToNull(user.addressStreet()));
    payload.put("addressCity", blankToNull(user.addressCity()));
    payload.put("addressState", blankToNull(user.addressState()));
    payload.put("createdAt", user.createdAt());
    payload.put("addresses", addresses);
    Long defaultId = addresses.stream()
        .filter(item -> booleanValue(item.get("isDefault")))
        .map(item -> longValue(item.get("id")))
        .filter(id -> id != 0L)
        .findFirst()
        .orElse(null);
    payload.put("defaultAddressId", defaultId);
    return payload;
  }

  public AuthContext.AuthUser mapAuthUser(Map<String, Object> row) {
    return new AuthContext.AuthUser(
        longValue(row.get("id")),
        stringValue(row.get("name")),
        stringValue(row.get("email")),
        stringValue(row.getOrDefault("role", "customer")),
        blankToNull(stringValue(row.get("phone"))),
        blankToNull(stringValue(row.get("document"))),
        blankToNull(stringValue(row.get("cep"))),
        blankToNull(stringValue(row.get("address_street"))),
        blankToNull(stringValue(row.get("address_city"))),
        blankToNull(stringValue(row.get("address_state"))),
        stringValue(row.get("created_at")));
  }

  private long ensureCategoryId(String name) {
    return insertId("""
        INSERT INTO categories (name, slug)
        VALUES (?, ?)
        ON CONFLICT (name)
        DO UPDATE SET slug = EXCLUDED.slug
        RETURNING id
        """, name, slugify(name));
  }

  private long ensureManufacturerId(String name) {
    return insertId("""
        INSERT INTO manufacturers (name)
        VALUES (?)
        ON CONFLICT (name)
        DO UPDATE SET name = EXCLUDED.name
        RETURNING id
        """, name);
  }

  public Map<String, String> resolveAddressForSignup(String cep, String street, String city, String state) {
    if (!street.isBlank() && !city.isBlank() && state.matches("^[A-Z]{2}$")) {
      return Map.of("street", street, "city", city, "state", state);
    }
    try {
      Map<String, Object> payload = webClient.get()
          .uri("https://viacep.com.br/ws/{cep}/json/", cep)
          .retrieve()
          .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
          .timeout(Duration.ofSeconds(5))
          .block();
      if (payload == null || booleanValue(payload.get("erro"))) {
        throw new ApiException(400, "CEP nao encontrado.");
      }
      String resolvedCity = trim(stringValue(payload.get("localidade")));
      String resolvedState = trim(stringValue(payload.get("uf"))).toUpperCase(Locale.ROOT);
      if (resolvedCity.isBlank() || !resolvedState.matches("^[A-Z]{2}$")) {
        throw new ApiException(503, "Servico de CEP indisponivel. Informe logradouro, cidade e UF para continuar.");
      }
      return Map.of(
          "street", trim(stringValue(payload.get("logradouro"))),
          "city", resolvedCity,
          "state", resolvedState);
    } catch (ApiException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new ApiException(503, "Servico de CEP indisponivel. Informe logradouro, cidade e UF para continuar.");
    }
  }

  public Map<String, Object> upsertUserAddress(long userId, Long id, Map<String, Object> body) {
    String label = trim(stringValue(body.getOrDefault("label", "Endereco")));
    String cep = normalizeCep(body.get("cep"));
    String street = trim(stringValue(body.get("street")));
    String number = trim(stringValue(body.get("number")));
    String complement = trim(stringValue(body.get("complement")));
    String district = trim(stringValue(body.get("district")));
    String city = trim(stringValue(body.get("city")));
    String state = trim(stringValue(body.get("state"))).toUpperCase(Locale.ROOT);
    String reference = trim(stringValue(body.get("reference")));
    boolean isDefault = body.get("isDefault") == null || booleanValue(body.get("isDefault"));
    Double lat = parseOptionalDouble(body.get("lat"));
    Double lng = parseOptionalDouble(body.get("lng"));

    if (!isValidCep(cep)) throw new ApiException(400, "CEP invalido. Informe 8 digitos.");
    if (street.length() < 3) throw new ApiException(400, "Logradouro invalido.");
    if (city.length() < 2) throw new ApiException(400, "Cidade invalida.");
    if (!state.matches("^[A-Z]{2}$")) throw new ApiException(400, "UF invalida.");

    return inTransaction(() -> {
      int count = intValue(one("SELECT COUNT(*) AS total FROM user_addresses WHERE user_id = ?", userId).orElse(Map.of()).get("total"));
      if ((id == null || id <= 0) && count >= 10) {
        throw new ApiException(400, "Limite de 10 enderecos de entrega atingido.");
      }
      boolean shouldBeDefault = isDefault || count == 0;
      if (shouldBeDefault) {
        run("UPDATE user_addresses SET is_default = FALSE, updated_at = NOW() WHERE user_id = ?", userId);
      }

      Map<String, Object> row;
      if (id != null && id > 0) {
        row = one("""
            UPDATE user_addresses
            SET label = ?, cep = ?, street = ?, number = ?, complement = ?, district = ?,
                city = ?, state = ?, reference = ?, lat = ?, lng = ?, is_default = ?, updated_at = NOW()
            WHERE id = ? AND user_id = ?
            RETURNING *
            """,
            label, cep, street, nullable(number), nullable(complement), nullable(district), city, state,
            nullable(reference), lat, lng, shouldBeDefault, id, userId).orElseThrow();
      } else {
        row = one("""
            INSERT INTO user_addresses (
              user_id, label, cep, street, number, complement, district, city, state, reference, lat, lng, is_default, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            RETURNING *
            """,
            userId, label, cep, street, nullable(number), nullable(complement), nullable(district), city, state,
            nullable(reference), lat, lng, shouldBeDefault).orElseThrow();
      }
      syncLegacyUserAddressFromDefault(userId);
      return mapUserAddressRow(row);
    });
  }

  private void syncLegacyUserAddressFromDefault(long userId) {
    Optional<Map<String, Object>> row = one("""
        SELECT cep, street, city, state
        FROM user_addresses
        WHERE user_id = ? AND is_default = TRUE
        LIMIT 1
        """, userId);
    run("""
        UPDATE users
        SET cep = ?, address_street = ?, address_city = ?, address_state = ?, updated_at = NOW()
        WHERE id = ?
        """,
        row.map(item -> item.get("cep")).orElse(null),
        row.map(item -> item.get("street")).orElse(null),
        row.map(item -> item.get("city")).orElse(null),
        row.map(item -> item.get("state")).orElse(null),
        userId);
  }

  public Map<String, Object> mapUserAddressRow(Map<String, Object> row) {
    return orderedMap(
        "id", longValue(row.get("id")),
        "userId", longValue(row.get("user_id")),
        "label", stringValue(row.get("label")),
        "cep", stringValue(row.get("cep")),
        "street", stringValue(row.get("street")),
        "number", stringValue(row.get("number")),
        "complement", stringValue(row.get("complement")),
        "district", stringValue(row.get("district")),
        "city", stringValue(row.get("city")),
        "state", stringValue(row.get("state")),
        "reference", stringValue(row.get("reference")),
        "lat", row.get("lat") == null ? null : doubleValue(row.get("lat")),
        "lng", row.get("lng") == null ? null : doubleValue(row.get("lng")),
        "isDefault", booleanValue(row.get("is_default")),
        "createdAt", stringValue(row.get("created_at")),
        "updatedAt", stringValue(row.get("updated_at")));
  }

  public String normalizeCep(Object value) {
    return stringValue(value).replaceAll("\\D", "");
  }

  public boolean isValidCep(String cep) {
    return cep != null && cep.matches("^\\d{8}$");
  }

  public String normalizePhone(Object value) {
    String digits = stringValue(value).replaceAll("\\D", "");
    return digits.length() > 13 ? digits.substring(0, 13) : digits;
  }

  public String normalizeDocument(Object value) {
    return stringValue(value).replaceAll("\\D", "");
  }

  public boolean isValidDocument(String document) {
    String digits = normalizeDocument(document);
    return digits.length() == 11 || digits.length() == 14;
  }

  public String normalize(String value) {
    return trim(value).toLowerCase(Locale.ROOT);
  }

  public String trim(String value) {
    return value == null ? "" : value.trim();
  }

  public String slugify(String value) {
    return normalize(value)
        .replaceAll("[^a-z0-9]+", "-")
        .replaceAll("^-+|-+$", "");
  }

  public Object nullable(String value) {
    return value == null || value.isBlank() ? null : value;
  }

  public Map<String, Object> orderedMap(Object... entries) {
    LinkedHashMap<String, Object> map = new LinkedHashMap<>();
    if (entries == null) {
      return map;
    }
    if (entries.length % 2 != 0) {
      throw new IllegalArgumentException("orderedMap requires an even number of arguments.");
    }
    for (int index = 0; index < entries.length; index += 2) {
      map.put(String.valueOf(entries[index]), entries[index + 1]);
    }
    return map;
  }

  public String blankToNull(String value) {
    return value == null || value.isBlank() ? null : value;
  }

  public Double parseOptionalDouble(Object value) {
    if (value == null || stringValue(value).isBlank()) return null;
    try {
      return Double.parseDouble(stringValue(value));
    } catch (Exception ignored) {
      return null;
    }
  }

  private boolean isDemoUserEmail(String email) {
    return email.equals("cliente_demo@rodando.local")
        || email.equals("owner_e2e@rodando.local")
        || (email.endsWith("@rodando.local") && email.startsWith("auth_ui_"))
        || (email.endsWith("@rodando.local") && email.startsWith("customer_test_"))
        || (email.endsWith("@rodando.local") && email.startsWith("customer_e2e_"))
        || (email.endsWith("@rodando.local") && email.contains("_e2e_"));
  }

  // region product and bag

  public Map<String, Object> getProductById(long id) {
    return one("""
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
          0::int AS "totalSold",
          NULL::numeric AS "compareAtPrice",
          NULL::text AS "offerBadge",
          NULL::timestamptz AS "offerEndsAt",
          0::int AS "discountPercent"
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
        WHERE p.id = ?
        LIMIT 1
        """, id).map(this::mapProductRow).orElse(null);
  }

  public Map<String, Object> mapProductRow(Map<String, Object> row) {
    return orderedMap(
        "id", longValue(row.get("id")),
        "name", stringValue(row.get("name")),
        "sku", stringValue(row.get("sku")),
        "manufacturer", stringValue(row.get("manufacturer")),
        "category", stringValue(row.get("category")),
        "bikeModel", stringValue(row.get("bikeModel")),
        "price", decimalValue(row.get("price")),
        "stock", intValue(row.get("stock")),
        "imageUrl", stringValue(row.get("imageUrl")),
        "hoverImageUrl", stringValue(row.get("hoverImageUrl")),
        "description", stringValue(row.get("description")),
        "cost", decimalValue(row.get("cost")),
        "minimumStock", intValue(row.get("minimumStock")),
        "reorderPoint", intValue(row.get("reorderPoint")),
        "seoSlug", stringValue(row.get("seoSlug")),
        "seoMetaTitle", stringValue(row.get("seoMetaTitle")),
        "seoMetaDescription", stringValue(row.get("seoMetaDescription")),
        "isActive", booleanValue(row.get("isActive")),
        "createdAt", stringValue(row.get("createdAt")),
        "updatedAt", stringValue(row.get("updatedAt")),
        "totalSold", intValue(row.get("totalSold")),
        "compareAtPrice", row.get("compareAtPrice") == null ? null : decimalValue(row.get("compareAtPrice")),
        "offerBadge", blankToNull(stringValue(row.get("offerBadge"))),
        "offerEndsAt", blankToNull(stringValue(row.get("offerEndsAt"))),
        "discountPercent", intValue(row.get("discountPercent")));
  }

  public Map<String, Object> listOwnerProducts(String query) {
    String q = normalize(query);
    List<Object> args = new ArrayList<>();
    String where = "";
    if (!q.isBlank()) {
      args.add("%" + q + "%");
      where = """
          WHERE lower(p.name) LIKE ?
             OR lower(p.sku) LIKE ?
             OR lower(m.name) LIKE ?
             OR lower(c.name) LIKE ?
             OR lower(p.bike_model) LIKE ?
          """;
      args.add("%" + q + "%");
      args.add("%" + q + "%");
      args.add("%" + q + "%");
      args.add("%" + q + "%");
    }
    List<Map<String, Object>> items = many("""
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
          0::int AS "totalSold",
          NULL::numeric AS "compareAtPrice",
          NULL::text AS "offerBadge",
          NULL::timestamptz AS "offerEndsAt",
          0::int AS "discountPercent"
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
        """ + where + """
        ORDER BY p.updated_at DESC, p.id DESC
        LIMIT 500
        """, args.toArray()).stream().map(this::mapProductRow).toList();
    return Map.of("items", items);
  }

  public Map<String, Object> listOwnerProductsDashboard(String query, int page, int pageSize) {
    String q = normalize(query);
    List<Object> searchArgs = new ArrayList<>();
    String searchWhere = "";
    if (!q.isBlank()) {
      String term = "%" + q + "%";
      searchWhere = """
          WHERE (
            lower(p.name) LIKE ?
            OR lower(p.sku) LIKE ?
            OR lower(m.name) LIKE ?
            OR lower(c.name) LIKE ?
            OR lower(p.bike_model) LIKE ?
          )""";
      for (int i = 0; i < 5; i++) searchArgs.add(term);
    }
    String baseJoins = """
        FROM products p
        JOIN categories c ON c.id = p.category_id
        JOIN manufacturers m ON m.id = p.manufacturer_id
        JOIN product_stocks st ON st.product_id = p.id
        """;
    Map<String, Object> metricsRow = one(
        "SELECT COUNT(*)::int AS total, " +
        "COUNT(*) FILTER (WHERE p.is_active)::int AS active, " +
        "COUNT(*) FILTER (WHERE st.quantity <= 0)::int AS out_of_stock " +
        baseJoins + searchWhere, searchArgs.toArray()).orElse(Map.of());
    int total = intValue(metricsRow.get("total"));
    int totalPages = Math.max(1, (int) Math.ceil(total / (double) pageSize));
    int safePage = Math.min(Math.max(1, page), totalPages);
    int sqlOffset = (safePage - 1) * pageSize;
    List<String> categories = many(
        "SELECT DISTINCT c.name " + baseJoins + searchWhere + " ORDER BY 1",
        searchArgs.toArray()).stream().map(r -> stringValue(r.get("name"))).toList();
    List<String> manufacturers = many(
        "SELECT DISTINCT m.name " + baseJoins + searchWhere + " ORDER BY 1",
        searchArgs.toArray()).stream().map(r -> stringValue(r.get("name"))).toList();
    List<Object> pageArgs = new ArrayList<>(searchArgs);
    pageArgs.add(pageSize);
    pageArgs.add(sqlOffset);
    List<Map<String, Object>> items = many("""
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
          0::int AS "totalSold",
          NULL::numeric AS "compareAtPrice",
          NULL::text AS "offerBadge",
          NULL::timestamptz AS "offerEndsAt",
          0::int AS "discountPercent"
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
        """ + searchWhere + """
        ORDER BY p.updated_at DESC, p.id DESC
        LIMIT ? OFFSET ?
        """, pageArgs.toArray()).stream().map(this::mapProductRow).toList();
    return orderedMap(
        "items", items,
        "total", total,
        "active", intValue(metricsRow.get("active")),
        "outOfStock", intValue(metricsRow.get("out_of_stock")),
        "safePage", safePage,
        "totalPages", totalPages,
        "categories", categories,
        "manufacturers", manufacturers);
  }

  public Map<String, Object> createProduct(long ownerUserId, Map<String, Object> body) {
    Map<String, Object> value = validateProduct(body);
    try {
      Map<String, Object> item = inTransaction(() -> {
        long categoryId = ensureCategoryId(stringValue(value.get("category")));
        long manufacturerId = ensureManufacturerId(stringValue(value.get("manufacturer")));
        long productId = insertId("""
            INSERT INTO products (
              sku, name, description, category_id, manufacturer_id, bike_model, cost, minimum_stock, reorder_point,
              seo_slug, seo_meta_title, seo_meta_description, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''), ?, NOW(), NOW())
            RETURNING id
            """,
            stringValue(value.get("sku")),
            stringValue(value.get("name")),
            stringValue(value.get("description")),
            categoryId,
            manufacturerId,
            stringValue(value.get("bikeModel")),
            decimalValue(value.get("cost")),
            intValue(value.get("minimumStock")),
            intValue(value.get("reorderPoint")),
            stringValue(value.get("seoSlug")),
            stringValue(value.get("seoMetaTitle")),
            stringValue(value.get("seoMetaDescription")),
            booleanValue(value.get("isActive")));
        run("INSERT INTO product_stocks (product_id, quantity) VALUES (?, ?)", productId, intValue(value.get("stock")));
        run("INSERT INTO product_prices (product_id, price, valid_from) VALUES (?, ?, NOW())", productId, decimalValue(value.get("price")));
        upsertProductImage(productId, "main", stringValue(value.get("imageUrl")));
        upsertProductImage(productId, "hover", stringValue(value.get("hoverImageUrl")));
        saveOwnerAuditLog(ownerUserId, "product_create", "product", productId, Map.of(), Map.of("sku", value.get("sku")));
        return getProductById(productId);
      });
      invalidateStorefrontCache(List.of("products:", "product-details:", "offers:", "catalog:"));
      return Map.of("item", item);
    } catch (Exception exception) {
      if (exception.getMessage() != null && exception.getMessage().toLowerCase(Locale.ROOT).contains("duplicate")) {
        throw new ApiException(409, "SKU ja cadastrado.");
      }
      throw exception;
    }
  }

  public void upsertProductImage(long productId, String kind, String url) {
    if (!StringUtils.hasText(url)) {
      run("DELETE FROM product_images WHERE product_id = ? AND kind = ?", productId, kind);
      return;
    }
    run("""
        INSERT INTO product_images (product_id, kind, url, sort_order)
        VALUES (?, ?, ?, 0)
        ON CONFLICT (product_id, kind, sort_order)
        DO UPDATE SET url = EXCLUDED.url
        """, productId, kind, url);
  }

  public Map<String, Object> validateProduct(Map<String, Object> body) {
    String name = trim(stringValue(body.get("name")));
    String sku = trim(stringValue(body.get("sku"))).toUpperCase(Locale.ROOT);
    String manufacturer = trim(stringValue(body.get("manufacturer")));
    String category = trim(stringValue(body.get("category")));
    String bikeModel = trim(stringValue(body.get("bikeModel")));
    BigDecimal price = decimalValue(body.get("price"));
    BigDecimal cost = decimalValue(body.getOrDefault("cost", 0));
    int stock = intValue(body.get("stock"));
    int minimumStock = body.get("minimumStock") == null ? 5 : intValue(body.get("minimumStock"));
    int reorderPoint = body.get("reorderPoint") == null ? 10 : intValue(body.get("reorderPoint"));
    String imageUrl = trim(stringValue(body.get("imageUrl")));
    String hoverImageUrl = trim(stringValue(body.get("hoverImageUrl")));
    String description = trim(stringValue(body.get("description")));
    String seoSlug = normalize(stringValue(body.get("seoSlug")));
    String seoMetaTitle = trim(stringValue(body.get("seoMetaTitle")));
    String seoMetaDescription = trim(stringValue(body.get("seoMetaDescription")));
    boolean isActive = body.get("isActive") == null || booleanValue(body.get("isActive"));

    if (name.length() < 3) throw new ApiException(400, "Nome do produto deve ter ao menos 3 caracteres.");
    if (sku.length() < 3) throw new ApiException(400, "SKU deve ter ao menos 3 caracteres.");
    if (manufacturer.length() < 2) throw new ApiException(400, "Fabricante obrigatorio.");
    if (category.length() < 2) throw new ApiException(400, "Categoria obrigatoria.");
    if (bikeModel.length() < 2) throw new ApiException(400, "Modelo/aplicacao obrigatorio.");
    if (price.signum() < 0) throw new ApiException(400, "Preco invalido.");
    if (cost.signum() < 0) throw new ApiException(400, "Custo invalido.");
    if (cost.compareTo(price) > 0 && price.signum() > 0) throw new ApiException(400, "Custo nao pode ser maior que o preco de venda.");
    if (stock < 0) throw new ApiException(400, "Estoque invalido.");
    if (minimumStock < 0) throw new ApiException(400, "Estoque minimo invalido.");
    if (reorderPoint < 0) throw new ApiException(400, "Ponto de reposicao invalido.");
    if (reorderPoint < minimumStock) throw new ApiException(400, "Ponto de reposicao deve ser maior ou igual ao estoque minimo.");
    if (isActive && imageUrl.isBlank()) throw new ApiException(400, "Produto ativo precisa ter imagem principal valida para entrar na vitrine.");
    if (!imageUrl.isBlank() && !isValidProductImageUrl(imageUrl)) throw new ApiException(400, "Imagem deve ser uma URL http(s) ou caminho iniciado por /.");
    if (!hoverImageUrl.isBlank() && !isValidProductImageUrl(hoverImageUrl)) throw new ApiException(400, "Imagem hover deve ser uma URL http(s) ou caminho iniciado por /.");

    return orderedMap(
        "name", name,
        "sku", sku,
        "manufacturer", manufacturer,
        "category", category,
        "bikeModel", bikeModel,
        "price", price,
        "cost", cost,
        "stock", stock,
        "minimumStock", minimumStock,
        "reorderPoint", reorderPoint,
        "imageUrl", imageUrl,
        "hoverImageUrl", hoverImageUrl,
        "description", description,
        "seoSlug", seoSlug,
        "seoMetaTitle", seoMetaTitle,
        "seoMetaDescription", seoMetaDescription,
        "isActive", isActive);
  }

  public boolean isValidProductImageUrl(String value) {
    return value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://");
  }

  public Map<String, Object> getBag(AuthContext context) {
    BagActor actor = resolveBagActor(context);
    List<Map<String, Object>> items = getBagItems(actor);
    BigDecimal total = items.stream()
        .map(item -> decimalValue(item.get("price")).multiply(BigDecimal.valueOf(longValue(item.get("quantity")))))
        .reduce(BigDecimal.ZERO, BigDecimal::add);
    return Map.of("items", items, "total", total, "freeShippingTarget", FREE_SHIPPING_TARGET);
  }

  public List<Map<String, Object>> addBagItem(AuthContext context, long productId, int quantity) {
    BagActor actor = resolveBagActor(context);
    Map<String, Object> product = getProductById(productId);
    if (product == null || !booleanValue(product.get("isActive"))) throw new ApiException(404, "Produto nao encontrado.");
    return inTransaction(() -> {
      long cartId = getOrCreateOpenCart(actor);
      // SELECT FOR UPDATE garante que nenhuma outra transação simultânea leia
      // o mesmo estoque antes desta concluir — evita overselling.
      int stock = intValue(one("""
          SELECT quantity FROM product_stocks WHERE product_id = ? FOR UPDATE
          """, productId).orElse(Map.of()).get("quantity"));
      if (stock <= 0) throw new ApiException(409, "Produto sem estoque.");
      int currentQty = intValue(one("SELECT quantity FROM cart_items WHERE cart_id = ? AND product_id = ?",
          cartId, productId).orElse(Map.of()).get("quantity"));
      int nextQty = Math.min(stock, currentQty + quantity);
      if (nextQty <= 0) throw new ApiException(409, "Quantidade indisponivel.");
      upsertBagItemById(cartId, productId, nextQty);
      trackProductEvent(productId, "add_to_cart", quantity);
      return getCartItemsByCartId(cartId);
    });
  }

  public List<Map<String, Object>> updateBagItem(AuthContext context, long productId, int quantity) {
    BagActor actor = resolveBagActor(context);
    long cartId = getOrCreateOpenCart(actor);
    if (quantity <= 0) {
      deleteBagItemById(cartId, productId);
      return getCartItemsByCartId(cartId);
    }
    Map<String, Object> product = getProductById(productId);
    if (product == null || !booleanValue(product.get("isActive"))) throw new ApiException(404, "Produto nao encontrado.");
    return inTransaction(() -> {
      // FOR UPDATE garante que aumentos de quantidade não excedam o estoque
      // disponível em caso de checkouts concorrentes.
      int stock = intValue(one("""
          SELECT quantity FROM product_stocks WHERE product_id = ? FOR UPDATE
          """, productId).orElse(Map.of()).get("quantity"));
      int nextQty = Math.min(quantity, stock);
      if (nextQty <= 0) throw new ApiException(409, "Produto sem estoque.");
      if (one("SELECT quantity FROM cart_items WHERE cart_id = ? AND product_id = ?", cartId, productId).isEmpty()) {
        throw new ApiException(404, "Item nao encontrado na mochila.");
      }
      upsertBagItemById(cartId, productId, nextQty);
      return getCartItemsByCartId(cartId);
    });
  }

  public void removeBagItem(AuthContext context, long productId) {
    long cartId = getOrCreateOpenCart(resolveBagActor(context));
    deleteBagItemById(cartId, productId);
  }

  public void clearBag(AuthContext context) {
    BagActor actor = resolveBagActor(context);
    run("DELETE FROM cart_items WHERE cart_id = ?", getOrCreateOpenCart(actor));
  }

  public void mergeGuestBagToUser(String guestTokenHash, long userId) {
    if (guestTokenHash == null || guestTokenHash.isBlank() || userId <= 0) return;
    inTransaction(() -> {
      // FOR UPDATE previne merge duplo concorrente: apenas uma transação
      // adquire o lock e altera o status para 'abandoned', a segunda vê
      // status != 'open' na re-leitura após o lock e aborta.
      Optional<Map<String, Object>> guestCart = one(
          "SELECT * FROM carts WHERE guest_token_hash = ? AND status = 'open' LIMIT 1 FOR UPDATE",
          guestTokenHash);
      if (guestCart.isEmpty()) return null;
      long guestCartId = longValue(guestCart.get().get("id"));
      BagActor userActor = new BagActor("user", userId, null);
      long userCartId = getOrCreateOpenCart(userActor);
      List<Map<String, Object>> guestItems = getCartItemsByCartId(guestCartId);
      for (Map<String, Object> guestItem : guestItems) {
        long productId = longValue(guestItem.get("productId"));
        Map<String, Object> product = getProductById(productId);
        if (product == null || !booleanValue(product.get("isActive"))) continue;
        // FOR UPDATE no estoque impede overselling durante o merge
        int stock = intValue(one("""
            SELECT quantity FROM product_stocks WHERE product_id = ? FOR UPDATE
            """, productId).orElse(Map.of()).get("quantity"));
        if (stock <= 0) continue;
        int current = intValue(one("SELECT quantity FROM cart_items WHERE cart_id = ? AND product_id = ?",
            userCartId, productId).orElse(Map.of()).get("quantity"));
        int next = Math.min(stock, current + intValue(guestItem.get("quantity")));
        if (next > 0) {
          upsertBagItemById(userCartId, productId, next);
        }
      }
      run("DELETE FROM cart_items WHERE cart_id = ?", guestCartId);
      run("UPDATE carts SET status = 'abandoned', updated_at = NOW() WHERE id = ?", guestCartId);
      return null;
    });
  }

  public BagActor resolveBagActor(AuthContext context) {
    if (context != null && context.authenticated()) return new BagActor("user", context.user().id(), null);
    return new BagActor("guest", 0, context == null ? "" : context.guestTokenHash());
  }

  public long getOrCreateOpenCart(BagActor actor) {
    Optional<Map<String, Object>> existing = "user".equals(actor.kind())
        ? one("SELECT * FROM carts WHERE user_id = ? AND status = 'open' LIMIT 1", actor.userId())
        : one("SELECT * FROM carts WHERE guest_token_hash = ? AND status = 'open' LIMIT 1", actor.guestTokenHash());
    if (existing.isPresent()) return longValue(existing.get().get("id"));
    return insertId(
        "INSERT INTO carts (user_id, guest_token_hash, status, created_at, updated_at) VALUES (?, ?, 'open', NOW(), NOW()) RETURNING id",
        "user".equals(actor.kind()) ? actor.userId() : null,
        "guest".equals(actor.kind()) ? actor.guestTokenHash() : null);
  }

  public List<Map<String, Object>> getBagItems(BagActor actor) {
    return getCartItemsByCartId(getOrCreateOpenCart(actor));
  }

  public List<Map<String, Object>> getCartItemsByCartId(long cartId) {
    return many("""
        SELECT
          ci.product_id AS "productId",
          ci.quantity,
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
          p.cost,
          p.is_active AS "isActive"
        FROM cart_items ci
        JOIN products p ON p.id = ci.product_id
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
        WHERE ci.cart_id = ?
        ORDER BY ci.updated_at DESC, ci.product_id DESC
        """, cartId).stream().map(row -> orderedMap(
            "productId", longValue(row.get("productId")),
            "quantity", intValue(row.get("quantity")),
            "name", stringValue(row.get("name")),
            "sku", stringValue(row.get("sku")),
            "manufacturer", stringValue(row.get("manufacturer")),
            "category", stringValue(row.get("category")),
            "bikeModel", stringValue(row.get("bikeModel")),
            "price", decimalValue(row.get("price")),
            "stock", intValue(row.get("stock")),
            "imageUrl", stringValue(row.get("imageUrl")),
            "hoverImageUrl", stringValue(row.get("hoverImageUrl")),
            "description", stringValue(row.get("description")),
            "cost", decimalValue(row.get("cost")),
            "isActive", booleanValue(row.get("isActive")))).toList();
  }

  public void saveOwnerAuditLog(
      long ownerUserId,
      String actionType,
      String entityType,
      Long entityId,
      Map<String, Object> before,
      Map<String, Object> after) {
    saveOwnerAuditLog(ownerUserId, orderedMap(
        "actionType", actionType,
        "entityType", entityType,
        "entityId", entityId,
        "before", before == null ? Map.of() : before,
        "after", after == null ? Map.of() : after));
  }

  public void saveOwnerAuditLog(long ownerUserId, Map<String, Object> payload) {
    if (ownerUserId <= 0) {
      return;
    }
    String actionType = trim(stringValue(payload.get("actionType")));
    String entityType = trim(stringValue(payload.get("entityType")));
    if (actionType.isBlank() || entityType.isBlank()) {
      return;
    }
    Long entityId = payload.get("entityId") == null ? null : longValue(payload.get("entityId"));
    Object before = payload.get("before");
    Object after = payload.get("after");
    String ip = blankToNull(AuditContext.ip());
    String ua = blankToNull(AuditContext.userAgent());
    try {
      run("""
          INSERT INTO owner_audit_logs (
            owner_user_id, action_type, entity_type, entity_id, before_json, after_json, ip_address, user_agent, created_at
          ) VALUES (?, ?, ?, ?, ?::jsonb, ?::jsonb, ?, ?, NOW())
          """,
          ownerUserId,
          actionType,
          entityType,
          entityId,
          json(before instanceof Map<?, ?> map ? map : Map.of()),
          json(after instanceof Map<?, ?> map ? map : Map.of()),
          ip,
          ua);
    } catch (Exception e) {
      // Audit logging é best-effort e não deve quebrar o fluxo da requisição,
      // mas a falha é registrada para alertas de observabilidade.
      log.warn("[audit] Falha ao salvar log de auditoria: ownerUserId={}, action={}, entity={}",
          ownerUserId, actionType, entityType, e);
    }
  }

  private void upsertBagItemById(long cartId, long productId, int quantity) {
    run("""
        INSERT INTO cart_items (cart_id, product_id, quantity, created_at, updated_at)
        VALUES (?, ?, ?, NOW(), NOW())
        ON CONFLICT (cart_id, product_id)
        DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW()
        """, cartId, productId, quantity);
  }

  private void deleteBagItemById(long cartId, long productId) {
    run("DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?", cartId, productId);
  }

  public void trackProductEvent(long productId, String eventType, int quantity) {
    if (productId <= 0 || quantity <= 0) return;
    if (!List.of("view", "click", "add_to_cart", "checkout_start", "purchase").contains(eventType)) return;
    run("INSERT INTO product_events (product_id, event_type, quantity, created_at) VALUES (?, ?, ?, NOW())",
        productId, eventType, quantity);
  }

  public void invalidateStorefrontCache(List<String> prefixes) {
    cacheService.invalidateByPrefix(prefixes);
  }

  public record BagActor(String kind, long userId, String guestTokenHash) {
  }

  public record SessionInfo(String token, OffsetDateTime expiresAt) {
  }

  // endregion
}


