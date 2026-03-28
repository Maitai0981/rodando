package com.rodando.backend.auth;
import com.rodando.backend.api.BaseApiController;

import com.rodando.backend.account.AccountService;
import com.rodando.backend.auth.AuthContext;
import com.rodando.backend.core.RateLimiterService;
import com.rodando.backend.config.AppProperties;
import com.rodando.backend.core.RodandoService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/auth")
public class AuthController extends BaseApiController {

  private final AccountService accountService;

  public AuthController(
      AppProperties properties,
      RodandoService service,
      RateLimiterService rateLimiter,
      AccountService accountService) {
    super(properties, service, rateLimiter);
    this.accountService = accountService;
  }

  @GetMapping("/me")
  public Map<String, Object> me(HttpServletRequest request) {
    return accountService.mePayload(context(request));
  }

  @PostMapping("/signup")
  public ResponseEntity<Map<String, Object>> signup(
      HttpServletRequest request,
      HttpServletResponse response,
      @RequestBody Map<String, Object> body) {
    enforceRateLimit(
        response,
        "auth",
        "signup:" + clientKey(request),
        properties.authRateLimitWindow(),
        properties.authRateLimitMax(),
        "Muitas tentativas de autenticacao. Aguarde e tente novamente.");
    Map<String, Object> payload = accountService.signUp(body, context(request));
    Map<String, Object> user = mapValue(payload.get("user"));
    AccountService.SessionInfo session = accountService.createSession(service.longValue(user.get("id")));
    setSessionCookie(response, session.token());
    return ResponseEntity.status(HttpStatus.CREATED).body(payload);
  }

  @PostMapping("/signin")
  public Map<String, Object> signin(
      HttpServletRequest request,
      HttpServletResponse response,
      @RequestBody Map<String, Object> body) {
    enforceRateLimit(
        response,
        "auth",
        "signin:" + clientKey(request),
        properties.authRateLimitWindow(),
        properties.authRateLimitMax(),
        "Muitas tentativas de autenticacao. Aguarde e tente novamente.");
    Map<String, Object> payload = accountService.signIn(body, context(request), false);
    Map<String, Object> user = mapValue(payload.get("user"));
    AccountService.SessionInfo session = accountService.createSession(service.longValue(user.get("id")));
    setSessionCookie(response, session.token());
    return payload;
  }

  @PostMapping("/owner/signin")
  public Map<String, Object> ownerSignin(
      HttpServletRequest request,
      HttpServletResponse response,
      @RequestBody Map<String, Object> body) {
    enforceRateLimit(
        response,
        "auth",
        "owner-signin:" + clientKey(request),
        properties.authRateLimitWindow(),
        properties.authRateLimitMax(),
        "Muitas tentativas de autenticacao. Aguarde e tente novamente.");
    Map<String, Object> payload = accountService.signIn(body, context(request), true);
    Map<String, Object> user = mapValue(payload.get("user"));
    AccountService.SessionInfo session = accountService.createSession(service.longValue(user.get("id")));
    setSessionCookie(response, session.token());
    return payload;
  }

  @PostMapping("/logout")
  public Map<String, Object> logout(HttpServletRequest request, HttpServletResponse response) {
    AuthContext auth = context(request);
    if (auth.token() != null) {
      accountService.deleteSessionByToken(auth.token());
    }
    clearSessionCookie(response);
    return service.orderedMap("ok", true);
  }

  @PatchMapping("/profile")
  public Map<String, Object> updateProfile(HttpServletRequest request, @RequestBody Map<String, Object> body) {
    return accountService.updateProfile(requireAuth(request).id(), body);
  }

  @PatchMapping("/profile/password")
  public Map<String, Object> changePassword(HttpServletRequest request, @RequestBody Map<String, Object> body) {
    return accountService.changePassword(requireAuth(request).id(), body);
  }

  @PostMapping("/profile/avatar")
  public Map<String, Object> uploadAvatar(
      HttpServletRequest request,
      @RequestParam("image") MultipartFile image) {
    // Uploads são servidos pelo próprio backend — usar URL do servidor, não do frontend
    String baseUrl = request.getScheme() + "://" + request.getServerName() + ":" + request.getServerPort();
    return accountService.uploadAvatar(requireAuth(request).id(), image, baseUrl);
  }

