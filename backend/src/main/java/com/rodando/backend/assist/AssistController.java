package com.rodando.backend.assist;

import com.rodando.backend.api.BaseApiController;
import com.rodando.backend.config.AppProperties;
import com.rodando.backend.core.RateLimiterService;
import com.rodando.backend.core.RodandoService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ux/assist")
public class AssistController extends BaseApiController {

  private final AssistService assistService;

  public AssistController(
      AppProperties properties,
      RodandoService service,
      RateLimiterService rateLimiter,
      AssistService assistService) {
    super(properties, service, rateLimiter);
    this.assistService = assistService;
  }

  @GetMapping("/state")
  public Map<String, Object> state(HttpServletRequest request, @RequestParam(value = "scope", required = false) String scope) {
    return assistService.listState(requireAuth(request).id(), scope);
  }

  @PutMapping("/state")
  public Map<String, Object> updateState(HttpServletRequest request, @RequestBody Map<String, Object> body) {
    return assistService.updateState(requireAuth(request).id(), body);
  }

  @PostMapping("/reset")
  public Map<String, Object> resetState(HttpServletRequest request, @RequestParam(value = "scope", required = false) String scope) {
    return assistService.resetState(requireAuth(request).id(), scope);
  }
}
