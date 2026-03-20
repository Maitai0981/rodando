package com.rodando.backend;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.rodando.backend.catalog.CatalogService;
import com.rodando.backend.core.RodandoService;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class CommentsEndpointSmokeTests {

  @Autowired
  private CatalogService catalogService;

  @Autowired
  private RodandoService service;

  @Test
  void listsPublicCommentsWithoutThrowing() {
    Map<String, Object> payload = assertDoesNotThrow(() -> catalogService.listComments(null, 12));

    assertNotNull(payload);
    assertNotNull(payload.get("items"));
    assertNotNull(payload.get("summary"));
  }

  @Test
  void listsPublicCommentsForSpecificProductWithoutThrowing() {
    long productId = service.longValue(service.one("SELECT id FROM products ORDER BY id ASC LIMIT 1").orElse(Map.of()).get("id"));
    Map<String, Object> payload = assertDoesNotThrow(() -> catalogService.listComments(productId, 12));

    assertNotNull(payload);
    assertNotNull(payload.get("items"));
    assertNotNull(payload.get("summary"));
    assertNotNull(payload.get("summaryByProduct"));
  }
}


