package com.rodando.backend;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.rodando.backend.owner.OwnerService;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class OwnerServiceSmokeTests {

  @Autowired
  private OwnerService ownerService;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  private long testOwnerUserId;
  private final List<Long> createdProductIds = new ArrayList<>();
  private static final String TEST_EMAIL = "smoke-owner-test@example.com";

  @BeforeEach
  void createTestOwner() {
    // Cria ou reutiliza um usuário owner para os testes
    List<Long> found = jdbcTemplate.queryForList("SELECT id FROM users WHERE email = ?", Long.class, TEST_EMAIL);
    if (!found.isEmpty()) {
      testOwnerUserId = found.get(0);
    } else {
      testOwnerUserId = Objects.requireNonNull(
          jdbcTemplate.queryForObject("""
              INSERT INTO users (name, email, password_hash, created_at, updated_at)
              VALUES (?, ?, ?, NOW(), NOW())
              RETURNING id
              """, Long.class, "Smoke Owner", TEST_EMAIL, "hash-irrelevant"));
      Long ownerRoleId = jdbcTemplate.queryForObject(
          "SELECT id FROM roles WHERE code = 'owner'", Long.class);
      if (ownerRoleId != null) {
        jdbcTemplate.update(
            "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
            testOwnerUserId, ownerRoleId);
      }
    }
  }

  @AfterEach
  void cleanup() {
    for (Long id : createdProductIds) {
      try {
        jdbcTemplate.update("DELETE FROM products WHERE id = ?", id);
      } catch (Exception ignored) {
        // produto já pode ter sido deletado pelo teste
      }
    }
    createdProductIds.clear();
    jdbcTemplate.update("DELETE FROM users WHERE email = ?", TEST_EMAIL);
  }

  @SuppressWarnings("unchecked")
  @Test
  void dashboardLoadsWithoutThrowing() {
    Map<String, Object> result = assertDoesNotThrow(() ->
        ownerService.dashboard(Map.of("page", "1", "pageSize", "20")));

    assertNotNull(result.get("metrics"));
    assertNotNull(result.get("products"));
  }

  @Test
  void listProductsReturnsMeta() {
    Map<String, Object> result = assertDoesNotThrow(() ->
        ownerService.listProducts(""));

    assertNotNull(result.get("items"));
  }

  @SuppressWarnings("unchecked")
  @Test
  void createAndDeleteProductFlow() {
    String uniqueSku = "SMOKE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

    Map<String, Object> created = ownerService.createProduct(testOwnerUserId, Map.of(
        "name", "Produto Smoke Test",
        "sku", uniqueSku,
        "category", "Transmissao",
        "manufacturer", "Rodando",
        "bikeModel", "CG 160",
        "price", 149.90,
        "cost", 70.00,
        "stock", 5,
        "isActive", false
    ));

    Map<String, Object> item = (Map<String, Object>) created.get("item");
    assertNotNull(item);
    long productId = ((Number) item.get("id")).longValue();
    createdProductIds.add(productId);

    assertDoesNotThrow(() -> ownerService.deleteProduct(testOwnerUserId, productId));
    createdProductIds.remove(productId);
  }

  @SuppressWarnings("unchecked")
  @Test
  void getAndUpdateSettingsRoundTrip() {
    Map<String, Object> before = ownerService.getSettings(testOwnerUserId);
    Map<String, Object> settings = (Map<String, Object>) before.get("item");
    assertNotNull(settings);

    Map<String, Object> payload = new HashMap<>();
    payload.put("salesAlertEmail", "smoke-owner-test@example.com");
    payload.put("salesAlertWhatsapp", "");
    payload.put("storeName", "Rodando");
    payload.put("storeCnpj", "");
    payload.put("storeIe", "");
    payload.put("storeAddressStreet", "Av. Brasil");
    payload.put("storeAddressNumber", "8708");
    payload.put("storeAddressComplement", "");
    payload.put("storeAddressDistrict", "Centro");
    payload.put("storeAddressCity", "Cascavel");
    payload.put("storeAddressState", "PR");
    payload.put("storeAddressCep", "85807080");
    payload.put("freeShippingGlobalMin", 199);
    payload.put("taxProfile", "simples_nacional");
    payload.put("taxPercent", 0.06);
    payload.put("gatewayFeePercent", 0.049);
    payload.put("gatewayFixedFee", 0);
    payload.put("operationalPercent", 0.03);
    payload.put("packagingCost", 0);
    payload.put("blockBelowMinimum", false);

    Map<String, Object> updated = ownerService.updateSettings(testOwnerUserId, payload);
    Map<String, Object> updatedItem = (Map<String, Object>) updated.get("item");
    assertNotNull(updatedItem);
    assertEquals("smoke-owner-test@example.com", updatedItem.get("salesAlertEmail"));
  }
}
