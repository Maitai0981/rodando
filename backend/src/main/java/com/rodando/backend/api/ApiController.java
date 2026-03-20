package com.rodando.backend.api;

import com.rodando.backend.common.ApiException;
import com.rodando.backend.config.AppProperties;
import com.rodando.backend.core.RateLimiterService;
import com.rodando.backend.core.RodandoService;
import com.rodando.backend.ops.OpsService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints de sistema: health, readiness, métricas e reset E2E.
 * Endpoints de negócio estão em CatalogController, CommerceController, OwnerController.
 */
@RestController
@RequestMapping("/api")
public class ApiController extends BaseApiController {

  private final OpsService opsService;

  public ApiController(
      AppProperties properties,
      RodandoService service,
      RateLimiterService rateLimiter,
      OpsService opsService) {
    super(properties, service, rateLimiter);
    this.opsService = opsService;
  }

  @GetMapping("/health")
  public Map<String, Object> health() {
    return opsService.health();
  }

  @GetMapping("/ready")
  public ResponseEntity<Map<String, Object>> ready() {
    Map<String, Object> payload = opsService.ready();
    return "not_ready".equals(payload.get("status"))
        ? ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(payload)
        : ResponseEntity.ok(payload);
  }

  @GetMapping("/metrics")
  public Map<String, Object> metrics() {
    return opsService.metrics();
  }

  @PostMapping("/test/reset-non-user")
  public Map<String, Object> resetNonUser(@RequestHeader(value = "x-e2e-reset-token", required = false) String token) {
    if (!properties.e2eAllowReset()) {
      throw new ApiException(403, "Reset E2E desabilitado no ambiente atual.");
    }
    if (properties.e2eResetToken().isBlank() || !properties.e2eResetToken().equals(service.trim(token))) {
      throw new ApiException(401, "Token de reset E2E invalido.");
    }
    Map<String, Object> before = service.collectOperationalCounts();
    service.resetNonUserData(true);
    int removed = service.purgeDemoUsers();
    service.ensureSeedOwner();
    return service.orderedMap("ok", true, "removedDemoUsers", removed, "before", before, "after", service.collectOperationalCounts());
  }
}
