package com.rodando.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rodando.backend.commerce.CommerceService;
import java.util.Base64;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class CommerceServicePixQrTests {

  @Autowired
  private CommerceService commerceService;

  @Test
  void generatesPixQrAsPngBase64() {
    String pixCode = "00020126580014BR.GOV.BCB.PIX0136pedido-99@rodando.local";

    String base64 = commerceService.generatePixQrImage(pixCode);
    byte[] pngBytes = Base64.getDecoder().decode(base64);

    assertNotNull(base64);
    assertTrue(base64.length() > 500, "QR Code deve gerar uma imagem PNG real, nao um placeholder minimo.");
    assertTrue(pngBytes.length > 300, "PNG do QR Code deve ter conteudo suficiente para renderizar o codigo.");
    assertEquals((byte) 0x89, pngBytes[0], "PNG precisa manter cabecalho valido.");
    assertEquals((byte) 0x50, pngBytes[1], "PNG precisa manter cabecalho valido.");
    assertEquals((byte) 0x4E, pngBytes[2], "PNG precisa manter cabecalho valido.");
    assertEquals((byte) 0x47, pngBytes[3], "PNG precisa manter cabecalho valido.");
  }
}


