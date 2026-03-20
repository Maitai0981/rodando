package com.rodando.backend.owner;

import com.rodando.backend.api.BaseApiController;
import com.rodando.backend.auth.AuthContext;
import com.rodando.backend.commerce.CommerceService;
import com.rodando.backend.config.AppProperties;
import com.rodando.backend.core.RateLimiterService;
import com.rodando.backend.core.RodandoService;
import jakarta.servlet.http.HttpServletRequest;
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
@RequestMapping("/api/owner")
public class OwnerController extends BaseApiController {

  private final OwnerService ownerService;
  private final CommerceService commerceService;
  private final OwnerOfferService ownerOfferService;
  private final OwnerSupportService ownerSupportService;

  public OwnerController(
      AppProperties properties,
      RodandoService service,
      RateLimiterService rateLimiter,
      OwnerService ownerService,
      CommerceService commerceService,
      OwnerOfferService ownerOfferService,
      OwnerSupportService ownerSupportService) {
    super(properties, service, rateLimiter);
    this.ownerService = ownerService;
    this.commerceService = commerceService;
    this.ownerOfferService = ownerOfferService;
    this.ownerSupportService = ownerSupportService;
  }

  // ── Products ─────────────────────────────────────────────────────────────

  @GetMapping("/dashboard")
  public Map<String, Object> dashboard(HttpServletRequest request, @RequestParam Map<String, String> query) {
    requireOwner(request);
    return ownerService.dashboard(query);
  }

  @GetMapping("/products")
  public Map<String, Object> listProducts(HttpServletRequest request, @RequestParam(value = "q", required = false) String q) {
    requireOwner(request);
    return ownerService.listProducts(q);
  }

  @GetMapping("/products/{id}")
  public Map<String, Object> getProduct(HttpServletRequest request, @PathVariable long id) {
    requireOwner(request);
    return ownerService.getProduct(id);
  }

