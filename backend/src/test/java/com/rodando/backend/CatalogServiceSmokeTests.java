package com.rodando.backend;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.rodando.backend.catalog.CatalogService;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class CatalogServiceSmokeTests {

  @Autowired
  private CatalogService catalogService;

  @Test
  void listsPublicProductsWithoutThrowing() {
    Map<String, Object> payload = assertDoesNotThrow(() ->
        catalogService.listProducts(Map.of("page", "1", "pageSize", "20")));

    assertNotNull(payload);
    assertNotNull(payload.get("items"));
    assertNotNull(payload.get("meta"));
  }
}


