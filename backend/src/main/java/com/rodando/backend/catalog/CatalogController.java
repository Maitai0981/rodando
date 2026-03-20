package com.rodando.backend.catalog;

import com.rodando.backend.api.BaseApiController;
import com.rodando.backend.common.ApiException;
import com.rodando.backend.config.AppProperties;
import com.rodando.backend.core.RateLimiterService;
import com.rodando.backend.core.RodandoService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class CatalogController extends BaseApiController {

  private final CatalogService catalogService;

  public CatalogController(
      AppProperties properties,
      RodandoService service,
      RateLimiterService rateLimiter,
      CatalogService catalogService) {
    super(properties, service, rateLimiter);
    this.catalogService = catalogService;
  }

  @GetMapping("/comments")
  public Map<String, Object> listComments(
      @RequestParam(value = "productId", required = false) Long productId,
      @RequestParam(value = "limit", required = false) Integer limit) {
    return catalogService.listComments(productId, limit);
  }

  @PostMapping("/comments")
  public ResponseEntity<Map<String, Object>> createComment(HttpServletRequest request, @RequestBody Map<String, Object> body) {
    return ResponseEntity.status(HttpStatus.CREATED).body(catalogService.createComment(requireAuth(request).id(), body));
  }

  @GetMapping("/products")
  public Map<String, Object> listProducts(@RequestParam Map<String, String> query) {
    return catalogService.listProducts(query);
  }

  @GetMapping("/products/{id}")
  public Map<String, Object> getProduct(@PathVariable long id) {
    Map<String, Object> payload = catalogService.getPublicProductDetails(id);
    if (payload == null) {
      throw new ApiException(404, "Produto nao encontrado.");
    }
    return payload;
  }

  @GetMapping("/catalog/highlights")
  public Map<String, Object> highlights() {
    return catalogService.listHighlights();
  }

  @GetMapping("/catalog/categories")
  public Map<String, Object> catalogCategories() {
    return catalogService.listCategories();
  }

  @GetMapping("/catalog/recommendations")
  public Map<String, Object> recommendations(
      @RequestParam(value = "exclude", required = false) String exclude,
      @RequestParam(value = "limit", required = false) Integer limit) {
    return catalogService.listRecommendations(exclude, limit);
  }

  @GetMapping("/offers")
  public Map<String, Object> offers() {
    return catalogService.listOffers();
  }
}