  @PostMapping("/password-reset/request")
  public Map<String, Object> requestPasswordReset(
      HttpServletRequest request,
      HttpServletResponse response,
      @RequestBody Map<String, Object> body) {
    enforceRateLimit(
        response,
        "auth",
        "pwd-reset-request:" + clientKey(request),
        properties.authRateLimitWindow(),
        properties.authRateLimitMax(),
        "Muitas tentativas. Aguarde e tente novamente.");
    return accountService.requestPasswordReset(body);
  }

  @PostMapping("/password-reset/confirm")
  public Map<String, Object> confirmPasswordReset(
      HttpServletRequest request,
      HttpServletResponse response,
      @RequestBody Map<String, Object> body) {
    enforceRateLimit(
        response,
        "auth",
        "pwd-reset-confirm:" + clientKey(request),
        properties.authRateLimitWindow(),
        properties.authRateLimitMax(),
        "Muitas tentativas. Aguarde e tente novamente.");
    return accountService.confirmPasswordReset(body);
  }

  @PostMapping("/password-change/request-code")
  public Map<String, Object> requestPasswordChangeCode(HttpServletRequest request, HttpServletResponse response) {
    enforceRateLimit(
        response,
        "auth",
        "pwd-change-request:" + clientKey(request),
        properties.authRateLimitWindow(),
        properties.authRateLimitMax(),
        "Muitas tentativas. Aguarde e tente novamente.");
    return accountService.requestPasswordChangeCode(requireAuth(request).id());
  }

  @PostMapping("/password-change/confirm")
  public Map<String, Object> confirmPasswordChange(
      HttpServletRequest request,
      HttpServletResponse response,
      @RequestBody Map<String, Object> body) {
    enforceRateLimit(
        response,
        "auth",
        "pwd-change-confirm:" + clientKey(request),
        properties.authRateLimitWindow(),
        properties.authRateLimitMax(),
        "Muitas tentativas. Aguarde e tente novamente.");
    return accountService.confirmPasswordChange(requireAuth(request).id(), body);
  }

  @PostMapping("/email-change/request-code")
  public Map<String, Object> requestEmailChangeCode(
      HttpServletRequest request,
      HttpServletResponse response,
      @RequestBody Map<String, Object> body) {
    enforceRateLimit(
        response,
        "auth",
        "email-change-request:" + clientKey(request),
        properties.authRateLimitWindow(),
        properties.authRateLimitMax(),
        "Muitas tentativas. Aguarde e tente novamente.");
    return accountService.requestEmailChangeCode(requireAuth(request).id(), body);
  }

  @PostMapping("/email-change/confirm")
  public Map<String, Object> confirmEmailChange(
      HttpServletRequest request,
      HttpServletResponse response,
      @RequestBody Map<String, Object> body) {
    enforceRateLimit(
        response,
        "auth",
        "email-change-confirm:" + clientKey(request),
        properties.authRateLimitWindow(),
        properties.authRateLimitMax(),
        "Muitas tentativas. Aguarde e tente novamente.");
    Map<String, Object> result = accountService.confirmEmailChange(requireAuth(request).id(), body);
    return result;
  }

  @GetMapping("/addresses")
  public Map<String, Object> listAddresses(HttpServletRequest request) {
    List<Map<String, Object>> items = accountService.listUserAddresses(requireAuth(request).id());
    Long defaultAddressId = items.stream()
        .filter(item -> service.booleanValue(item.get("isDefault")))
        .map(item -> service.longValue(item.get("id")))
        .findFirst()
        .orElse(null);
    return service.orderedMap("items", items, "defaultAddressId", defaultAddressId);
  }

  @PostMapping("/addresses")
  public ResponseEntity<Map<String, Object>> createAddress(HttpServletRequest request, @RequestBody Map<String, Object> body) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(service.orderedMap("item", accountService.createAddress(requireAuth(request).id(), body)));
  }

  @PutMapping("/addresses/{id}")
  public Map<String, Object> updateAddress(HttpServletRequest request, @PathVariable long id, @RequestBody Map<String, Object> body) {
    return service.orderedMap("item", accountService.updateAddress(requireAuth(request).id(), id, body));
  }

  @PatchMapping("/addresses/{id}/default")
  public Map<String, Object> setDefaultAddress(HttpServletRequest request, @PathVariable long id) {
    return accountService.setDefaultAddress(requireAuth(request).id(), id);
  }

  @DeleteMapping("/addresses/{id}")
  public Map<String, Object> deleteAddress(HttpServletRequest request, @PathVariable long id) {
    accountService.deleteAddress(requireAuth(request).id(), id);
    return service.orderedMap("ok", true);
  }
}
