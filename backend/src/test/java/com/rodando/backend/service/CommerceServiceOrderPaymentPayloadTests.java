package com.rodando.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.rodando.backend.commerce.CommerceService;
import com.rodando.backend.common.JsonSupport;
import java.math.BigDecimal;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class CommerceServiceOrderPaymentPayloadTests {

  @Autowired
  private CommerceService commerceService;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @Autowired
  private JsonSupport jsonSupport;

  @AfterEach
  void cleanup() {
    jdbcTemplate.update("DELETE FROM users WHERE email LIKE 'payment-payload-test-%@example.com'");
  }

  @SuppressWarnings("unchecked")
  @Test
  void getOrderMapsPixFieldsFromStoredPaymentPayloadJson() {
    String email = "payment-payload-test-" + UUID.randomUUID() + "@example.com";
    long userId = Objects.requireNonNull(jdbcTemplate.queryForObject("""
        INSERT INTO users (name, email, password_hash, created_at, updated_at)
        VALUES (?, ?, ?, NOW(), NOW())
        RETURNING id
        """, Long.class, "Cliente Pix", email, "test-hash"));
    long orderId = Objects.requireNonNull(jdbcTemplate.queryForObject("""
        INSERT INTO orders (
          user_id, status, subtotal, shipping, total, payment_status, payment_method, created_at, updated_at
        )
        VALUES (?, 'created', ?, ?, ?, 'pending', 'pix', NOW(), NOW())
        RETURNING id
        """, Long.class, userId, new BigDecimal("2.00"), BigDecimal.ZERO, new BigDecimal("2.00")));

    String payloadJson = jsonSupport.write(Map.of(
        "providerPayload", Map.of(
            "point_of_interaction", Map.of(
                "transaction_data", Map.of(
                    "ticket_url", "https://www.mercadopago.com.br/payments/123/ticket",
                    "qr_code", "000201pix-real",
                    "qr_code_base64", "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+iWbQAAAAASUVORK5CYII=")))));

    jdbcTemplate.update("""
        INSERT INTO payment_transactions (
          order_id, provider, method, external_id, provider_payment_intent_id, status, amount, payload_json, created_at, updated_at
        )
        VALUES (?, 'mercado_pago', 'pix', ?, ?, 'pending', ?, ?::jsonb, NOW(), NOW())
        """, orderId, "mp-payment-" + orderId, "mp-payment-" + orderId, new BigDecimal("2.00"), payloadJson);

    Map<String, Object> response = commerceService.getOrder(userId, orderId);
    Map<String, Object> item = (Map<String, Object>) response.get("item");
    Map<String, Object> payment = (Map<String, Object>) item.get("payment");

    assertNotNull(payment);
    assertEquals("https://www.mercadopago.com.br/payments/123/ticket", payment.get("checkoutUrl"));
    assertEquals("000201pix-real", payment.get("qrCode"));
    assertEquals("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+iWbQAAAAASUVORK5CYII=", payment.get("pix"));
  }
}


