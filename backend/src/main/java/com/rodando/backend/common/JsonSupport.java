package com.rodando.backend.common;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.postgresql.util.PGobject;
import org.springframework.stereotype.Component;

@Component
public class JsonSupport {

  private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
  };

  private final ObjectMapper objectMapper;

  public JsonSupport(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public String write(Object value) {
    try {
      return objectMapper.writeValueAsString(value == null ? Map.of() : value);
    } catch (Exception exception) {
      throw new IllegalStateException("Falha ao serializar JSON.", exception);
    }
  }

  @SuppressWarnings("unchecked")
  public Map<String, Object> readMap(Object value) {
    if (value == null) {
      return new LinkedHashMap<>();
    }
    if (value instanceof Map<?, ?> map) {
      return new LinkedHashMap<>((Map<String, Object>) map);
    }
    String raw = value instanceof PGobject pgObject ? pgObject.getValue() : String.valueOf(value);
    if (raw == null || raw.isBlank()) {
      return new LinkedHashMap<>();
    }
    try {
      return objectMapper.readValue(raw, MAP_TYPE);
    } catch (Exception exception) {
      return new LinkedHashMap<>();
    }
  }

  public List<?> readList(Object value) {
    Object parsed = readMap(write(Map.of("items", value))).get("items");
    return parsed instanceof List<?> list ? list : List.of();
  }
}


