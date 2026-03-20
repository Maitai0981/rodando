package com.rodando.backend.ops;

import com.rodando.backend.auth.AuthContext;
import com.rodando.backend.common.ApiException;
import com.rodando.backend.core.RodandoService;
import com.rodando.backend.ops.OpsService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import java.util.Objects;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class OpsController {

  private final RodandoService service;
  private final OpsService opsService;

  public OpsController(RodandoService service, OpsService opsService) {
    this.service = service;
    this.opsService = opsService;
  }

  @GetMapping(value = "/ops", produces = MediaType.TEXT_HTML_VALUE)
  public ResponseEntity<Resource> ops(HttpServletRequest request) {
    requireOwner(request);
    return ResponseEntity.ok().contentType(Objects.requireNonNull(MediaType.TEXT_HTML)).body(opsService.opsIndex());
  }

  @GetMapping("/ops/assets/{fileName:.+}")
  public ResponseEntity<Resource> opsAsset(HttpServletRequest request, @PathVariable String fileName) {
    requireOwner(request);
    if (!"ops.css".equals(fileName) && !"ops.js".equals(fileName)) {
      throw new ApiException(404, "Asset nao encontrado.");
    }
    MediaType mediaType = fileName.endsWith(".css")
        ? Objects.requireNonNull(MediaType.valueOf("text/css"))
        : Objects.requireNonNull(MediaType.valueOf("application/javascript"));
    return ResponseEntity.ok().contentType(mediaType).body(opsService.opsAsset(fileName));
  }

  @GetMapping("/api/owner/ops/requests")
  public Map<String, Object> requests(HttpServletRequest request, @RequestParam Map<String, String> query) {
    requireOwner(request);
    return opsService.listRequests(query);
  }

  @GetMapping("/api/owner/ops/db/tables")
  public Map<String, Object> tables(HttpServletRequest request) {
    requireOwner(request);
    return opsService.listTables();
  }

  @GetMapping("/api/owner/ops/db/table/{table}")
  public Map<String, Object> previewTable(
      HttpServletRequest request,
      @PathVariable String table,
      @RequestParam Map<String, String> query) {
    requireOwner(request);
    return opsService.previewTable(table, query);
  }

  @PostMapping("/api/owner/ops/db/sql/challenge")
  public Map<String, Object> createChallenge(HttpServletRequest request, @RequestBody Map<String, Object> body) {
    requireOwner(request);
    return opsService.createSqlChallenge(service.stringValue(body.get("sql")));
  }

  @PostMapping("/api/owner/ops/db/sql")
  public ResponseEntity<Map<String, Object>> executeSql(HttpServletRequest request, @RequestBody Map<String, Object> body) {
    AuthContext.AuthUser user = requireOwner(request);
    return ResponseEntity.status(HttpStatus.OK).body(opsService.executeSql(user.id(), body));
  }

  private AuthContext.AuthUser requireOwner(HttpServletRequest request) {
    Object auth = request.getAttribute(AuthContext.ATTRIBUTE);
    if (!(auth instanceof AuthContext context) || !context.authenticated()) {
      throw new ApiException(401, "Autenticacao necessaria.");
    }
    if (!"owner".equals(service.normalize(context.user().role()))) {
      throw new ApiException(403, "Acesso restrito ao owner.");
    }
    return context.user();
  }
}


