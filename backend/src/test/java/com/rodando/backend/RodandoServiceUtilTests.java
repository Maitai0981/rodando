package com.rodando.backend;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;

import com.rodando.backend.core.RodandoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RodandoServiceUtilTests {

  private RodandoService service;

  @BeforeEach
  void setUp() {
    // Passa null para todos os campos — os métodos utilitários não os utilizam
    service = new RodandoService(null, null, null, null, null, null, null);
  }

  @Test
  void slugifyCreatesUrlSlug() {
    assertEquals("kit-corrente-428h", service.slugify("Kit Corrente 428H"));
  }

  @Test
  void slugifyReplacesNonAsciiWithHyphen() {
    // 'ç' nao é [a-z0-9] então vira hífen; múltiplos hifens consecutivos colapsam em um
    assertEquals("pe-a-especial", service.slugify("Peça Especial"));
  }

  @Test
  void slugifyRemovesLeadingAndTrailingHyphens() {
    assertEquals("teste", service.slugify("  teste  "));
  }

  @Test
  void normalizeTrimsAndLowercases() {
    assertEquals("texto", service.normalize("  TEXTO  "));
  }

  @Test
  void normalizeCepStripsHyphen() {
    assertEquals("85807080", service.normalizeCep("85807-080"));
  }

  @Test
  void normalizeCepStripsAllNonDigits() {
    assertEquals("85807080", service.normalizeCep("85.807-080"));
  }

  @Test
  void normalizeDocumentStripsMask() {
    assertEquals("12345678909", service.normalizeDocument("123.456.789-09"));
  }

  @Test
  void isValidCepAcceptsEightDigits() {
    assertTrue(service.isValidCep("85807080"));
  }

  @Test
  void isValidCepRejectsFormattedWithHyphen() {
    assertFalse(service.isValidCep("85807-080"));
  }

  @Test
  void isValidCepRejectsShortInput() {
    assertFalse(service.isValidCep("8580"));
  }
}
