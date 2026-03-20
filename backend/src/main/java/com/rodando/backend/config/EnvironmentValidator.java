package com.rodando.backend.config;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class EnvironmentValidator {

  private static final List<String> SUPPORTED_PAYMENT_PROVIDERS =
      List.of("stripe", "mercado_pago", "banco_do_brasil");

  public ValidationResult validate(AppProperties properties) {
    List<String> issues = new ArrayList<>();
    String appEnv = properties.appEnv();
    boolean productionLike = properties.productionLike();

    if (productionLike && properties.databaseUrl().isBlank()) {
      issues.add("DATABASE_URL obrigatorio em " + appEnv + ".");
    }

    if (!SUPPORTED_PAYMENT_PROVIDERS.contains(properties.paymentCardProvider())) {
      issues.add("PAYMENT_CARD_PROVIDER invalido: \"" + properties.paymentCardProvider() + "\".");
    }
    if (!SUPPORTED_PAYMENT_PROVIDERS.contains(properties.paymentPixProvider())) {
      issues.add("PAYMENT_PIX_PROVIDER invalido: \"" + properties.paymentPixProvider() + "\".");
    }

    if (productionLike && properties.allowedOrigins().isEmpty()) {
      issues.add("ALLOWED_ORIGINS obrigatorio em " + appEnv + ".");
    }
    if (productionLike) {
      for (String origin : properties.allowedOrigins()) {
        if (!isHttpsUrl(origin)) {
          issues.add("ALLOWED_ORIGINS deve conter apenas URLs https em " + appEnv + ". Origem invalida: " + origin);
        }
      }
      if (properties.mockPaymentProviders()) {
        issues.add("MOCK_PAYMENT_PROVIDERS deve ser 0 em " + appEnv + ".");
      }
      if (!properties.cookieSecure()) {
        issues.add("COOKIE_SECURE deve ser 1 em " + appEnv + ".");
      }
    }

    if (productionLike
        && ("mercado_pago".equals(properties.paymentCardProvider()) || "mercado_pago".equals(properties.paymentPixProvider()))) {
      if (properties.mercadoPagoAccessToken().isBlank()) {
        issues.add("Configuracao Mercado Pago incompleta: MERCADOPAGO_ACCESS_TOKEN");
      }
    }
    if (productionLike && "mercado_pago".equals(properties.paymentCardProvider())) {
      if (properties.publicAppBaseUrl().isBlank() || !isHttpsUrl(properties.publicAppBaseUrl())) {
        issues.add("PUBLIC_APP_BASE_URL deve usar https em " + appEnv + ".");
      }
    }
    if (productionLike && "mercado_pago".equals(properties.paymentPixProvider())) {
      if (properties.mercadoPagoNotificationUrl().isBlank() || !isHttpsUrl(properties.mercadoPagoNotificationUrl())) {
        issues.add("MERCADOPAGO_NOTIFICATION_URL deve usar https em " + appEnv + ".");
      }
    }

    if (productionLike && "stripe".equals(properties.paymentCardProvider())) {
      if (properties.stripeSecretKey().isBlank() || properties.stripeWebhookSecret().isBlank()) {
        issues.add("Configuracao Stripe incompleta: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET");
      }
    }

    if (productionLike) {
      List<String> destructiveFlags = new ArrayList<>();
      if (properties.dbReset()) destructiveFlags.add("DB_RESET");
      if (properties.seedBaseCatalog()) destructiveFlags.add("SEED_BASE_CATALOG");
      if (properties.seedDemoData()) destructiveFlags.add("SEED_DEMO_DATA");
      if (properties.e2eAllowReset()) destructiveFlags.add("E2E_ALLOW_RESET");
      if (!destructiveFlags.isEmpty()) {
        issues.add("Flags destrutivas proibidas em " + appEnv + ": " + String.join(", ", destructiveFlags));
      }
    }

    return new ValidationResult(appEnv, productionLike, issues.isEmpty(), List.copyOf(issues));
  }

  public ValidationResult validate(Map<String, String> raw) {
    return validate(new MapBackedAppProperties(raw));
  }

  private boolean isHttpsUrl(String value) {
    try {
      return "https".equalsIgnoreCase(URI.create(value.trim()).getScheme());
    } catch (Exception ignored) {
      return false;
    }
  }

  public record ValidationResult(String appEnv, boolean productionLike, boolean ok, List<String> issues) {
  }

  private static final class MapBackedAppProperties extends AppProperties {
    private final Map<String, String> raw;

    MapBackedAppProperties(Map<String, String> raw) {
      super(null);
      this.raw = raw;
    }

    @Override
    public String appEnv() {
      String explicit = normalize(raw.getOrDefault("APP_ENV", ""));
      if (!explicit.isBlank()) {
        return explicit;
      }
      String nodeEnv = normalize(raw.getOrDefault("NODE_ENV", ""));
      if ("production".equals(nodeEnv)) return "production";
      if ("test".equals(nodeEnv)) return "test";
      return "local";
    }

    @Override
    public boolean productionLike() {
      return "production".equals(appEnv()) || "staging".equals(appEnv());
    }

    @Override
    public String databaseUrl() {
      return trim(raw.get("DATABASE_URL"));
    }

    @Override
    public boolean dbReset() {
      return parseBoolean(raw.get("DB_RESET"), false);
    }

    @Override
    public boolean seedBaseCatalog() {
      return parseBoolean(raw.get("SEED_BASE_CATALOG"), false);
    }

    @Override
    public boolean seedDemoData() {
      return parseBoolean(raw.get("SEED_DEMO_DATA"), false);
    }

    @Override
    public List<String> allowedOrigins() {
      String rawValue = trim(raw.get("ALLOWED_ORIGINS"));
      return rawValue.isBlank() ? List.of()
          : List.of(rawValue.split(",")).stream().map(this::trim).filter(value -> !value.isBlank()).toList();
    }

    @Override
    public boolean cookieSecure() {
      return parseBoolean(raw.get("COOKIE_SECURE"), productionLike());
    }

    @Override
    public boolean mockPaymentProviders() {
      return parseBoolean(raw.get("MOCK_PAYMENT_PROVIDERS"), "test".equals(appEnv()) || "e2e".equals(appEnv()));
    }

    @Override
    public String paymentCardProvider() {
      String value = normalize(raw.getOrDefault("PAYMENT_CARD_PROVIDER", "mercado_pago"));
      return value.isBlank() ? "mercado_pago" : value;
    }

    @Override
    public String paymentPixProvider() {
      String value = normalize(raw.getOrDefault("PAYMENT_PIX_PROVIDER", "mercado_pago"));
      return value.isBlank() ? "mercado_pago" : value;
    }

    @Override
    public String publicAppBaseUrl() {
      return trim(raw.get("PUBLIC_APP_BASE_URL"));
    }

    @Override
    public String mercadoPagoAccessToken() {
      return trim(raw.get("MERCADOPAGO_ACCESS_TOKEN"));
    }

    @Override
    public String mercadoPagoNotificationUrl() {
      return trim(raw.get("MERCADOPAGO_NOTIFICATION_URL"));
    }

    @Override
    public String stripeSecretKey() {
      return trim(raw.get("STRIPE_SECRET_KEY"));
    }

    @Override
    public String stripeWebhookSecret() {
      return trim(raw.get("STRIPE_WEBHOOK_SECRET"));
    }
  }
}


