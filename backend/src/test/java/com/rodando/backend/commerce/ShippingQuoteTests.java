package com.rodando.backend.commerce;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rodando.backend.core.RodandoService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ShippingQuoteTests {

  private CommerceService commerceService;

  @BeforeEach
  void setUp() {
    RodandoService rodandoService = new RodandoService(null, null, null, null, null, null, null);
    commerceService = new CommerceService(rodandoService, null, null, null);
  }

  private Map<String, Object> defaultSettings() {
    return Map.of(
        "freeShippingGlobalMin", 199.0,
        "storeLat", -24.9555,
        "storeLng", -53.4552,
        "storeAddressCity", "Cascavel",
        "storeAddressState", "PR"
    );
  }

  @Test
  void pickupMethodHasZeroShippingCost() {
    Map<String, Object> quote = commerceService.calculateShippingQuote(
        BigDecimal.valueOf(50.0),
        "pickup",
        null,
        List.of(),
        defaultSettings()
    );

    assertEquals(0, ((BigDecimal) quote.get("shippingCost")).compareTo(BigDecimal.ZERO));
    assertEquals("pickup", quote.get("ruleApplied"));
  }

  @Test
  void deliveryAboveFreeShippingThresholdHasZeroCost() {
    // Endereco fora de Cascavel, sem coordenadas → usa fallback de 520km (outro estado)
    Map<String, Object> address = Map.of(
        "state", "SP",
        "city", "Sao Paulo"
    );

    Map<String, Object> quote = commerceService.calculateShippingQuote(
        BigDecimal.valueOf(250.0), // acima do threshold de 199
        "delivery",
        address,
        List.of(),
        defaultSettings()
    );

    assertEquals(0, ((BigDecimal) quote.get("shippingCost")).compareTo(BigDecimal.ZERO));
    assertEquals("global_min_free_shipping", quote.get("ruleApplied"));
  }

  @Test
  void deliveryBelowThresholdChargesPositive() {
    // Endereco fora de Cascavel, sem coordenadas → usa fallback de 520km (outro estado)
    Map<String, Object> address = Map.of(
        "state", "SP",
        "city", "Sao Paulo"
    );

    Map<String, Object> quote = commerceService.calculateShippingQuote(
        BigDecimal.valueOf(50.0), // abaixo do threshold de 199
        "delivery",
        address,
        List.of(),
        defaultSettings()
    );

    BigDecimal shippingCost = (BigDecimal) quote.get("shippingCost");
    assertTrue(shippingCost.compareTo(BigDecimal.ZERO) > 0, "Frete deve ser positivo para subtotal abaixo do minimo");
    assertEquals("distance_base", quote.get("ruleApplied"));
  }
}