  @PostMapping("/products")
  public ResponseEntity<Map<String, Object>> createProduct(HttpServletRequest request, @RequestBody Map<String, Object> body) {
    AuthContext.AuthUser user = requireOwner(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(ownerService.createProduct(user.id(), body));
  }

  @PutMapping("/products/{id}")
  public Map<String, Object> updateProduct(HttpServletRequest request, @PathVariable long id, @RequestBody Map<String, Object> body) {
    return ownerService.updateProduct(requireOwner(request).id(), id, body);
  }

  @DeleteMapping("/products/{id}")
  public ResponseEntity<Void> deleteProduct(HttpServletRequest request, @PathVariable long id) {
    ownerService.deleteProduct(requireOwner(request).id(), id);
    return ResponseEntity.noContent().build();
  }

  // ── Settings ─────────────────────────────────────────────────────────────

  @GetMapping("/settings")
  public Map<String, Object> getSettings(HttpServletRequest request) {
    return ownerService.getSettings(requireOwner(request).id());
  }

  @PutMapping("/settings")
  public Map<String, Object> updateSettings(HttpServletRequest request, @RequestBody Map<String, Object> body) {
    return ownerService.updateSettings(requireOwner(request).id(), body);
  }

  // ── Orders ───────────────────────────────────────────────────────────────

  @GetMapping("/orders")
  public Map<String, Object> listOrders(HttpServletRequest request, @RequestParam Map<String, String> query) {
    requireOwner(request);
    return commerceService.listOwnerOrders(query);
  }

  @GetMapping("/orders/{id}")
  public Map<String, Object> getOrder(HttpServletRequest request, @PathVariable long id) {
    requireOwner(request);
    return commerceService.getOwnerOrder(id);
  }

  @PatchMapping("/orders/{id}/status")
  public Map<String, Object> updateOrderStatus(HttpServletRequest request, @PathVariable long id, @RequestBody Map<String, Object> body) {
    return commerceService.updateOwnerOrderStatus(requireOwner(request).id(), id, service.stringValue(body.get("status")));
  }

  // ── Offers ───────────────────────────────────────────────────────────────

  @GetMapping("/offers")
  public Map<String, Object> offers(HttpServletRequest request) {
    requireOwner(request);
    return ownerOfferService.listOffers();
  }

  @PostMapping("/offers")
  public ResponseEntity<Map<String, Object>> createOffer(HttpServletRequest request, @RequestBody Map<String, Object> body) {
    return ResponseEntity.status(HttpStatus.CREATED).body(ownerOfferService.createOffer(requireOwner(request).id(), body));
  }

  @PutMapping("/offers/{id}")
  public Map<String, Object> updateOffer(HttpServletRequest request, @PathVariable long id, @RequestBody Map<String, Object> body) {
    return ownerOfferService.updateOffer(requireOwner(request).id(), id, body);
  }

  @DeleteMapping("/offers/{id}")
  public ResponseEntity<Void> deleteOffer(HttpServletRequest request, @PathVariable long id) {
    ownerOfferService.deleteOffer(requireOwner(request).id(), id);
    return ResponseEntity.noContent().build();
  }

  // ── Shipping promotions ───────────────────────────────────────────────────

  @GetMapping("/shipping-promotions")
  public Map<String, Object> shippingPromotions(HttpServletRequest request) {
    requireOwner(request);
    return ownerOfferService.listShippingPromotions();
  }

  @PostMapping("/shipping-promotions")
  public ResponseEntity<Map<String, Object>> createShippingPromotion(HttpServletRequest request, @RequestBody Map<String, Object> body) {
    requireOwner(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(ownerOfferService.createShippingPromotion(body));
  }

  @PutMapping("/shipping-promotions/{id}")
  public Map<String, Object> updateShippingPromotion(HttpServletRequest request, @PathVariable long id, @RequestBody Map<String, Object> body) {
    requireOwner(request);
    return ownerOfferService.updateShippingPromotion(id, body);
  }

  @DeleteMapping("/shipping-promotions/{id}")
  public ResponseEntity<Void> deleteShippingPromotion(HttpServletRequest request, @PathVariable long id) {
    requireOwner(request);
    ownerOfferService.deleteShippingPromotion(id);
    return ResponseEntity.noContent().build();
  }

  // ── Support & analytics ───────────────────────────────────────────────────

  @GetMapping("/analytics/orders")
  public Map<String, Object> orderAnalytics(HttpServletRequest request, @RequestParam(value = "period", required = false) String period) {
    requireOwner(request);
    return ownerSupportService.orderAnalytics(period);
  }

  @GetMapping("/returns")
  public Map<String, Object> returns(
      HttpServletRequest request,
      @RequestParam(value = "status", required = false) String status,
      @RequestParam(value = "productId", required = false) Long productId,
      @RequestParam(value = "limit", required = false) Integer limit) {
    requireOwner(request);
    return ownerSupportService.listReturns(status, productId, limit);
  }

  @PostMapping("/returns")
  public ResponseEntity<Map<String, Object>> createReturn(HttpServletRequest request, @RequestBody Map<String, Object> body) {
    return ResponseEntity.status(HttpStatus.CREATED).body(ownerSupportService.createReturn(requireOwner(request).id(), body));
  }

  @PatchMapping("/returns/{id}")
  public Map<String, Object> updateReturn(HttpServletRequest request, @PathVariable long id, @RequestBody Map<String, Object> body) {
    return ownerSupportService.updateReturn(requireOwner(request).id(), id, body);
  }

  @GetMapping("/complaints")
  public Map<String, Object> complaints(
      HttpServletRequest request,
      @RequestParam(value = "status", required = false) String status,
      @RequestParam(value = "productId", required = false) Long productId,
      @RequestParam(value = "limit", required = false) Integer limit) {
    requireOwner(request);
    return ownerSupportService.listComplaints(status, productId, limit);
  }

  @PostMapping("/complaints")
  public ResponseEntity<Map<String, Object>> createComplaint(HttpServletRequest request, @RequestBody Map<String, Object> body) {
    return ResponseEntity.status(HttpStatus.CREATED).body(ownerSupportService.createComplaint(requireOwner(request).id(), body));
  }

  @PatchMapping("/complaints/{id}")
  public Map<String, Object> updateComplaint(HttpServletRequest request, @PathVariable long id, @RequestBody Map<String, Object> body) {
    return ownerSupportService.updateComplaint(requireOwner(request).id(), id, body);
  }

  @GetMapping("/audit-logs")
  public Map<String, Object> auditLogs(HttpServletRequest request, @RequestParam(value = "limit", required = false) Integer limit) {
    requireOwner(request);
    return ownerSupportService.listAuditLogs(limit);
  }

  // ── Uploads ───────────────────────────────────────────────────────────────

  @PostMapping("/uploads")
  public ResponseEntity<Map<String, Object>> upload(HttpServletRequest request, @RequestParam("image") MultipartFile image) {
    AuthContext.AuthUser user = requireOwner(request);
    String baseUrl = request.getScheme() + "://" + request.getServerName()
        + ((request.getServerPort() == 80 || request.getServerPort() == 443) ? "" : ":" + request.getServerPort());
    return ResponseEntity.status(HttpStatus.CREATED).body(ownerSupportService.uploadImage(user.id(), image, baseUrl));
  }
}
