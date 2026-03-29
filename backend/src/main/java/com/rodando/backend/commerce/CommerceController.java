package com.rodando.backend.commerce;

import com.rodando.backend.api.BaseApiController;
import com.rodando.backend.common.ApiException;
import com.rodando.backend.config.AppProperties;
import com.rodando.backend.core.RateLimiterService;
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
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class CommerceController extends BaseApiController {

  private final CommerceService commerceService;

  public CommerceController(
      AppProperties properties,
      RodandoService service,
      RateLimiterService rateLimiter,
      CommerceService commerceService) {
    super(properties, service, rateLimiter);
    this.commerceService = commerceService;
  }

  // ── Bag ──────────────────────────────────────────────────────────────────

  @GetMapping("/bag")
  public Map<String, Object> getBag(HttpServletRequest request) {
    return service.getBag(context(request));
  }

  @PostMapping("/bag/items")
  public ResponseEntity<Map<String, Object>> addBagItem(HttpServletRequest request, @RequestBody Map<String, Object> body) {
    long productId = service.longValue(body.get("productId"));
    int quantity = service.intValue(body.get("quantity"));
    if (productId <= 0) throw new ApiException(400, "productId invalido.");
    if (quantity <= 0 || quantity > 999) throw new ApiException(400, "quantity deve estar entre 1 e 999.");
    List<Map<String, Object>> items = service.addBagItem(context(request), productId, quantity);
    return ResponseEntity.status(HttpStatus.CREATED).body(service.orderedMap("items", items));
  }

  @PutMapping("/bag/items/{productId}")
  public Map<String, Object> updateBagItem(HttpServletRequest request, @PathVariable long productId, @RequestBody Map<String, Object> body) {
    if (productId <= 0) throw new ApiException(400, "productId invalido.");
    int quantity = service.intValue(body.get("quantity"));
    if (quantity < 0 || quantity > 999) throw new ApiException(400, "quantity deve estar entre 0 e 999.");
    return service.orderedMap("items", service.updateBagItem(context(request), productId, quantity));
  }

  @DeleteMapping("/bag/items/{productId}")
  public Map<String, Object> deleteBagItem(HttpServletRequest request, @PathVariable long productId) {
    service.removeBagItem(context(request), productId);
    return service.orderedMap("ok", true);
  }

  @DeleteMapping("/bag")
  public Map<String, Object> clearBag(HttpServletRequest request) {
    service.clearBag(context(request));
    return service.orderedMap("ok", true);
  }

  // ── Orders ───────────────────────────────────────────────────────────────

  @PostMapping("/orders/quote")
  public Map<String, Object> quoteOrder(HttpServletRequest request, @RequestBody Map<String, Object> body) {
    return commerceService.quoteOrder(requireAuth(request), body);
  }

  @PostMapping("/orders/checkout")
  public ResponseEntity<Map<String, Object>> checkoutOrder(HttpServletRequest request, HttpServletResponse response, @RequestBody Map<String, Object> body) {
    enforceRateLimit(response, "checkout", "checkout:" + clientKey(request), properties.checkoutRateLimitWindow(), properties.checkoutRateLimitMax(),
        "Limite temporario de checkout atingido. Aguarde e tente novamente.");
    return ResponseEntity.status(HttpStatus.CREATED).body(commerceService.checkoutOrder(requireAuth(request), body));
  }

  @GetMapping("/orders")
  public Map<String, Object> listOrders(HttpServletRequest request) {
    return commerceService.listOrders(requireAuth(request).id());
  }

  @GetMapping("/orders/{id}")
  public Map<String, Object> getOrder(HttpServletRequest request, @PathVariable long id) {
    return commerceService.getOrder(requireAuth(request).id(), id);
  }

  @GetMapping("/orders/{id}/events")
  public Map<String, Object> orderEvents(HttpServletRequest request, @PathVariable long id) {
    return commerceService.listOrderEvents(requireAuth(request).id(), id);
  }

  @PostMapping("/orders/{id}/cancel")
  public Map<String, Object> cancelOrder(HttpServletRequest request, @PathVariable long id) {
    return commerceService.cancelOrder(requireAuth(request).id(), id);
  }

  @PostMapping("/orders/{id}/payment/sync")
  public Map<String, Object> syncOrderPayment(HttpServletRequest request, @PathVariable long id) {
    return commerceService.syncOrderPayment(requireAuth(request).id(), id);
  }

  // ── Payments ─────────────────────────────────────────────────────────────

  @PostMapping("/payments/mercadopago/complete")
  public Map<String, Object> completeMercadoPago(
      HttpServletRequest request,
      HttpServletResponse response,
      @RequestBody Map<String, Object> body) {
    enforceRateLimit(response, "payment-callback", "payment-callback:" + clientKey(request), properties.paymentCallbackRateLimitWindow(),
        properties.paymentCallbackRateLimitMax(), "Muitas confirmacoes de pagamento. Aguarde alguns instantes.");
    return commerceService.completeMercadoPago(requireAuth(request).id(), service.stringValue(body.get("token")));
  }

  @PostMapping("/payments/webhooks/mercadopago")
  public Map<String, Object> mercadoPagoWebhook(
      HttpServletRequest request,
      HttpServletResponse response,
      @RequestHeader(value = "x-signature", required = false) String signature,
      @RequestHeader(value = "x-request-id", required = false) String requestId,
      @RequestBody Map<String, Object> body) {
    // Valida assinatura ANTES do rate limit para que requisições sem assinatura
    // válida não consumam o budget de rate de fontes legítimas.
    String dataId = "";
    Object data = body.get("data");
    if (data instanceof Map<?, ?> dataMap) {
      Object id = dataMap.get("id");
      dataId = id != null ? String.valueOf(id) : "";
    }
    commerceService.validateMercadoPagoSignature(signature, requestId, dataId);
    enforceRateLimit(response, "webhook", "webhook:mercadopago:" + clientKey(request), properties.webhookRateLimitWindow(),
        properties.webhookRateLimitMax(), "Limite de webhook excedido.");
    return commerceService.handleMercadoPagoWebhook(signature, requestId, body);
  }

  @PostMapping("/payments/webhooks/stripe")
  public Map<String, Object> stripeWebhook(
      HttpServletRequest request,
      HttpServletResponse response,
      @RequestHeader(value = "stripe-signature", required = false) String signature,
      @RequestBody Map<String, Object> body) {
    // Valida assinatura ANTES do rate limit — idem ao MercadoPago.
    commerceService.validateStripeSignature(signature);
    enforceRateLimit(response, "webhook", "webhook:stripe:" + clientKey(request), properties.webhookRateLimitWindow(),
        properties.webhookRateLimitMax(), "Limite de webhook excedido.");
    return commerceService.handleStripeWebhook(signature, body);
  }
}
