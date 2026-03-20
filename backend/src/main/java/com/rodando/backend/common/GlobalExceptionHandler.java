package com.rodando.backend.common;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<Map<String, Object>> handleApi(ApiException exception) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("error", exception.getMessage());
    if (exception.getCode() != null && !exception.getCode().isBlank()) {
      body.put("code", exception.getCode());
    }
    return ResponseEntity.status(exception.getStatus()).body(body);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<Map<String, Object>> handleGeneric(Exception ignored) {
    return ResponseEntity.status(500).body(Map.of("error", "Erro interno do servidor."));
  }
}


