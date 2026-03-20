package com.rodando.backend.assist;

import com.rodando.backend.assist.AssistService;
import com.rodando.backend.auth.AuthContext;
import com.rodando.backend.common.ApiException;
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
public class AssistController {

  private final AssistService assistService;

  public AssistController(AssistService assistService) {
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

  private AuthContext.AuthUser requireAuth(HttpServletRequest request) {
    Object auth = request.getAttribute(AuthContext.ATTRIBUTE);
    if (!(auth instanceof AuthContext context) || !context.authenticated()) {
      throw new ApiException(401, "Autenticacao necessaria.");
    }
    return context.user();
  }
}


