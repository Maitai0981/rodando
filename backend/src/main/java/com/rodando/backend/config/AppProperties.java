package com.rodando.backend.config;

import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class AppProperties {

  private static final String DEFAULT_DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:5432/rodando";

  private final Environment environment;

  public AppProperties(Environment environment) {
    this.environment = environment;
  }

  public String appEnv() {
    String explicit = normalize(environment.getProperty("APP_ENV"));
    if (!explicit.isBlank()) {
      return explicit;
    }
    String springProfile = normalize(environment.getProperty("spring.profiles.active"));
    if ("test".equals(springProfile)) {
      return "test";
    }
    return "local";
  }

  public boolean productionLike() {
    return "production".equals(appEnv()) || "staging".equals(appEnv());
  }

  public String databaseUrl() {
    String candidate = trim(environment.getProperty("spring.datasource.url"));
    if (!candidate.isBlank()) {
      return candidate;
    }
    candidate = trim(environment.getProperty("SPRING_DATASOURCE_URL"));
    if (!candidate.isBlank()) {
      return candidate;
    }
    candidate = trim(environment.getProperty("DATABASE_URL"));
    return candidate.isBlank() ? DEFAULT_DATABASE_URL : candidate;
  }

  public String databaseUsername() {
    String candidate = trim(environment.getProperty("spring.datasource.username"));
    if (!candidate.isBlank()) {
      return candidate;
    }
    candidate = trim(environment.getProperty("SPRING_DATASOURCE_USERNAME"));
    return candidate;
  }

  public String databasePassword() {
    String candidate = trim(environment.getProperty("spring.datasource.password"));
    if (!candidate.isBlank()) {
      return candidate;
    }
    candidate = trim(environment.getProperty("SPRING_DATASOURCE_PASSWORD"));
    return candidate;
  }

  public boolean dbReset() {
    return parseBoolean(environment.getProperty("DB_RESET"), false);
  }

  public boolean flywayBaselineOnMigrate() {
    return parseBoolean(environment.getProperty("FLYWAY_BASELINE_ON_MIGRATE"), false);
  }

  public String flywayBaselineVersion() {
    String candidate = trim(environment.getProperty("FLYWAY_BASELINE_VERSION"));
    return candidate.isBlank() ? "0" : candidate;
  }

  public boolean seedBaseCatalog() {
    return parseBoolean(environment.getProperty("SEED_BASE_CATALOG"), false);
  }

  public boolean seedDemoData() {
    return parseBoolean(environment.getProperty("SEED_DEMO_DATA"), false);
  }

  public String ownerSeedEmail() {
    return trim(environment.getProperty("OWNER_SEED_EMAIL"));
  }

  public String ownerSeedPassword() {
    return trim(environment.getProperty("OWNER_SEED_PASSWORD"));
  }

  public String ownerSeedName() {
    String value = trim(environment.getProperty("OWNER_SEED_NAME"));
    return value.isBlank() ? "Owner" : value;
  }

  public String cookieDomain() {
    return trim(environment.getProperty("COOKIE_DOMAIN"));
  }

  public boolean cookieSecure() {
    return parseBoolean(environment.getProperty("COOKIE_SECURE"), productionLike());
  }

  public String sameSite() {
    return cookieSecure() ? "None" : "Lax";
  }

  public List<String> allowedOrigins() {
    String raw = trim(environment.getProperty(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4175,http://127.0.0.1:4175"));
    return raw.isBlank()
        ? List.of()
        : List.of(raw.split(",")).stream().map(this::trim).filter(s -> !s.isBlank()).toList();
  }

  public String publicAppBaseUrl() {
    String explicit = trim(environment.getProperty("PUBLIC_APP_BASE_URL"));
    if (!explicit.isBlank()) {
      return trimTrailingSlash(explicit);
    }
    return allowedOrigins().isEmpty() ? "http://localhost:5173" : trimTrailingSlash(allowedOrigins().getFirst());
  }

  public boolean mockPaymentProviders() {
    return parseBoolean(environment.getProperty("MOCK_PAYMENT_PROVIDERS"),
        "test".equals(appEnv()) || "e2e".equals(appEnv()));
  }

  public String paymentCardProvider() {
    String value = normalize(environment.getProperty("PAYMENT_CARD_PROVIDER"));
    return value.isBlank() ? "mercado_pago" : value;
  }

  public String paymentPixProvider() {
    String value = normalize(environment.getProperty("PAYMENT_PIX_PROVIDER"));
    return value.isBlank() ? "mercado_pago" : value;
  }

  public boolean rateLimitEnabled() {
    return parseBoolean(environment.getProperty("RATE_LIMIT_ENABLED"),
        !"test".equals(appEnv()) && !"e2e".equals(appEnv()));
  }

  public int authRateLimitMax() {
    return parseInt(environment.getProperty("AUTH_RATE_LIMIT_MAX"), 10);
  }

  public Duration authRateLimitWindow() {
    return Duration.ofMillis(parseLong(environment.getProperty("AUTH_RATE_LIMIT_WINDOW_MS"), 15 * 60 * 1000L));
  }

  public int checkoutRateLimitMax() {
    return parseInt(environment.getProperty("CHECKOUT_RATE_LIMIT_MAX"), 12);
  }

  public Duration checkoutRateLimitWindow() {
    return Duration.ofMillis(parseLong(environment.getProperty("CHECKOUT_RATE_LIMIT_WINDOW_MS"), 10 * 60 * 1000L));
  }

  public int paymentCallbackRateLimitMax() {
    return parseInt(environment.getProperty("PAYMENT_CALLBACK_RATE_LIMIT_MAX"), 30);
  }

  public Duration paymentCallbackRateLimitWindow() {
    return Duration.ofMillis(parseLong(environment.getProperty("PAYMENT_CALLBACK_RATE_LIMIT_WINDOW_MS"), 10 * 60 * 1000L));
  }

  public int webhookRateLimitMax() {
    return parseInt(environment.getProperty("WEBHOOK_RATE_LIMIT_MAX"), 600);
  }

  public Duration webhookRateLimitWindow() {
    return Duration.ofMillis(parseLong(environment.getProperty("WEBHOOK_RATE_LIMIT_WINDOW_MS"), 60 * 1000L));
  }

  public long sessionTtlMs() {
    return 7L * 24 * 60 * 60 * 1000;
  }

  public long guestTtlMs() {
    return 30L * 24 * 60 * 60 * 1000;
  }

  public int uploadMaxBytes() {
    return parseInt(environment.getProperty("UPLOAD_MAX_BYTES"), 6 * 1024 * 1024);
  }

  public String mercadoPagoPublicKey() {
    return trim(environment.getProperty("MERCADOPAGO_PUBLIC_KEY"));
  }

  public String mercadoPagoAccessToken() {
    return trim(environment.getProperty("MERCADOPAGO_ACCESS_TOKEN"));
  }

  public String mercadoPagoWebhookSecret() {
    return trim(environment.getProperty("MERCADOPAGO_WEBHOOK_SECRET"));
  }

  public String mercadoPagoNotificationUrl() {
    return trim(environment.getProperty("MERCADOPAGO_NOTIFICATION_URL"));
  }

  public String stripeSecretKey() {
    return trim(environment.getProperty("STRIPE_SECRET_KEY"));
  }

  public String stripeWebhookSecret() {
    return trim(environment.getProperty("STRIPE_WEBHOOK_SECRET"));
  }

  public String alertEmailWebhookUrl() {
    return trim(environment.getProperty("ALERT_EMAIL_WEBHOOK_URL"));
  }

  public String alertWhatsappWebhookUrl() {
    return trim(environment.getProperty("ALERT_WHATSAPP_WEBHOOK_URL"));
  }

  public String smtpHost() {
    return trim(environment.getProperty("SMTP_HOST"));
  }

  public String emailFromAddress() {
    String v = trim(environment.getProperty("EMAIL_FROM_ADDRESS"));
    if (!v.isBlank()) return v;
    String username = trim(environment.getProperty("SMTP_USERNAME"));
    return username.isBlank() ? "noreply@rodando.com.br" : username;
  }

  public String emailFromName() {
    String v = trim(environment.getProperty("EMAIL_FROM_NAME"));
    return v.isBlank() ? "Rodando Moto Center" : v;
  }

  public String smtpPassword() {
    return trim(environment.getProperty("SMTP_PASSWORD"));
  }

  public boolean emailEnabled() {
    return !smtpHost().isBlank() && !smtpPassword().isBlank();
  }

  public int outboxPollIntervalMs() {
    return parseInt(environment.getProperty("OUTBOX_POLL_INTERVAL_MS"), 5000);
  }

  public boolean e2eAllowReset() {
    return parseBoolean(environment.getProperty("E2E_ALLOW_RESET"), false);
  }

  public String e2eResetToken() {
    return trim(environment.getProperty("E2E_RESET_TOKEN"));
  }

  public int port() {
    return parseInt(environment.getProperty("PORT"), 4000);
  }

  public String trim(String value) {
    return value == null ? "" : value.trim();
  }

  public String normalize(String value) {
    return trim(value).toLowerCase(Locale.ROOT);
  }

  public boolean parseBoolean(String value, boolean fallback) {
    if (value == null || value.isBlank()) {
      return fallback;
    }
    String normalized = value.trim().toLowerCase(Locale.ROOT);
    if (List.of("1", "true", "yes", "y", "on").contains(normalized)) {
      return true;
    }
    if (List.of("0", "false", "no", "n", "off").contains(normalized)) {
      return false;
    }
    return fallback;
  }

  public int parseInt(String value, int fallback) {
    try {
      return Integer.parseInt(Objects.requireNonNullElse(value, "").trim());
    } catch (Exception ignored) {
      return fallback;
    }
  }

  public long parseLong(String value, long fallback) {
    try {
      return Long.parseLong(Objects.requireNonNullElse(value, "").trim());
    } catch (Exception ignored) {
      return fallback;
    }
  }

  public String trimTrailingSlash(String value) {
    return value.replaceAll("/+$", "");
  }
}


