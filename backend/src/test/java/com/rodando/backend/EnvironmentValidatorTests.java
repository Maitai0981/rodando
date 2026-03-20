package com.rodando.backend;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rodando.backend.config.AppProperties;
import com.rodando.backend.config.EnvironmentValidator;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class EnvironmentValidatorTests {

  @Test
  void rejectsInsecureProductionPaymentSetup() {
    EnvironmentValidator validator = new EnvironmentValidator();
    MockEnvironment environment = new MockEnvironment()
        .withProperty("APP_ENV", "production")
        .withProperty("DATABASE_URL", "postgres://postgres:postgres@127.0.0.1:5432/rodando")
        .withProperty("ALLOWED_ORIGINS", "http://localhost:5173")
        .withProperty("COOKIE_SECURE", "0")
        .withProperty("MOCK_PAYMENT_PROVIDERS", "1")
        .withProperty("PAYMENT_CARD_PROVIDER", "mercado_pago")
        .withProperty("PAYMENT_PIX_PROVIDER", "mercado_pago")
        .withProperty("MERCADOPAGO_ACCESS_TOKEN", "")
        .withProperty("PUBLIC_APP_BASE_URL", "http://app.example.com")
        .withProperty("MERCADOPAGO_NOTIFICATION_URL", "http://backend.example.com/api/payments/webhooks/mercadopago");
    EnvironmentValidator.ValidationResult result = validator.validate(new AppProperties(environment));

    assertFalse(result.ok());
    String issues = String.join(" | ", result.issues());
    assertTrue(issues.contains("ALLOWED_ORIGINS"));
    assertTrue(issues.contains("COOKIE_SECURE"));
    assertTrue(issues.contains("MOCK_PAYMENT_PROVIDERS"));
    assertTrue(issues.contains("MERCADOPAGO_ACCESS_TOKEN"));
    assertTrue(issues.contains("PUBLIC_APP_BASE_URL"));
    assertTrue(issues.contains("MERCADOPAGO_NOTIFICATION_URL"));
  }
}


