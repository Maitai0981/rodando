package com.rodando.backend.commerce;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rodando.backend.auth.AuthContext;
import com.rodando.backend.core.RodandoService;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class CartOperationsTests {

  @Autowired
  private RodandoService rodandoService;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  private AuthContext guestContext() {
    String token = UUID.randomUUID().toString();
    String tokenHash = "test-hash-" + token;
    return new AuthContext(null, null, token, tokenHash);
  }

  @AfterEach
  void cleanup() {
    // Limpa carrinhos de convidado criados nos testes (token hash começa com 'test-hash-')
    jdbcTemplate.update("""
        DELETE FROM carts WHERE guest_token_hash LIKE 'test-hash-%'
        """);
  }

  @SuppressWarnings("unchecked")
  @Test
  void addAndRemoveBagItemFlowWorks() {
    Long productId = jdbcTemplate.queryForObject(
        "SELECT id FROM products WHERE is_active = true LIMIT 1",
        Long.class);
    Objects.requireNonNull(productId, "Nenhum produto ativo no banco para o teste");

    AuthContext ctx = guestContext();

    // Adiciona item ao carrinho
    List<Map<String, Object>> afterAdd = assertDoesNotThrow(() ->
        rodandoService.addBagItem(ctx, productId, 2));

    assertTrue(afterAdd.stream().anyMatch(i ->
        ((Number) i.get("productId")).longValue() == productId), "Produto deve estar no carrinho");

    // Remove item do carrinho
    assertDoesNotThrow(() -> rodandoService.removeBagItem(ctx, productId));

    List<Map<String, Object>> afterRemove = rodandoService.getBagItems(rodandoService.resolveBagActor(ctx));
    assertTrue(afterRemove.stream().noneMatch(i ->
        ((Number) i.get("productId")).longValue() == productId), "Produto deve ter sido removido");
  }

  @SuppressWarnings("unchecked")
  @Test
  void clearBagRemovesAllItems() {
    Long productId = jdbcTemplate.queryForObject(
        "SELECT id FROM products WHERE is_active = true LIMIT 1",
        Long.class);
    Objects.requireNonNull(productId, "Nenhum produto ativo no banco para o teste");

    AuthContext ctx = guestContext();

    rodandoService.addBagItem(ctx, productId, 1);

    // Limpa o carrinho
    assertDoesNotThrow(() -> rodandoService.clearBag(ctx));

    List<Map<String, Object>> items = rodandoService.getBagItems(rodandoService.resolveBagActor(ctx));
    assertEquals(0, items.size(), "Carrinho deve estar vazio apos clearBag");
  }
}
