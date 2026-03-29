package com.rodando.backend.owner;

import com.rodando.backend.common.ApiException;
import com.rodando.backend.core.RodandoService;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class OwnerStaffService {

  private final RodandoService service;

  public OwnerStaffService(RodandoService service) {
    this.service = service;
  }

  public Map<String, Object> listStaff() {
    List<Map<String, Object>> items = service.many("""
        SELECT
          u.id,
          u.name,
          u.email,
          u.active,
          u.created_at  AS "createdAt",
          u.updated_at  AS "updatedAt",
          (SELECT MAX(s.created_at)
           FROM sessions s
           WHERE s.user_id = u.id) AS "lastLoginAt"
        FROM users u
        JOIN user_roles  ur ON ur.user_id = u.id
        JOIN roles        r ON  r.id = ur.role_id
        WHERE r.code = 'staff'
        ORDER BY u.created_at DESC
        """).stream().map(this::mapStaffRow).toList();
    return service.orderedMap("items", items);
  }

  public Map<String, Object> createStaff(long ownerUserId, Map<String, Object> body) {
    String name     = service.trim(service.stringValue(body.get("name")));
    String email    = service.normalize(service.stringValue(body.get("email")));
    String password = service.stringValue(body.get("password"));

    if (name.length() < 2) {
      throw new ApiException(400, "Nome deve ter pelo menos 2 caracteres.");
    }
    if (!email.contains("@") || email.length() < 5) {
      throw new ApiException(400, "Email invalido.");
    }
    if (password.length() < 6) {
      throw new ApiException(400, "Senha deve ter pelo menos 6 caracteres.");
    }

    boolean emailTaken = service.one(
        "SELECT 1 FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1", email).isPresent();
    if (emailTaken) {
      throw new ApiException(409, "Email ja cadastrado.");
    }

    long staffId = service.insertId("""
        INSERT INTO users (name, email, password_hash, active, created_by_owner_id, created_at, updated_at)
        VALUES (?, ?, ?, TRUE, ?, NOW(), NOW())
        RETURNING id
        """, name, email, service.hashPassword(password), ownerUserId);

    int inserted = service.run("""
        INSERT INTO user_roles (user_id, role_id)
        SELECT ?, id FROM roles WHERE code = 'staff' LIMIT 1
        """, staffId);
    if (inserted == 0) {
      throw new ApiException(500, "Papel 'staff' nao encontrado. Verifique a migration V9.");
    }

    service.saveOwnerAuditLog(ownerUserId, "staff_create", "user", staffId, Map.of(),
        Map.of("name", name, "email", email));

    Map<String, Object> item = fetchStaff(staffId);
    return service.orderedMap("item", item);
  }

  public Map<String, Object> updateStaff(long ownerUserId, long staffId, Map<String, Object> body) {
    fetchStaff(staffId); // garante que existe e é staff

    String name   = service.trim(service.stringValue(body.get("name")));
    Boolean active = body.get("active") instanceof Boolean b ? b
        : body.containsKey("active") ? Boolean.parseBoolean(service.stringValue(body.get("active"))) : null;

    if (name.isBlank() && active == null) {
      throw new ApiException(400, "Nada para atualizar.");
    }

    if (!name.isBlank()) {
      if (name.length() < 2) throw new ApiException(400, "Nome deve ter pelo menos 2 caracteres.");
      service.run("UPDATE users SET name = ?, updated_at = NOW() WHERE id = ?", name, staffId);
    }
    if (active != null) {
      service.run("UPDATE users SET active = ?, updated_at = NOW() WHERE id = ?", active, staffId);
      // Encerra todas as sessões ao desativar
      if (!active) {
        service.run("DELETE FROM sessions WHERE user_id = ?", staffId);
      }
    }

    Map<String, Object> item = fetchStaff(staffId);
    service.saveOwnerAuditLog(ownerUserId, "staff_update", "user", staffId, Map.of(), item);
    return service.orderedMap("item", item);
  }

  public Map<String, Object> resetStaffPassword(long ownerUserId, long staffId, Map<String, Object> body) {
    fetchStaff(staffId);

    String newPassword = service.stringValue(body.get("password"));
    if (newPassword.length() < 6) {
      throw new ApiException(400, "Nova senha deve ter pelo menos 6 caracteres.");
    }

    service.run("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?",
        service.hashPassword(newPassword), staffId);
    // Invalida sessões existentes — funcionário precisará logar novamente
    service.run("DELETE FROM sessions WHERE user_id = ?", staffId);

    service.saveOwnerAuditLog(ownerUserId, "staff_password_reset", "user", staffId, Map.of(), Map.of());
    return service.orderedMap("ok", true);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private Map<String, Object> fetchStaff(long id) {
    return service.one("""
        SELECT
          u.id, u.name, u.email, u.active,
          u.created_at AS "createdAt",
          u.updated_at AS "updatedAt",
          (SELECT MAX(s.created_at) FROM sessions s WHERE s.user_id = u.id) AS "lastLoginAt"
        FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        JOIN roles       r ON  r.id = ur.role_id
        WHERE u.id = ? AND r.code = 'staff'
        LIMIT 1
        """, id).map(this::mapStaffRow)
        .orElseThrow(() -> new ApiException(404, "Funcionario nao encontrado."));
  }

  private Map<String, Object> mapStaffRow(Map<String, Object> row) {
    return service.orderedMap(
        "id",          service.longValue(row.get("id")),
        "name",        service.stringValue(row.get("name")),
        "email",       service.stringValue(row.get("email")),
        "active",      service.booleanValue(row.get("active")),
        "createdAt",   service.stringValue(row.get("createdAt")),
        "updatedAt",   service.stringValue(row.get("updatedAt")),
        "lastLoginAt", blankString(row.get("lastLoginAt")));
  }

  private String blankString(Object value) {
    String text = service.trim(service.stringValue(value));
    return text.isBlank() ? null : text;
  }
}
