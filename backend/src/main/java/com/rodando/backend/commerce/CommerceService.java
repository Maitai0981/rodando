package com.rodando.backend.commerce;
import com.rodando.backend.core.RodandoService;
import com.rodando.backend.core.StoreDefaults;

import com.rodando.backend.auth.AuthContext;
import com.rodando.backend.common.ApiException;
import com.rodando.backend.common.JsonSupport;
import com.rodando.backend.config.AppProperties;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import javax.imageio.ImageIO;
import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.client.payment.PaymentCreateRequest;
import com.mercadopago.client.payment.PaymentPayerIdentificationRequest;
import com.mercadopago.client.payment.PaymentPayerRequest;
import com.mercadopago.client.preference.PreferenceBackUrlsRequest;
import com.mercadopago.client.preference.PreferenceClient;
import com.mercadopago.client.preference.PreferenceItemRequest;
import com.mercadopago.client.preference.PreferencePayerRequest;
import com.mercadopago.client.preference.PreferenceRequest;
import com.mercadopago.client.preference.PreferenceShipmentsRequest;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
import com.mercadopago.net.MPRequestOptions;
import com.mercadopago.resources.payment.Payment;
import com.mercadopago.resources.preference.Preference;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

@Service
public class CommerceService {

  private static final int PIX_QR_IMAGE_SIZE = 320;

  private final RodandoService service;
  private final AppProperties properties;
  private final JsonSupport jsonSupport;
  private final WebClient webClient;

  public CommerceService(RodandoService service, AppProperties properties, JsonSupport jsonSupport, WebClient webClient) {
    this.service = service;
    this.properties = properties;
    this.jsonSupport = jsonSupport;
    this.webClient = webClient;
  }

  private String parseDeliveryMethod(Object value) {
    String normalized = service.normalize(service.stringValue(value));
    return List.of("pickup", "delivery").contains(normalized) ? normalized : "";
  }

  private String parsePaymentMethod(Object value) {
    String normalized = service.normalize(service.stringValue(value));
    return List.of("card_credit", "card_debit", "pix").contains(normalized) ? normalized : "";
  }

  private int clamp(String value, int fallback, int min, int max) {
    try {
      return Math.max(min, Math.min(max, Integer.parseInt(service.trim(value))));
    } catch (Exception ignored) {
      return fallback;
    }
  }

  private String normalizeCity(String value) {
    return service.trim(value)
        .toLowerCase(Locale.ROOT)
        .replace("á", "a")
        .replace("à", "a")
        .replace("â", "a")
        .replace("ã", "a")
        .replace("é", "e")
        .replace("ê", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ô", "o")
        .replace("õ", "o")
        .replace("ú", "u")
        .replace("ç", "c");
  }

  private double toRad(double value) {
    return value * Math.PI / 180.0d;
  }

  private Double haversineDistanceKm(Double lat1, Double lng1, Double lat2, Double lng2) {
    if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) {
      return null;
    }
    double dLat = toRad(lat2 - lat1);
    double dLng = toRad(lng2 - lng1);
    double h = Math.sin(dLat / 2) * Math.sin(dLat / 2)
        + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    double c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return round2(6371 * c);
  }

  private double fallbackDistanceKm(Map<String, Object> address, Map<String, Object> settings) {
    boolean sameCity = normalizeCity(service.stringValue(address.get("city")))
        .equals(normalizeCity(service.stringValue(settings.get("storeAddressCity"))));
    if (sameCity) {
      return 12.0d;
    }
    boolean sameState = service.stringValue(address.get("state")).equalsIgnoreCase(service.stringValue(settings.get("storeAddressState")));
    return sameState ? 180.0d : 520.0d;
  }

  private BigDecimal bd(Object value) {
    return service.decimalValue(value).setScale(2, RoundingMode.HALF_UP);
  }

  private double round2(double value) {
    return Math.round(value * 100.0d) / 100.0d;
  }

  private String resolvePaymentProvider(String paymentMethod) {
    return "pix".equals(paymentMethod) ? properties.paymentPixProvider() : properties.paymentCardProvider();
  }

  private boolean isImmediateOrderConfirmationStatus(String status) {
    String normalized = service.normalize(status);
    return "authorized".equals(normalized) || "paid".equals(normalized);
  }

  private boolean isTerminalFailedPaymentStatus(String status) {
    return List.of("rejected", "cancelled", "expired").contains(service.normalize(status));
  }

  private String normalizeProviderPaymentStatus(String provider, String value) {
    String normalized = service.stringValue(value).trim().toLowerCase(Locale.ROOT);
    if ("stripe".equals(provider)) {
      return switch (normalized) {
        case "requires_payment_method", "requires_confirmation", "requires_action" -> "requires_action";
        case "requires_capture" -> "authorized";
        case "succeeded" -> "paid";
        case "canceled" -> "cancelled";
        default -> "pending";
      };
    }
    if ("mercado_pago".equals(provider)) {
      return switch (normalized) {
        case "approved", "paid", "payment.approved" -> "paid";
        case "authorized" -> "authorized";
        case "rejected", "payment.rejected" -> "rejected";
        case "cancelled", "canceled", "payment.cancelled", "payment.canceled" -> "cancelled";
        default -> "pending";
      };
    }
    return "pending";
  }

  private Map<String, Object> defaultOwnerSettings(Long ownerUserId) {
    return service.orderedMap(
        "ownerUserId", ownerUserId,
        "salesAlertEmail", "",
        "salesAlertWhatsapp", "",
        "storeName", "Rodando Moto Center",
        "storeAddressStreet", "Av. Brasil, 8708",
        "storeAddressNumber", "",
        "storeAddressComplement", "",
        "storeAddressDistrict", "",
        "storeAddressCity", StoreDefaults.CITY,
        "storeAddressState", StoreDefaults.STATE,
        "storeAddressCep", "85807080",
        "storeLat", StoreDefaults.LAT,
        "storeLng", StoreDefaults.LNG,
        "freeShippingGlobalMin", RodandoService.FREE_SHIPPING_TARGET,
        "taxProfile", "simples_nacional",
        "taxPercent", 0.06d,
        "gatewayFeePercent", 0.049d,
        "gatewayFixedFee", 0.0d,
        "operationalPercent", 0.03d,
        "packagingCost", 0.0d,
        "blockBelowMinimum", false,
        "createdAt", null,
        "updatedAt", null);
  }

  private Map<String, Object> mapOwnerSettingsRow(Map<String, Object> row) {
    if (row == null) {
      return defaultOwnerSettings(null);
    }
    return service.orderedMap(
        "ownerUserId", service.longValue(row.get("owner_user_id")),
        "salesAlertEmail", service.stringValue(row.get("sales_alert_email")),
        "salesAlertWhatsapp", service.stringValue(row.get("sales_alert_whatsapp")),
        "storeName", service.stringValue(row.get("store_name")).isBlank() ? "Rodando Moto Center" : service.stringValue(row.get("store_name")),
        "storeAddressStreet", service.stringValue(row.get("store_address_street")),
        "storeAddressNumber", service.stringValue(row.get("store_address_number")),
        "storeAddressComplement", service.stringValue(row.get("store_address_complement")),
        "storeAddressDistrict", service.stringValue(row.get("store_address_district")),
        "storeAddressCity", service.stringValue(row.get("store_address_city")).isBlank() ? StoreDefaults.CITY : service.stringValue(row.get("store_address_city")),
        "storeAddressState", service.stringValue(row.get("store_address_state")).isBlank() ? StoreDefaults.STATE : service.stringValue(row.get("store_address_state")),
        "storeAddressCep", service.normalizeCep(row.get("store_address_cep")),
        "storeLat", row.get("store_lat") == null ? StoreDefaults.LAT : service.doubleValue(row.get("store_lat")),
        "storeLng", row.get("store_lng") == null ? StoreDefaults.LNG : service.doubleValue(row.get("store_lng")),
        "freeShippingGlobalMin", row.get("free_shipping_global_min") == null ? RodandoService.FREE_SHIPPING_TARGET : service.doubleValue(row.get("free_shipping_global_min")),
        "taxProfile", service.stringValue(row.get("tax_profile")).isBlank() ? "simples_nacional" : service.stringValue(row.get("tax_profile")),
        "taxPercent", row.get("tax_percent") == null ? 0.06d : service.doubleValue(row.get("tax_percent")),
        "gatewayFeePercent", row.get("gateway_fee_percent") == null ? 0.049d : service.doubleValue(row.get("gateway_fee_percent")),
        "gatewayFixedFee", row.get("gateway_fixed_fee") == null ? 0.0d : service.doubleValue(row.get("gateway_fixed_fee")),
        "operationalPercent", row.get("operational_percent") == null ? 0.03d : service.doubleValue(row.get("operational_percent")),
        "packagingCost", row.get("packaging_cost") == null ? 0.0d : service.doubleValue(row.get("packaging_cost")),
        "blockBelowMinimum", service.booleanValue(row.get("block_below_minimum")),
        "createdAt", service.blankToNull(service.stringValue(row.get("created_at"))),
        "updatedAt", service.blankToNull(service.stringValue(row.get("updated_at"))));
  }

  private Map<String, Object> getEffectiveOwnerSettings() {
    Optional<Map<String, Object>> row = service.one("""
        SELECT os.*
        FROM owner_settings os
        ORDER BY os.updated_at DESC
        LIMIT 1
        """);
    if (row.isPresent()) {
      return mapOwnerSettingsRow(row.get());
    }
    Optional<Map<String, Object>> owner = service.one("""
        SELECT u.id, u.email
        FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        JOIN roles r ON r.id = ur.role_id
        WHERE r.code = 'owner'
        ORDER BY u.id ASC
        LIMIT 1
        """);
    Map<String, Object> fallback = defaultOwnerSettings(owner.map(item -> service.longValue(item.get("id"))).orElse(null));
    owner.ifPresent(item -> fallback.put("salesAlertEmail", service.stringValue(item.get("email")).toLowerCase(Locale.ROOT)));
    return fallback;
  }

  private Map<String, Object> resolveCheckoutAddress(long userId, Object addressId) {
    long parsedAddressId = service.longValue(addressId);
    if (parsedAddressId > 0) {
      Optional<Map<String, Object>> explicit = service.one("""
          SELECT *
          FROM user_addresses
          WHERE id = ? AND user_id = ?
          LIMIT 1
          """, parsedAddressId, userId);
      if (explicit.isPresent()) {
        return service.mapUserAddressRow(explicit.get());
      }
    }
    return service.one("""
        SELECT *
        FROM user_addresses
        WHERE user_id = ?
        ORDER BY is_default DESC, created_at ASC
        LIMIT 1
        """, userId).map(service::mapUserAddressRow).orElse(null);
  }

  private Map<String, Object> buildPickupAddressSnapshot(Map<String, Object> settings) {
    return service.orderedMap(
        "id", null,
        "label", "Retirada na loja",
        "cep", service.blankToNull(service.stringValue(settings.get("storeAddressCep"))),
        "street", service.blankToNull(service.stringValue(settings.get("storeAddressStreet"))),
        "number", service.blankToNull(service.stringValue(settings.get("storeAddressNumber"))),
        "complement", service.blankToNull(service.stringValue(settings.get("storeAddressComplement"))),
        "district", service.blankToNull(service.stringValue(settings.get("storeAddressDistrict"))),
        "city", service.stringValue(settings.get("storeAddressCity")).isBlank() ? StoreDefaults.CITY : service.stringValue(settings.get("storeAddressCity")),
        "state", service.stringValue(settings.get("storeAddressState")).isBlank() ? StoreDefaults.STATE : service.stringValue(settings.get("storeAddressState")),
        "lat", settings.get("storeLat"),
        "lng", settings.get("storeLng"));
  }

  Map<String, Object> calculateShippingQuote(
      BigDecimal subtotal,
      String deliveryMethod,
      Map<String, Object> address,
      List<Map<String, Object>> items,
      Map<String, Object> settings) {
    if ("pickup".equals(deliveryMethod)) {
      return service.orderedMap("shippingCost", bd(0), "distanceKm", 0.0d, "etaDays", 1, "ruleApplied", "pickup");
    }
    boolean cascavel = StoreDefaults.STATE.equalsIgnoreCase(service.stringValue(address.get("state")))
        && normalizeCity(service.stringValue(address.get("city"))).equals(normalizeCity(StoreDefaults.CITY));
    Double distanceKm = haversineDistanceKm(
        address.get("lat") == null ? null : service.doubleValue(address.get("lat")),
        address.get("lng") == null ? null : service.doubleValue(address.get("lng")),
        settings.get("storeLat") == null ? StoreDefaults.LAT : service.doubleValue(settings.get("storeLat")),
        settings.get("storeLng") == null ? StoreDefaults.LNG : service.doubleValue(settings.get("storeLng")));
    if (distanceKm == null) {
      distanceKm = fallbackDistanceKm(address, settings);
    }
    int etaDays = Math.max(1, 1 + (int) Math.ceil(distanceKm / 300.0d));
    if (cascavel) {
      return service.orderedMap("shippingCost", bd(0), "distanceKm", round2(distanceKm), "etaDays", etaDays, "ruleApplied", "cascavel_free_shipping");
    }
    if (subtotal.doubleValue() >= service.doubleValue(settings.get("freeShippingGlobalMin"))) {
      return service.orderedMap("shippingCost", bd(0), "distanceKm", round2(distanceKm), "etaDays", etaDays, "ruleApplied", "global_min_free_shipping");
    }
    BigDecimal shippingCost = bd(12 + distanceKm * 0.35d);
    return service.orderedMap("shippingCost", shippingCost, "distanceKm", round2(distanceKm), "etaDays", etaDays, "ruleApplied", "distance_base");
  }

  private Map<String, Object> buildMinimumPriceSnapshot(List<Map<String, Object>> items, Map<String, Object> settings) {
    double taxPercent = service.doubleValue(settings.get("taxPercent"));
    double gatewayFeePercent = service.doubleValue(settings.get("gatewayFeePercent"));
    double gatewayFixedFee = service.doubleValue(settings.get("gatewayFixedFee"));
    double operationalPercent = service.doubleValue(settings.get("operationalPercent"));
    double packagingCost = service.doubleValue(settings.get("packagingCost"));
    List<Map<String, Object>> lines = new ArrayList<>();
    boolean minimumProfitOk = true;
    for (Map<String, Object> item : items) {
      double price = service.doubleValue(item.get("price"));
      double cost = service.doubleValue(item.get("cost"));
      int quantity = service.intValue(item.get("quantity"));
      double unitTotalCost = cost + packagingCost + price * (taxPercent + gatewayFeePercent + operationalPercent) + gatewayFixedFee;
      double unitMargin = price - unitTotalCost;
      boolean lineOk = unitMargin >= 0;
      minimumProfitOk = minimumProfitOk && lineOk;
      lines.add(service.orderedMap(
          "productId", service.longValue(item.get("productId")),
          "price", round2(price),
          "quantity", quantity,
          "cost", round2(cost),
          "unitTotalCost", round2(unitTotalCost),
          "unitMargin", round2(unitMargin),
          "minimumProfitOk", lineOk));
    }
    return service.orderedMap(
        "taxPercent", taxPercent,
        "gatewayFeePercent", gatewayFeePercent,
        "gatewayFixedFee", gatewayFixedFee,
        "operationalPercent", operationalPercent,
        "packagingCost", packagingCost,
        "minimumProfitOk", minimumProfitOk,
        "items", lines);
  }

  public Map<String, Object> quoteOrder(AuthContext.AuthUser user, Map<String, Object> body) {
    String deliveryMethod = parseDeliveryMethod(body.get("deliveryMethod"));
    if (deliveryMethod.isBlank()) {
      throw new ApiException(400, "Metodo de entrega invalido.");
    }
    List<Map<String, Object>> items = service.getBagItems(new RodandoService.BagActor("user", user.id(), null));
    if (items.isEmpty()) {
      throw new ApiException(400, "Mochila vazia.");
    }
    BigDecimal subtotal = items.stream()
        .map(item -> bd(item.get("price")).multiply(BigDecimal.valueOf(service.intValue(item.get("quantity")))))
        .reduce(BigDecimal.ZERO, BigDecimal::add);
    Map<String, Object> settings = getEffectiveOwnerSettings();
    Map<String, Object> address = "delivery".equals(deliveryMethod) ? resolveCheckoutAddress(user.id(), body.get("addressId")) : null;
    if ("delivery".equals(deliveryMethod) && address == null) {
      throw new ApiException(400, "Endereco de entrega nao encontrado.");
    }
    Map<String, Object> quote = calculateShippingQuote(subtotal, deliveryMethod, address, items, settings);
    return service.orderedMap("quote", service.orderedMap(
        "deliveryMethod", deliveryMethod,
        "shippingCost", quote.get("shippingCost"),
        "distanceKm", quote.get("distanceKm"),
        "etaDays", quote.get("etaDays"),
        "ruleApplied", quote.get("ruleApplied"),
        "freeShippingApplied", bd(quote.get("shippingCost")).compareTo(BigDecimal.ZERO) == 0));
  }

  public Map<String, Object> checkoutOrder(AuthContext.AuthUser user, Map<String, Object> body) {
    String deliveryMethod = parseDeliveryMethod(body.get("deliveryMethod"));
    if (deliveryMethod.isBlank()) {
      deliveryMethod = "pickup";
    }
    String paymentMethod = parsePaymentMethod(body.get("paymentMethod"));
    if (paymentMethod.isBlank()) {
      paymentMethod = "card_credit";
    }
    String paymentProvider = resolvePaymentProvider(paymentMethod);
    String recipientName = service.trim(service.stringValue(body.get("recipientName")));
    String recipientDocument = service.normalizeDocument(body.get("recipientDocument"));
    String recipientPhone = service.normalizePhone(body.get("recipientPhone"));
    if (recipientName.length() < 2) {
      throw new ApiException(400, "Nome do destinatario invalido.");
    }
    if (!recipientDocument.isBlank() && !service.isValidDocument(recipientDocument)) {
      throw new ApiException(400, "CPF/CNPJ invalido.");
    }
    if (!recipientPhone.isBlank() && recipientPhone.length() < 10) {
      throw new ApiException(400, "Telefone invalido.");
    }

    List<Map<String, Object>> staleOrders = service.many("""
        SELECT id FROM orders
        WHERE user_id = ?
          AND status = 'created'
          AND payment_status IN ('pending', 'requires_action')
          AND created_at < NOW() - INTERVAL '30 minutes'
        """, user.id());
    for (Map<String, Object> stale : staleOrders) {
      cancelOrderAndRestoreResources(service.longValue(stale.get("id")), "expired",
          "Pedido expirado por inatividade (30 minutos sem pagamento).", "system", true);
    }

    Optional<Map<String, Object>> existingPendingOrder = service.one("""
        SELECT id
        FROM orders
        WHERE user_id = ?
          AND status = 'created'
          AND payment_status IN ('pending', 'requires_action')
        ORDER BY created_at DESC
        LIMIT 1
        """, user.id());
    if (existingPendingOrder.isPresent()) {
      long pendingId = service.longValue(existingPendingOrder.get().get("id"));
      throw new ApiException(409, "Existe um pedido pendente de pagamento. Conclua ou cancele antes de gerar outro.", String.valueOf(pendingId));
    }

    final String finalDeliveryMethod = deliveryMethod;
    final String finalPaymentMethod = paymentMethod;
    final String finalPaymentProvider = paymentProvider;
    final String finalRecipientName = recipientName;
    final String finalRecipientDocument = recipientDocument;
    final String finalRecipientPhone = recipientPhone;

    Map<String, Object> orderPayload = service.inTransaction(() -> {
      RodandoService.BagActor actor = new RodandoService.BagActor("user", user.id(), null);
      List<Map<String, Object>> bagItems = service.getBagItems(actor);
      if (bagItems.isEmpty()) {
        throw new ApiException(400, "Mochila vazia.");
      }
      for (Map<String, Object> item : bagItems) {
        service.trackProductEvent(service.longValue(item.get("productId")), "checkout_start", service.intValue(item.get("quantity")));
      }

      BigDecimal subtotal = BigDecimal.ZERO;
      for (Map<String, Object> item : bagItems) {
        Map<String, Object> current = service.getProductById(service.longValue(item.get("productId")));
        if (current == null || !service.booleanValue(current.get("isActive"))) {
          throw new ApiException(409, "Produto indisponivel: " + service.stringValue(item.get("name")));
        }
        if (service.intValue(current.get("stock")) < service.intValue(item.get("quantity"))) {
          throw new ApiException(409, "Estoque insuficiente para " + service.stringValue(item.get("name")));
        }
        subtotal = subtotal.add(bd(item.get("price")).multiply(BigDecimal.valueOf(service.intValue(item.get("quantity")))));
      }

      Map<String, Object> settings = getEffectiveOwnerSettings();
      Map<String, Object> address = "delivery".equals(finalDeliveryMethod) ? resolveCheckoutAddress(user.id(), body.get("addressId")) : null;
      if ("delivery".equals(finalDeliveryMethod) && address == null) {
        throw new ApiException(400, "Endereco de entrega nao encontrado.");
      }
      Map<String, Object> quote = calculateShippingQuote(subtotal, finalDeliveryMethod, address, bagItems, settings);
      Map<String, Object> addressSnapshot = address == null ? buildPickupAddressSnapshot(settings) : address;
      BigDecimal total = subtotal.add(bd(quote.get("shippingCost"))).setScale(2, RoundingMode.HALF_UP);
      Map<String, Object> minimumSnapshot = buildMinimumPriceSnapshot(bagItems, settings);
      if (service.booleanValue(settings.get("blockBelowMinimum")) && !service.booleanValue(minimumSnapshot.get("minimumProfitOk"))) {
        throw new ApiException(409, "Pedido abaixo da margem minima permitida.");
      }

      String timestamp = service.nowIso();
      long orderId = service.insertId("""
          INSERT INTO orders (
            user_id, status, subtotal, shipping, total, delivery_method, address_id,
            recipient_name, recipient_document, recipient_phone,
            delivery_street, delivery_number, delivery_complement, delivery_district, delivery_city, delivery_state, delivery_cep,
            distance_km, eta_days, payment_status, payment_provider, payment_method, fiscal_status, minimum_profit_ok, minimum_price_snapshot_json,
            created_at, updated_at
          )
          VALUES (
            ?, 'created', ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, 'pending', ?, ?, 'pending_data', ?, ?::jsonb,
            ?::timestamptz, ?::timestamptz
          )
          RETURNING id
          """,
          user.id(),
          subtotal,
          bd(quote.get("shippingCost")),
          total,
          finalDeliveryMethod,
          addressSnapshot.get("id"),
          finalRecipientName,
          service.blankToNull(finalRecipientDocument),
          service.blankToNull(finalRecipientPhone),
          addressSnapshot.get("street"),
          addressSnapshot.get("number"),
          addressSnapshot.get("complement"),
          addressSnapshot.get("district"),
          addressSnapshot.get("city"),
          addressSnapshot.get("state"),
          addressSnapshot.get("cep"),
          quote.get("distanceKm"),
          quote.get("etaDays"),
          finalPaymentProvider,
          finalPaymentMethod,
          service.booleanValue(minimumSnapshot.get("minimumProfitOk")),
          service.json(minimumSnapshot),
          timestamp,
          timestamp);

      service.run("""
          INSERT INTO order_events (order_id, status, title, description, source, created_at)
          VALUES (?, 'created', 'Pedido criado', 'Pedido recebido no sistema.', 'system', ?::timestamptz)
          """, orderId, timestamp);
      service.run("""
          INSERT INTO order_events (order_id, status, title, description, source, created_at)
          VALUES (?, 'awaiting_payment', 'Aguardando pagamento', 'Pagamento iniciado no checkout.', 'system', ?::timestamptz)
          """, orderId, timestamp);
      service.run("""
          INSERT INTO shipping_quotes (order_id, method, distance_km, eta_days, shipping_cost, rule_applied, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?::timestamptz)
          """, orderId, finalDeliveryMethod, quote.get("distanceKm"), quote.get("etaDays"), bd(quote.get("shippingCost")), quote.get("ruleApplied"), timestamp);
      service.run("""
          INSERT INTO order_events (order_id, status, title, description, source, created_at)
          VALUES (?, 'shipping_rule', 'Regra de frete aplicada', ?, 'system', ?::timestamptz)
          """, orderId, "Regra: " + service.stringValue(quote.get("ruleApplied")) + ".", timestamp);
      service.run("""
          INSERT INTO fiscal_documents (order_id, status, document_type, payload_json, created_at, updated_at)
          VALUES (?, 'pending_data', 'NFe', ?::jsonb, ?::timestamptz, ?::timestamptz)
          """, orderId, service.json(service.orderedMap("recipientDocument", finalRecipientDocument, "recipientName", finalRecipientName, "address", address)), timestamp, timestamp);

      long locationId = service.one("SELECT id FROM stock_locations WHERE name = ? LIMIT 1", "Loja")
          .map(row -> service.longValue(row.get("id")))
          .orElse(1L);
      for (Map<String, Object> item : bagItems) {
        BigDecimal lineTotal = bd(item.get("price")).multiply(BigDecimal.valueOf(service.intValue(item.get("quantity"))));
        service.run("""
            INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total, created_at)
            VALUES (?, ?, ?, ?, ?, ?::timestamptz)
            """, orderId, service.longValue(item.get("productId")), service.intValue(item.get("quantity")), bd(item.get("price")), lineTotal, timestamp);
        service.run("UPDATE product_stocks SET quantity = GREATEST(quantity - ?, 0) WHERE product_id = ?",
            service.intValue(item.get("quantity")), service.longValue(item.get("productId")));
        service.run("""
            INSERT INTO inventory_movements (product_id, location_id, delta, reason, created_at)
            VALUES (?, ?, ?, 'sale', ?::timestamptz)
            """, service.longValue(item.get("productId")), locationId, -service.intValue(item.get("quantity")), timestamp);
      }

      return service.orderedMap(
          "id", orderId,
          "status", "created",
          "total", total,
          "createdAt", timestamp,
          "updatedAt", timestamp,
          "shipping", bd(quote.get("shippingCost")),
          "subtotal", subtotal,
          "etaDays", quote.get("etaDays"),
          "distanceKm", quote.get("distanceKm"),
          "deliveryMethod", finalDeliveryMethod,
          "items", bagItems,
          "customer", service.orderedMap(
              "id", user.id(),
              "name", finalRecipientName,
              "document", service.blankToNull(finalRecipientDocument),
              "phone", service.blankToNull(finalRecipientPhone),
              "email", user.email()),
          "address", addressSnapshot);
    });

    Map<String, Object> payment;
    try {
      payment = createPaymentForOrder(finalPaymentProvider, orderPayload, finalPaymentMethod);
    } catch (Exception paymentException) {
      // Rollback: se o gateway falhou, cancela o pedido já persistido e restaura o estoque
      // para que o cliente possa tentar novamente sem ficar preso num 409.
      long failedOrderId = service.longValue(orderPayload.get("id"));
      cancelOrderAndRestoreResources(failedOrderId, "cancelled",
          "Falha ao iniciar pagamento com o gateway. Pedido cancelado automaticamente.", "system", true);
      throw paymentException;
    }
    String paymentStatus = service.stringValue(payment.get("status")).isBlank() ? "pending" : service.stringValue(payment.get("status"));
    service.run("""
        UPDATE orders
        SET payment_external_id = ?, payment_status = ?, updated_at = NOW()
        WHERE id = ?
        """, payment.get("externalId"), paymentStatus, orderPayload.get("id"));
    service.run("""
        INSERT INTO payment_transactions (
          order_id, provider, method, external_id, provider_payment_intent_id, status, amount, payload_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb, NOW(), NOW())
        """,
        orderPayload.get("id"),
        service.stringValue(payment.get("provider")),
        finalPaymentMethod,
        payment.get("externalId"),
        payment.get("providerPaymentIntentId"),
        paymentStatus,
        orderPayload.get("total"),
        service.json(payment));
    recordPaymentEvent(service.longValue(orderPayload.get("id")), service.stringValue(payment.get("provider")),
        service.blankToNull(service.stringValue(payment.get("externalId"))), "checkout_created", paymentStatus, payment);
    if (isImmediateOrderConfirmationStatus(paymentStatus)) {
      consumeCartItemsForOrder(service.longValue(orderPayload.get("id")));
    }

    return service.orderedMap(
        "order", service.orderedMap(
            "id", orderPayload.get("id"),
            "status", orderPayload.get("status"),
            "total", orderPayload.get("total"),
            "shipping", orderPayload.get("shipping"),
            "subtotal", orderPayload.get("subtotal"),
            "paymentStatus", paymentStatus,
            "paymentMethod", finalPaymentMethod,
            "etaDays", orderPayload.get("etaDays"),
            "distanceKm", orderPayload.get("distanceKm"),
            "deliveryMethod", orderPayload.get("deliveryMethod"),
            "createdAt", orderPayload.get("createdAt"),
            "updatedAt", orderPayload.get("updatedAt")),
        "payment", payment);
  }

  public Map<String, Object> listOrders(long userId) {
    List<Map<String, Object>> items = service.many("""
        SELECT
          id,
          status,
          total,
          subtotal,
          shipping,
          payment_status AS "paymentStatus",
          payment_method AS "paymentMethod",
          delivery_method AS "deliveryMethod",
          eta_days AS "etaDays",
          distance_km AS "distanceKm",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM orders
        WHERE user_id = ?
          AND status <> 'cancelled'
        ORDER BY created_at DESC, id DESC
        LIMIT 100
        """, userId).stream().map(row -> service.orderedMap(
            "id", service.longValue(row.get("id")),
            "status", service.stringValue(row.get("status")),
            "total", bd(row.get("total")),
            "subtotal", bd(row.get("subtotal")),
            "shipping", bd(row.get("shipping")),
            "paymentStatus", service.stringValue(row.get("paymentStatus")),
            "paymentMethod", service.blankToNull(service.stringValue(row.get("paymentMethod"))),
            "deliveryMethod", service.blankToNull(service.stringValue(row.get("deliveryMethod"))) == null ? "pickup" : service.stringValue(row.get("deliveryMethod")),
            "etaDays", row.get("etaDays") == null ? null : service.intValue(row.get("etaDays")),
            "distanceKm", row.get("distanceKm") == null ? null : service.doubleValue(row.get("distanceKm")),
            "createdAt", service.stringValue(row.get("createdAt")),
            "updatedAt", service.stringValue(row.get("updatedAt"))))
        .toList();
    return service.orderedMap("items", items);
  }

  public Map<String, Object> getOrder(long userId, long id) {
    Map<String, Object> order = service.one("""
        SELECT o.*, u.name AS "customerName", u.email AS "customerEmail"
        FROM orders o
        JOIN users u ON u.id = o.user_id
        WHERE o.id = ? AND o.user_id = ?
        LIMIT 1
        """, id, userId).orElse(null);
    if (order == null) {
      throw new ApiException(404, "Pedido nao encontrado.");
    }
    List<Map<String, Object>> items = service.many("""
        SELECT
          oi.order_id AS "orderId",
          oi.product_id AS "productId",
          oi.quantity,
          oi.unit_price AS "unitPrice",
          oi.line_total AS "lineTotal",
          p.name,
          p.sku,
          COALESCE(main_image.url, '') AS "imageUrl"
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        LEFT JOIN LATERAL (
          SELECT pi.url
          FROM product_images pi
          WHERE pi.product_id = p.id AND pi.kind = 'main'
          ORDER BY pi.sort_order ASC, pi.id ASC
          LIMIT 1
        ) main_image ON TRUE
        WHERE oi.order_id = ?
        ORDER BY oi.created_at ASC
        """, id).stream().map(row -> service.orderedMap(
            "orderId", service.longValue(row.get("orderId")),
            "productId", service.longValue(row.get("productId")),
            "quantity", service.intValue(row.get("quantity")),
            "unitPrice", bd(row.get("unitPrice")),
            "lineTotal", bd(row.get("lineTotal")),
            "name", service.stringValue(row.get("name")),
            "sku", service.stringValue(row.get("sku")),
            "imageUrl", service.stringValue(row.get("imageUrl"))))
        .toList();
    List<Map<String, Object>> events = listOrderEventItems(id);
    Map<String, Object> payment = service.one("""
        SELECT provider, method, external_id AS "externalId", provider_payment_intent_id AS "providerPaymentIntentId",
               status, amount, payload_json AS "payloadJson", created_at AS "createdAt", updated_at AS "updatedAt"
        FROM payment_transactions
        WHERE order_id = ?
        ORDER BY created_at DESC
        LIMIT 1
        """, id).orElse(null);
    Map<String, Object> fiscal = service.one("""
        SELECT status, document_type AS "documentType", number, series, access_key AS "accessKey",
               xml_url AS "xmlUrl", pdf_url AS "pdfUrl", updated_at AS "updatedAt"
        FROM fiscal_documents
        WHERE order_id = ?
        LIMIT 1
        """, id).orElse(null);

    return service.orderedMap("item", service.orderedMap(
        "id", service.longValue(order.get("id")),
        "status", service.stringValue(order.get("status")),
        "subtotal", bd(order.get("subtotal")),
        "shipping", bd(order.get("shipping")),
        "total", bd(order.get("total")),
        "paymentStatus", service.stringValue(order.get("payment_status")),
        "paymentMethod", service.blankToNull(service.stringValue(order.get("payment_method"))),
        "deliveryMethod", service.blankToNull(service.stringValue(order.get("delivery_method"))) == null ? "pickup" : service.stringValue(order.get("delivery_method")),
        "etaDays", order.get("eta_days") == null ? null : service.intValue(order.get("eta_days")),
        "distanceKm", order.get("distance_km") == null ? null : service.doubleValue(order.get("distance_km")),
        "createdAt", service.stringValue(order.get("created_at")),
        "updatedAt", service.stringValue(order.get("updated_at")),
        "recipientName", service.blankToNull(service.stringValue(order.get("recipient_name"))) == null ? service.stringValue(order.get("customerName")) : service.stringValue(order.get("recipient_name")),
        "recipientDocument", service.blankToNull(service.stringValue(order.get("recipient_document"))),
        "recipientPhone", service.blankToNull(service.stringValue(order.get("recipient_phone"))),
        "address", service.orderedMap(
            "cep", service.blankToNull(service.stringValue(order.get("delivery_cep"))),
            "street", service.blankToNull(service.stringValue(order.get("delivery_street"))),
            "number", service.blankToNull(service.stringValue(order.get("delivery_number"))),
            "complement", service.blankToNull(service.stringValue(order.get("delivery_complement"))),
            "district", service.blankToNull(service.stringValue(order.get("delivery_district"))),
            "city", service.blankToNull(service.stringValue(order.get("delivery_city"))),
            "state", service.blankToNull(service.stringValue(order.get("delivery_state")))),
        "items", items,
        "events", events,
        "payment", payment == null ? null : paymentPayload(payment),
        "fiscal", fiscal == null ? null : fiscalPayload(fiscal)));
  }

  public Map<String, Object> listOrderEvents(long userId, long id) {
    if (service.one("SELECT 1 FROM orders WHERE id = ? AND user_id = ? LIMIT 1", id, userId).isEmpty()) {
      throw new ApiException(404, "Pedido nao encontrado.");
    }
    return service.orderedMap("items", listOrderEventItems(id));
  }

  public Map<String, Object> cancelOrder(long userId, long id) {
    Map<String, Object> current = service.one("""
        SELECT id, status, payment_status AS "paymentStatus"
        FROM orders
        WHERE id = ? AND user_id = ?
        LIMIT 1
        """, id, userId).orElse(null);
    if (current == null) {
      throw new ApiException(404, "Pedido nao encontrado.");
    }
    if ("cancelled".equals(service.normalize(service.stringValue(current.get("status"))))) {
      throw new ApiException(409, "Pedido ja cancelado.");
    }
    if (List.of("shipped", "completed", "paid").contains(service.normalize(service.stringValue(current.get("status"))))) {
      throw new ApiException(409, "Pedido nao pode mais ser cancelado.");
    }
    if (!List.of("pending", "requires_action", "rejected", "expired").contains(service.normalize(service.stringValue(current.get("paymentStatus"))))) {
      throw new ApiException(409, "Somente pedidos pendentes de pagamento podem ser cancelados pelo cliente.");
    }
    cancelOrderAndRestoreResources(id, "cancelled", "Pedido cancelado pelo cliente antes da confirmacao do pagamento.", "customer", true);
    recordPaymentEvent(id, "customer", null, "customer_cancelled", "cancelled", service.orderedMap("orderId", id, "userId", userId));
    return service.orderedMap("ok", true);
  }

  public Map<String, Object> completeMercadoPago(long userId, String token) {
    String paymentExternalId = service.trim(token);
    if (paymentExternalId.isBlank()) {
      throw new ApiException(400, "Token Mercado Pago obrigatorio.");
    }
    return syncMercadoPagoOrderByToken(userId, paymentExternalId);
  }

  public Map<String, Object> syncOrderPayment(long userId, long orderId) {
    Map<String, Object> paymentTx = getMercadoPagoTransactionForOrder(orderId);
    if (paymentTx == null) {
      throw new ApiException(404, "Pagamento nao encontrado para este pedido.");
    }
    if (service.longValue(paymentTx.get("userId")) != userId) {
      throw new ApiException(404, "Pedido nao encontrado.");
    }
    return syncMercadoPagoOrder(userId, orderId, null, null);
  }

  private Map<String, Object> syncMercadoPagoOrderByToken(long userId, String token) {
    Map<String, Object> paymentTx = service.one("""
        SELECT
          pt.id,
          pt.order_id AS "orderId",
          pt.provider,
          pt.method,
          pt.status,
          pt.external_id AS "externalId",
          pt.provider_payment_intent_id AS "providerPaymentIntentId",
          pt.payload_json AS "payloadJson",
          o.user_id AS "userId",
          o.status AS "orderStatus",
          o.payment_status AS "paymentStatus"
        FROM payment_transactions pt
        JOIN orders o ON o.id = pt.order_id
        WHERE pt.provider = 'mercado_pago'
          AND (pt.external_id = ? OR pt.provider_payment_intent_id = ?)
        ORDER BY pt.id DESC
        LIMIT 1
        """, token, token).orElse(null);
    if (paymentTx != null) {
      if (service.longValue(paymentTx.get("userId")) != userId) {
        throw new ApiException(404, "Pagamento Mercado Pago nao encontrado.");
      }
      return syncMercadoPagoOrder(userId, service.longValue(paymentTx.get("orderId")), token, null);
    }
    if (properties.mockPaymentProviders()) {
      throw new ApiException(404, "Pagamento Mercado Pago nao encontrado.");
    }
    if (!looksLikeMercadoPagoPaymentId(token)) {
      throw new ApiException(404, "Pagamento Mercado Pago nao encontrado.");
    }
    Map<String, Object> providerPayment = fetchMercadoPagoPayment(token);
    long orderId = parseOrderIdFromExternalReference(service.stringValue(providerPayment.get("external_reference")));
    if (orderId <= 0) {
      throw new ApiException(404, "Pagamento Mercado Pago nao encontrado.");
    }
    Map<String, Object> order = service.one("SELECT user_id AS \"userId\" FROM orders WHERE id = ? LIMIT 1", orderId).orElse(null);
    if (order == null || service.longValue(order.get("userId")) != userId) {
      throw new ApiException(404, "Pagamento Mercado Pago nao encontrado.");
    }
    return syncMercadoPagoOrder(userId, orderId, token, providerPayment);
  }

  private Map<String, Object> syncMercadoPagoOrder(long userId, long orderId, String tokenHint, Map<String, Object> providerPaymentHint) {
    Map<String, Object> paymentTx = getMercadoPagoTransactionForOrder(orderId);
    if (paymentTx == null || service.longValue(paymentTx.get("userId")) != userId) {
      throw new ApiException(404, "Pagamento Mercado Pago nao encontrado.");
    }
    if ("cancelled".equals(service.normalize(service.stringValue(paymentTx.get("orderStatus"))))) {
      return service.orderedMap(
          "order", currentOrderSummary(orderId),
          "payment", currentMercadoPagoPaymentPayload(orderId),
          "synced", false);
    }

    Map<String, Object> storedPayload = jsonSupport.readMap(paymentTx.get("payloadJson"));
    boolean isSimulated = service.booleanValue(firstNonBlank(storedPayload.get("simulated")));
    if (properties.mockPaymentProviders() || (isSimulated && !properties.productionLike())) {
      String txStatus = service.normalize(service.stringValue(paymentTx.get("status")));
      if (List.of("requires_action", "pending").contains(txStatus)) {
        applyMercadoPagoPaymentUpdate(paymentTx, service.stringValue(paymentTx.get("externalId")),
            "paid",
            service.orderedMap("payment", service.orderedMap("simulated", true), "simulated", true),
            "mock_complete");
      }
      return service.orderedMap(
          "order", currentOrderSummary(orderId),
          "payment", currentMercadoPagoPaymentPayload(orderId),
          "synced", true);
    }

    Map<String, Object> providerPayment = providerPaymentHint == null ? resolveMercadoPagoPaymentForOrder(paymentTx, tokenHint) : providerPaymentHint;
    if (providerPayment.isEmpty()) {
      return service.orderedMap(
          "order", currentOrderSummary(orderId),
          "payment", currentMercadoPagoPaymentPayload(orderId),
          "synced", false);
    }

    String paymentId = service.blankToNull(service.stringValue(providerPayment.get("id")));
    String status = normalizeProviderPaymentStatus("mercado_pago", service.stringValue(providerPayment.get("status")));
    if (status.isBlank()) {
      return service.orderedMap(
          "order", currentOrderSummary(orderId),
          "payment", currentMercadoPagoPaymentPayload(orderId),
          "synced", false);
    }

    applyMercadoPagoPaymentUpdate(paymentTx, paymentId, status, service.orderedMap(
        "source", "sync",
        "token", service.blankToNull(tokenHint),
        "payment", providerPayment), "mercado_pago_sync");
    return service.orderedMap(
        "order", currentOrderSummary(orderId),
        "payment", currentMercadoPagoPaymentPayload(orderId),
        "synced", true);
  }

  /** Valida apenas a assinatura do webhook MercadoPago — chamado pelo controller antes do rate limit. */
  public void validateMercadoPagoSignature(String signature) {
    String secret = service.trim(properties.mercadoPagoWebhookSecret());
    // Se não há secret configurado em ambiente productionLike, rejeita por padrão.
    // Em dev/test sem secret, permite (mockPaymentProviders cobre esses cenários).
    if (secret.isBlank()) {
      if (properties.productionLike()) {
        throw new ApiException(401, "Webhook secret nao configurado.");
      }
      return;
    }
    if (!secret.equals(service.trim(signature))) {
      throw new ApiException(401, "Assinatura de webhook invalida.");
    }
  }

  public Map<String, Object> handleMercadoPagoWebhook(String signature, Map<String, Object> event) {
    validateMercadoPagoSignature(signature);
    Map<String, Object> data = asMap(event.get("data"));
    String paymentExternalId = service.trim(service.stringValue(event.get("paymentExternalId")));
    if (paymentExternalId.isBlank()) {
      paymentExternalId = service.trim(service.stringValue(data.get("id")));
    }
    if (paymentExternalId.isBlank()) {
      throw new ApiException(400, "Payload sem identificador de pagamento.");
    }
    String eventId = service.trim(service.stringValue(event.get("id")));
    if (eventId.isBlank()) {
      String action = service.normalize(service.stringValue(event.get("action")));
      String suffix = action.isBlank() ? UUID.randomUUID().toString().replace("-", "") : action;
      eventId = "mp:" + paymentExternalId + ":" + suffix;
    }
    if (service.one("""
        SELECT id
        FROM payment_events
        WHERE provider = 'mercado_pago' AND event_type = ? AND external_id = ?
        LIMIT 1
        """, "mercado_pago_webhook", eventId).isPresent()) {
      return service.orderedMap("ok", true, "deduplicated", true);
    }

    Map<String, Object> providerPayment = properties.mockPaymentProviders() ? Map.of() : fetchMercadoPagoPayment(paymentExternalId);
    String resolvedPaymentId = firstNonBlank(providerPayment.get("id"), paymentExternalId);
    String status = normalizeProviderPaymentStatus("mercado_pago",
        firstNonBlank(providerPayment.get("status"), event.get("status"), event.get("action")));
    Map<String, Object> paymentTx = service.one("""
        SELECT pt.id, pt.order_id AS "orderId", o.status AS "orderStatus", o.payment_status AS "paymentStatus"
        FROM payment_transactions pt
        JOIN orders o ON o.id = pt.order_id
        WHERE pt.provider = 'mercado_pago'
          AND ((? <> '' AND pt.external_id = ?) OR (? <> '' AND pt.provider_payment_intent_id = ?))
        ORDER BY pt.id DESC
        LIMIT 1
        """, resolvedPaymentId, resolvedPaymentId, resolvedPaymentId, resolvedPaymentId).orElse(null);
    if (paymentTx == null) {
      throw new ApiException(404, "Pagamento nao encontrado.");
    }

    String currentOrderStatus = service.normalize(service.stringValue(paymentTx.get("orderStatus")));
    String nextPaymentStatus = "cancelled".equals(currentOrderStatus) ? service.stringValue(paymentTx.get("paymentStatus")) : status;
    Map<String, Object> webhookPayload = service.orderedMap(
        "notification", event,
        "payment", providerPayment);
    service.run("""
        UPDATE payment_transactions
        SET status = ?, provider_payment_intent_id = COALESCE(provider_payment_intent_id, ?), payload_json = jsonb_set(COALESCE(payload_json, '{}'::jsonb), '{last_webhook}', ?::jsonb, true), updated_at = NOW()
        WHERE id = ?
        """, status, resolvedPaymentId, service.json(webhookPayload), service.longValue(paymentTx.get("id")));
    service.run("""
        UPDATE orders
        SET payment_status = ?, status = CASE
          WHEN status = 'cancelled' THEN status
          WHEN ? = 'paid' AND status IN ('created', 'paid') THEN 'paid'
          WHEN ? IN ('rejected', 'cancelled', 'expired') THEN 'cancelled'
          ELSE status
        END, updated_at = NOW()
        WHERE id = ?
        """, nextPaymentStatus, nextPaymentStatus, nextPaymentStatus, service.longValue(paymentTx.get("orderId")));
    service.run("""
        INSERT INTO order_events (order_id, status, title, description, source, created_at)
        VALUES (?, ?, ?, ?, 'webhook', NOW())
        """, service.longValue(paymentTx.get("orderId")), status, paymentEventTitle(status), "Status recebido do gateway: " + status + ".");
    recordPaymentEvent(service.longValue(paymentTx.get("orderId")), "mercado_pago", eventId, "mercado_pago_webhook", status, webhookPayload);

    if (isTerminalFailedPaymentStatus(status) && !"cancelled".equals(currentOrderStatus)) {
      restoreStockForOrder(service.longValue(paymentTx.get("orderId")), "order_cancelled");
    }
    if ("paid".equals(status)) {
      consumeCartItemsForOrder(service.longValue(paymentTx.get("orderId")));
      service.run("UPDATE fiscal_documents SET status = 'ready', updated_at = NOW() WHERE order_id = ?", service.longValue(paymentTx.get("orderId")));
    }
    return service.orderedMap("ok", true);
  }

  private Map<String, Object> getMercadoPagoTransactionForOrder(long orderId) {
    return service.one("""
        SELECT
          pt.id,
          pt.order_id AS "orderId",
          pt.method,
          pt.status,
          pt.amount,
          pt.external_id AS "externalId",
          pt.provider_payment_intent_id AS "providerPaymentIntentId",
          pt.payload_json AS "payloadJson",
          pt.created_at AS "createdAt",
          pt.updated_at AS "updatedAt",
          o.user_id AS "userId",
          o.status AS "orderStatus",
          o.payment_status AS "paymentStatus"
        FROM payment_transactions pt
        JOIN orders o ON o.id = pt.order_id
        WHERE pt.provider = 'mercado_pago'
          AND pt.order_id = ?
        ORDER BY pt.id DESC
        LIMIT 1
        """, orderId).orElse(null);
  }

  private Map<String, Object> currentMercadoPagoPaymentPayload(long orderId) {
    Map<String, Object> paymentTx = getMercadoPagoTransactionForOrder(orderId);
    return paymentTx == null ? null : paymentPayload(paymentTx);
  }

  private Map<String, Object> resolveMercadoPagoPaymentForOrder(Map<String, Object> paymentTx, String tokenHint) {
    String hintedId = service.blankToNull(service.trim(tokenHint));
    if (hintedId != null && looksLikeMercadoPagoPaymentId(hintedId)) {
      return fetchMercadoPagoPayment(hintedId);
    }

    String providerPaymentIntentId = service.blankToNull(service.stringValue(paymentTx.get("providerPaymentIntentId")));
    if (providerPaymentIntentId != null && looksLikeMercadoPagoPaymentId(providerPaymentIntentId)) {
      return fetchMercadoPagoPayment(providerPaymentIntentId);
    }

    String externalId = service.blankToNull(service.stringValue(paymentTx.get("externalId")));
    String method = service.normalize(service.stringValue(paymentTx.get("method")));
    if ("pix".equals(method) && externalId != null && looksLikeMercadoPagoPaymentId(externalId)) {
      return fetchMercadoPagoPayment(externalId);
    }

    return searchMercadoPagoPaymentByExternalReference(service.longValue(paymentTx.get("orderId")));
  }

  private void applyMercadoPagoPaymentUpdate(
      Map<String, Object> paymentTx,
      String paymentId,
      String status,
      Map<String, Object> payload,
      String eventType) {
    long orderId = service.longValue(paymentTx.get("orderId"));
    String currentOrderStatus = service.normalize(service.stringValue(paymentTx.get("orderStatus")));
    String currentPaymentTxStatus = service.normalize(service.stringValue(paymentTx.get("status")));
    String nextPaymentStatus = "cancelled".equals(currentOrderStatus) ? service.stringValue(paymentTx.get("paymentStatus")) : status;

    Map<String, Object> mergedPayload = jsonSupport.readMap(paymentTx.get("payloadJson"));
    mergedPayload.put("providerPayload", payload.get("payment"));
    mergedPayload.put("lastSync", payload);

    service.run("""
        UPDATE payment_transactions
        SET status = ?, provider_payment_intent_id = COALESCE(?, provider_payment_intent_id), payload_json = ?::jsonb, updated_at = NOW()
        WHERE id = ?
        """, status, service.blankToNull(paymentId), service.json(mergedPayload), service.longValue(paymentTx.get("id")));
    service.run("""
        UPDATE orders
        SET payment_status = ?, status = CASE
          WHEN status = 'cancelled' THEN status
          WHEN ? = 'paid' AND status IN ('created', 'paid') THEN 'paid'
          WHEN ? IN ('rejected', 'cancelled', 'expired') THEN 'cancelled'
          ELSE status
        END, updated_at = NOW()
        WHERE id = ?
        """, nextPaymentStatus, nextPaymentStatus, nextPaymentStatus, orderId);
    if (!currentPaymentTxStatus.equals(service.normalize(status))) {
      service.run("""
          INSERT INTO order_events (order_id, status, title, description, source, created_at)
          VALUES (?, ?, ?, ?, 'sync', NOW())
          """, orderId, status, paymentEventTitle(status), "Status sincronizado com o gateway: " + status + ".");
      recordPaymentEvent(orderId, "mercado_pago", service.blankToNull(paymentId), eventType, status, payload);
    }

    if (isTerminalFailedPaymentStatus(status) && !"cancelled".equals(currentOrderStatus)) {
      restoreStockForOrder(orderId, "order_cancelled");
    }
    if ("paid".equals(status)) {
      consumeCartItemsForOrder(orderId);
      service.run("UPDATE fiscal_documents SET status = 'ready', updated_at = NOW() WHERE order_id = ?", orderId);
    }
  }

  /** Valida apenas a assinatura do webhook Stripe — chamado pelo controller antes do rate limit. */
  public void validateStripeSignature(String signature) {
    if (properties.mockPaymentProviders()) return;
    String secret = service.trim(properties.stripeWebhookSecret());
    if (secret.isBlank()) {
      if (properties.productionLike()) {
        throw new ApiException(401, "Webhook secret nao configurado.");
      }
      return;
    }
    if (!secret.equals(service.trim(signature))) {
      throw new ApiException(401, "Assinatura de webhook invalida.");
    }
  }

  public Map<String, Object> handleStripeWebhook(String signature, Map<String, Object> event) {
    validateStripeSignature(signature);
    String eventId = service.trim(service.stringValue(event.get("id")));
    String eventType = service.trim(service.stringValue(event.get("type")));
    Map<String, Object> data = asMap(event.get("data"));
    Map<String, Object> payload = asMap(data.get("object"));
    String paymentIntentId = service.trim(service.stringValue(payload.get("payment_intent")));
    if (paymentIntentId.isBlank()) {
      paymentIntentId = service.trim(service.stringValue(payload.get("id")));
    }
    if (eventId.isBlank() || eventType.isBlank() || paymentIntentId.isBlank()) {
      throw new ApiException(400, "Webhook Stripe invalido.");
    }
    if (service.one("""
        SELECT id
        FROM payment_events
        WHERE provider = 'stripe' AND event_type = ? AND external_id = ?
        LIMIT 1
        """, "stripe_webhook:" + eventType, eventId).isPresent()) {
      return service.orderedMap("ok", true, "deduplicated", true);
    }

    String status = normalizeProviderPaymentStatus("stripe", service.stringValue(payload.get("status")));
    Map<String, Object> paymentTx = service.one("""
        SELECT pt.id, pt.order_id AS "orderId", o.status AS "orderStatus", o.payment_status AS "paymentStatus"
        FROM payment_transactions pt
        JOIN orders o ON o.id = pt.order_id
        WHERE pt.provider = 'stripe'
          AND ((? <> '' AND pt.external_id = ?) OR (? <> '' AND pt.provider_payment_intent_id = ?))
        ORDER BY pt.id DESC
        LIMIT 1
        """, paymentIntentId, paymentIntentId, paymentIntentId, paymentIntentId).orElse(null);
    if (paymentTx == null) {
      throw new ApiException(404, "Pagamento nao encontrado.");
    }

    String currentOrderStatus = service.normalize(service.stringValue(paymentTx.get("orderStatus")));
    String nextPaymentStatus = "cancelled".equals(currentOrderStatus) ? service.stringValue(paymentTx.get("paymentStatus")) : status;
    service.run("""
        UPDATE payment_transactions
        SET status = ?, payload_json = jsonb_set(COALESCE(payload_json, '{}'::jsonb), '{last_webhook}', ?::jsonb, true), updated_at = NOW()
        WHERE id = ?
        """, status, service.json(event), service.longValue(paymentTx.get("id")));
    service.run("""
        UPDATE orders
        SET payment_status = ?, status = CASE
          WHEN status = 'cancelled' THEN status
          WHEN ? = 'paid' AND status IN ('created', 'paid') THEN 'paid'
          WHEN ? IN ('rejected', 'cancelled', 'expired') THEN 'cancelled'
          ELSE status
        END, updated_at = NOW()
        WHERE id = ?
        """, nextPaymentStatus, nextPaymentStatus, nextPaymentStatus, service.longValue(paymentTx.get("orderId")));
    service.run("""
        INSERT INTO order_events (order_id, status, title, description, source, created_at)
        VALUES (?, ?, ?, ?, 'webhook', NOW())
        """, service.longValue(paymentTx.get("orderId")), status, paymentEventTitle(status), "Status Stripe recebido: " + status + ".");
    recordPaymentEvent(service.longValue(paymentTx.get("orderId")), "stripe", eventId, "stripe_webhook:" + eventType, status, event);

    if (isTerminalFailedPaymentStatus(status) && !"cancelled".equals(currentOrderStatus)) {
      restoreStockForOrder(service.longValue(paymentTx.get("orderId")), "order_cancelled");
    }
    if ("paid".equals(status)) {
      consumeCartItemsForOrder(service.longValue(paymentTx.get("orderId")));
      service.run("UPDATE fiscal_documents SET status = 'ready', updated_at = NOW() WHERE order_id = ?", service.longValue(paymentTx.get("orderId")));
    }
    return service.orderedMap("ok", true);
  }

  public Map<String, Object> listOwnerOrders(Map<String, String> query) {
    int limit = clamp(query.get("limit"), 50, 1, 200);
    List<Object> args = new ArrayList<>();
    StringBuilder where = new StringBuilder();
    appendOwnerOrderFilter(where, args, "o.status = ?", query.get("status"));
    appendOwnerOrderFilter(where, args, "o.payment_status = ?", query.get("paymentStatus"));
    appendOwnerOrderFilter(where, args, "o.delivery_method = ?", query.get("deliveryMethod"));
    if (query.get("city") != null && !query.get("city").isBlank()) {
      appendOwnerOrderFilter(where, args, "LOWER(COALESCE(o.delivery_city, '')) LIKE ?", "%" + query.get("city").trim().toLowerCase(Locale.ROOT) + "%");
    }
    if (query.get("customer") != null && !query.get("customer").isBlank()) {
      String term = "%" + query.get("customer").trim().toLowerCase(Locale.ROOT) + "%";
      appendOwnerOrderFilter(where, args, "(LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ?)", term, term);
    }
    args.add(limit);
    List<Map<String, Object>> items = service.many("""
        SELECT
          o.id, o.status, o.payment_status AS "paymentStatus", o.payment_method AS "paymentMethod", o.delivery_method AS "deliveryMethod",
          o.subtotal, o.shipping, o.total, o.eta_days AS "etaDays", o.distance_km AS "distanceKm",
          o.delivery_city AS "deliveryCity", o.delivery_state AS "deliveryState", o.created_at AS "createdAt", o.updated_at AS "updatedAt",
          u.id AS "customerId", u.name AS "customerName", u.email AS "customerEmail"
        FROM orders o
        JOIN users u ON u.id = o.user_id
        """ + (where.isEmpty() ? "" : " WHERE " + where) + """
        ORDER BY o.created_at DESC, o.id DESC
        LIMIT ?
        """, args.toArray()).stream().map(row -> service.orderedMap(
            "id", service.longValue(row.get("id")),
            "status", service.stringValue(row.get("status")),
            "paymentStatus", service.stringValue(row.get("paymentStatus")),
            "paymentMethod", service.blankToNull(service.stringValue(row.get("paymentMethod"))),
            "deliveryMethod", service.blankToNull(service.stringValue(row.get("deliveryMethod"))) == null ? "pickup" : service.stringValue(row.get("deliveryMethod")),
            "subtotal", bd(row.get("subtotal")),
            "shipping", bd(row.get("shipping")),
            "total", bd(row.get("total")),
            "etaDays", row.get("etaDays") == null ? null : service.intValue(row.get("etaDays")),
            "distanceKm", row.get("distanceKm") == null ? null : service.doubleValue(row.get("distanceKm")),
            "deliveryCity", service.blankToNull(service.stringValue(row.get("deliveryCity"))),
            "deliveryState", service.blankToNull(service.stringValue(row.get("deliveryState"))),
            "createdAt", service.stringValue(row.get("createdAt")),
            "updatedAt", service.stringValue(row.get("updatedAt")),
            "customer", service.orderedMap(
                "id", service.longValue(row.get("customerId")),
                "name", service.stringValue(row.get("customerName")),
                "email", service.stringValue(row.get("customerEmail")))))
        .toList();
    return service.orderedMap("items", items);
  }

  public Map<String, Object> getOwnerOrder(long id) {
    return getOrderForOwner(id);
  }

  public Map<String, Object> updateOwnerOrderStatus(long ownerUserId, long id, String nextStatus) {
    String status = service.normalize(nextStatus);
    if (!List.of("created", "paid", "cancelled", "shipped", "completed").contains(status)) {
      throw new ApiException(400, "Status invalido.");
    }
    Map<String, Object> current = service.one("SELECT id, status, payment_status AS \"paymentStatus\" FROM orders WHERE id = ? LIMIT 1", id).orElse(null);
    if (current == null) {
      throw new ApiException(404, "Pedido nao encontrado.");
    }
    if ("cancelled".equals(status) && List.of("shipped", "completed").contains(service.normalize(service.stringValue(current.get("status"))))) {
      throw new ApiException(409, "Pedido enviado ou concluido nao pode ser cancelado.");
    }
    if ("cancelled".equals(status) && "paid".equals(service.normalize(service.stringValue(current.get("paymentStatus"))))) {
      throw new ApiException(409, "Pedido pago exige fluxo financeiro de estorno antes do cancelamento.");
    }

    if ("cancelled".equals(status)) {
      cancelOrderAndRestoreResources(id, "cancelled", "Pedido cancelado no painel owner.", "owner", true);
    } else {
      service.run("UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?", status, id);
      service.run("""
          INSERT INTO order_events (order_id, status, title, description, source, created_at)
          VALUES (?, ?, ?, 'Alterado no painel owner.', 'owner', NOW())
          """, id, status, "Status atualizado para " + status);
      if ("shipped".equals(status)) {
        Map<String, Object> paymentTx = service.one("""
            SELECT provider, status, provider_payment_intent_id AS "providerPaymentIntentId", external_id AS "externalId"
            FROM payment_transactions
            WHERE order_id = ?
            ORDER BY created_at DESC
            LIMIT 1
            """, id).orElse(null);
        if (paymentTx != null && "authorized".equals(service.normalize(service.stringValue(paymentTx.get("status"))))) {
          String provider = service.stringValue(paymentTx.get("provider"));
          String captureExternalId = service.blankToNull(service.stringValue(paymentTx.get("providerPaymentIntentId"))) == null
              ? service.stringValue(paymentTx.get("externalId"))
              : service.stringValue(paymentTx.get("providerPaymentIntentId"));
          String captureStatus = "paid";
          service.run("""
              UPDATE payment_transactions
              SET status = ?, payload_json = jsonb_set(COALESCE(payload_json, '{}'::jsonb), '{last_capture}', ?::jsonb, true), updated_at = NOW()
              WHERE order_id = ?
              """, captureStatus, service.json(service.orderedMap("provider", provider, "captured", true, "externalId", captureExternalId)), id);
          service.run("UPDATE orders SET payment_status = ?, updated_at = NOW() WHERE id = ?", captureStatus, id);
          service.run("""
              INSERT INTO order_events (order_id, status, title, description, source, created_at)
              VALUES (?, ?, ?, ?, 'system', NOW())
              """, id, captureStatus, paymentEventTitle(captureStatus), "Captura automatica " + provider + " ao enviar.");
          recordPaymentEvent(id, provider, captureExternalId, provider + "_capture", captureStatus, service.orderedMap("externalId", captureExternalId, "captured", true));
          consumeCartItemsForOrder(id);
          service.run("UPDATE fiscal_documents SET status = 'ready', updated_at = NOW() WHERE order_id = ?", id);
        }
      }
    }
    service.saveOwnerAuditLog(ownerUserId, "order_status_update", "order", id,
        service.orderedMap("status", current.get("status")),
        service.orderedMap("status", status));
    return service.orderedMap("ok", true);
  }

  private void appendOwnerOrderFilter(StringBuilder where, List<Object> args, String clause, Object... values) {
    if (values.length == 0 || values[0] == null || service.stringValue(values[0]).isBlank()) {
      return;
    }
    if (!where.isEmpty()) {
      where.append(" AND ");
    }
    where.append(clause);
    for (Object value : values) {
      args.add(value);
    }
  }

  private Map<String, Object> getOrderForOwner(long id) {
    Map<String, Object> row = service.one("""
        SELECT
          o.*,
          u.name AS "customerName",
          u.email AS "customerEmail",
          u.phone AS "customerPhone",
          u.document AS "customerDocument"
        FROM orders o
        JOIN users u ON u.id = o.user_id
        WHERE o.id = ?
        LIMIT 1
        """, id).orElse(null);
    if (row == null) {
      throw new ApiException(404, "Pedido nao encontrado.");
    }
    List<Map<String, Object>> items = service.many("""
        SELECT oi.product_id AS "productId", oi.quantity, oi.unit_price AS "unitPrice", oi.line_total AS "lineTotal", p.name, p.sku
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ?
        ORDER BY oi.created_at ASC
        """, id).stream().map(item -> service.orderedMap(
            "productId", service.longValue(item.get("productId")),
            "name", service.stringValue(item.get("name")),
            "sku", service.stringValue(item.get("sku")),
            "quantity", service.intValue(item.get("quantity")),
            "unitPrice", bd(item.get("unitPrice")),
            "lineTotal", bd(item.get("lineTotal"))))
        .toList();
    List<Map<String, Object>> events = listOrderEventItems(id);
    Map<String, Object> fiscal = service.one("""
        SELECT status, document_type AS "documentType", number, series, access_key AS "accessKey",
               xml_url AS "xmlUrl", pdf_url AS "pdfUrl", payload_json AS "payloadJson", updated_at AS "updatedAt"
        FROM fiscal_documents
        WHERE order_id = ?
        LIMIT 1
        """, id).orElse(null);
    return service.orderedMap("item", service.orderedMap(
        "id", service.longValue(row.get("id")),
        "status", service.stringValue(row.get("status")),
        "paymentStatus", service.stringValue(row.get("payment_status")),
        "paymentMethod", service.blankToNull(service.stringValue(row.get("payment_method"))),
        "deliveryMethod", service.blankToNull(service.stringValue(row.get("delivery_method"))) == null ? "pickup" : service.stringValue(row.get("delivery_method")),
        "subtotal", bd(row.get("subtotal")),
        "shipping", bd(row.get("shipping")),
        "total", bd(row.get("total")),
        "etaDays", row.get("eta_days") == null ? null : service.intValue(row.get("eta_days")),
        "distanceKm", row.get("distance_km") == null ? null : service.doubleValue(row.get("distance_km")),
        "createdAt", service.stringValue(row.get("created_at")),
        "updatedAt", service.stringValue(row.get("updated_at")),
        "customer", service.orderedMap(
            "id", service.longValue(row.get("user_id")),
            "name", service.stringValue(row.get("customerName")),
            "email", service.stringValue(row.get("customerEmail")),
            "phone", service.blankToNull(service.stringValue(row.get("customerPhone"))),
            "document", service.blankToNull(service.stringValue(row.get("customerDocument")))),
        "address", service.orderedMap(
            "cep", service.blankToNull(service.stringValue(row.get("delivery_cep"))),
            "street", service.blankToNull(service.stringValue(row.get("delivery_street"))),
            "number", service.blankToNull(service.stringValue(row.get("delivery_number"))),
            "complement", service.blankToNull(service.stringValue(row.get("delivery_complement"))),
            "district", service.blankToNull(service.stringValue(row.get("delivery_district"))),
            "city", service.blankToNull(service.stringValue(row.get("delivery_city"))),
            "state", service.blankToNull(service.stringValue(row.get("delivery_state")))),
        "items", items,
        "events", events,
        "fiscal", fiscal == null ? null : service.orderedMap(
            "status", service.stringValue(fiscal.get("status")),
            "documentType", service.stringValue(fiscal.get("documentType")),
            "number", service.blankToNull(service.stringValue(fiscal.get("number"))),
            "series", service.blankToNull(service.stringValue(fiscal.get("series"))),
            "accessKey", service.blankToNull(service.stringValue(fiscal.get("accessKey"))),
            "xmlUrl", service.blankToNull(service.stringValue(fiscal.get("xmlUrl"))),
            "pdfUrl", service.blankToNull(service.stringValue(fiscal.get("pdfUrl"))),
            "payloadJson", fiscal.get("payloadJson"),
            "updatedAt", service.blankToNull(service.stringValue(fiscal.get("updatedAt"))))));
  }

  private List<Map<String, Object>> listOrderEventItems(long orderId) {
    return service.many("""
        SELECT id, status, title, description, source, created_at AS "createdAt"
        FROM order_events
        WHERE order_id = ?
        ORDER BY created_at ASC, id ASC
        """, orderId).stream().map(row -> service.orderedMap(
            "id", service.longValue(row.get("id")),
            "status", service.stringValue(row.get("status")),
            "title", service.stringValue(row.get("title")),
            "description", service.stringValue(row.get("description")),
            "source", service.stringValue(row.get("source")),
            "createdAt", service.stringValue(row.get("createdAt"))))
        .toList();
  }

  private Map<String, Object> paymentPayload(Map<String, Object> payment) {
    Map<String, Object> payload = jsonSupport.readMap(payment.get("payloadJson"));
    Map<String, Object> providerPayload = asMap(payload.get("providerPayload"));
    Map<String, Object> pointOfInteraction = asMap(providerPayload.get("point_of_interaction"));
    Map<String, Object> transactionData = asMap(pointOfInteraction.get("transaction_data"));

    String rawQrCode = firstNonBlank(
        payment.get("qrCode"),
        payload.get("qrCode"),
        transactionData.get("qr_code"));
    String rawPix = firstNonBlank(
        payment.get("pix"),
        payload.get("pix"),
        transactionData.get("qr_code_base64"));

    // Migração automática: códigos Pix simulados antigos tinham tamanhos de campo
    // hardcoded incorretos (ex.: "0136" para qualquer chave). Ao detectar o padrão
    // legado, regenera o EMV e a imagem QR com os campos calculados corretamente.
    boolean isSimulated = service.booleanValue(firstNonBlank(payment.get("simulated"), payload.get("simulated")));
    if (isSimulated && rawQrCode != null && rawQrCode.contains("pedido-") && rawQrCode.contains("@rodando.local")) {
      long orderId = service.longValue(payment.get("orderId"));
      if (orderId > 0) {
        rawQrCode = buildSimulatedPixEmv(orderId);
        rawPix = generatePixQrImage(rawQrCode);
      }
    }

    return service.orderedMap(
        "provider", service.stringValue(payment.get("provider")),
        "method", service.blankToNull(service.stringValue(payment.get("method"))),
        "externalId", service.blankToNull(service.stringValue(payment.get("externalId"))),
        "providerPaymentIntentId", service.blankToNull(service.stringValue(payment.get("providerPaymentIntentId"))),
        "status", service.stringValue(payment.get("status")),
        "amount", bd(payment.get("amount")),
        "checkoutUrl", firstNonBlank(
            payment.get("checkoutUrl"),
            payload.get("checkoutUrl"),
            transactionData.get("ticket_url")),
        "qrCode", rawQrCode,
        "pix", rawPix,
        "simulated", isSimulated,
        "simulationReason", firstNonBlank(payment.get("simulationReason"), payload.get("simulationReason")),
        "createdAt", service.blankToNull(service.stringValue(payment.get("createdAt"))),
        "updatedAt", service.blankToNull(service.stringValue(payment.get("updatedAt"))));
  }

  private Map<String, Object> fiscalPayload(Map<String, Object> fiscal) {
    return service.orderedMap(
        "status", service.stringValue(fiscal.get("status")),
        "documentType", service.stringValue(fiscal.get("documentType")),
        "number", service.blankToNull(service.stringValue(fiscal.get("number"))),
        "series", service.blankToNull(service.stringValue(fiscal.get("series"))),
        "accessKey", service.blankToNull(service.stringValue(fiscal.get("accessKey"))),
        "xmlUrl", service.blankToNull(service.stringValue(fiscal.get("xmlUrl"))),
        "pdfUrl", service.blankToNull(service.stringValue(fiscal.get("pdfUrl"))),
        "updatedAt", service.blankToNull(service.stringValue(fiscal.get("updatedAt"))));
  }

  private Map<String, Object> currentOrderSummary(long orderId) {
    Map<String, Object> order = service.one("""
        SELECT id, status, total, subtotal, shipping, payment_status AS "paymentStatus", payment_method AS "paymentMethod",
               delivery_method AS "deliveryMethod", eta_days AS "etaDays", distance_km AS "distanceKm",
               created_at AS "createdAt", updated_at AS "updatedAt"
        FROM orders
        WHERE id = ?
        LIMIT 1
        """, orderId).orElseThrow(() -> new ApiException(404, "Pedido nao encontrado."));
    return service.orderedMap(
        "id", service.longValue(order.get("id")),
        "status", service.stringValue(order.get("status")),
        "total", bd(order.get("total")),
        "subtotal", bd(order.get("subtotal")),
        "shipping", bd(order.get("shipping")),
        "paymentStatus", service.stringValue(order.get("paymentStatus")),
        "paymentMethod", service.blankToNull(service.stringValue(order.get("paymentMethod"))),
        "deliveryMethod", service.blankToNull(service.stringValue(order.get("deliveryMethod"))) == null ? "pickup" : service.stringValue(order.get("deliveryMethod")),
        "etaDays", order.get("etaDays") == null ? null : service.intValue(order.get("etaDays")),
        "distanceKm", order.get("distanceKm") == null ? null : service.doubleValue(order.get("distanceKm")),
        "createdAt", service.stringValue(order.get("createdAt")),
        "updatedAt", service.stringValue(order.get("updatedAt")));
  }

  private String paymentEventTitle(String status) {
    return switch (service.normalize(status)) {
      case "paid" -> "Pagamento aprovado";
      case "authorized" -> "Pagamento autorizado";
      case "requires_action", "pending" -> "Pagamento pendente";
      case "rejected" -> "Pagamento recusado";
      case "cancelled" -> "Pagamento cancelado";
      case "expired" -> "Pagamento expirado";
      default -> "Pagamento atualizado";
    };
  }

  private void recordPaymentEvent(long orderId, String provider, String externalId, String eventType, String status, Map<String, Object> payloadJson) {
    // ON CONFLICT DO NOTHING garante idempotência atômica — mesmo que dois webhooks
    // idênticos cheguem simultaneamente, apenas um será inserido (via idx_payment_events_dedup).
    service.run("""
        INSERT INTO payment_events (order_id, provider, external_id, event_type, status, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?::jsonb, NOW())
        ON CONFLICT (provider, event_type, external_id)
        WHERE external_id IS NOT NULL
        DO NOTHING
        """, orderId, provider, externalId, eventType, status, service.json(payloadJson));
  }

  private Map<String, Object> createPaymentForOrder(String provider, Map<String, Object> orderPayload, String paymentMethod) {
    if ("mercado_pago".equals(provider)) {
      if (!"pix".equals(paymentMethod) && !properties.mockPaymentProviders()) {
        if (!properties.productionLike() && service.trim(properties.mercadoPagoAccessToken()).isBlank()) {
          String externalId = "mp-card-" + orderPayload.get("id") + "-" + UUID.randomUUID().toString().replace("-", "");
          return service.orderedMap(
              "provider", "mercado_pago",
              "status", "requires_action",
              "externalId", externalId,
              "providerPaymentIntentId", "mp-preference-" + externalId,
              "checkoutUrl", properties.publicAppBaseUrl() + "/checkout?mpStatus=success&token=" + externalId,
              "simulated", true,
              "simulationReason", "sem credenciais Mercado Pago – modo simulado local");
        }
        return createMercadoPagoCardCheckout(orderPayload, paymentMethod);
      }
      if ("pix".equals(paymentMethod) && !properties.mockPaymentProviders()) {
        return createMercadoPagoPixPayment(orderPayload);
      }
      String externalIdPrefix = "pix".equals(paymentMethod) ? "mp-pix-" : "mp-card-";
      String externalId = externalIdPrefix + orderPayload.get("id") + "-" + UUID.randomUUID().toString().replace("-", "");
      if (!"pix".equals(paymentMethod)) {
        return service.orderedMap(
            "provider", "mercado_pago",
            "status", "requires_action",
            "externalId", externalId,
            "providerPaymentIntentId", "mp-preference-" + externalId,
            "checkoutUrl", properties.publicAppBaseUrl() + "/checkout?mpStatus=success&token=" + externalId);
      }
      String pixCode = buildSimulatedPixEmv(service.longValue(orderPayload.get("id")));
      return service.orderedMap(
          "provider", "mercado_pago",
          "status", "pending",
          "externalId", externalId,
          "providerPaymentIntentId", externalId,
          "checkoutUrl", null,
          "qrCode", pixCode,
          "pix", generatePixQrImage(pixCode));
    }
    if ("stripe".equals(provider)) {
      String intentId = "stripe-" + orderPayload.get("id") + "-" + UUID.randomUUID().toString().replace("-", "");
      return service.orderedMap(
          "provider", "stripe",
          "status", properties.mockPaymentProviders() ? "authorized" : "requires_action",
          "externalId", intentId,
          "providerPaymentIntentId", intentId,
          "clientSecret", intentId + "_secret");
    }
    throw new ApiException(400, "Gateway de pagamento nao suportado: " + provider);
  }

  private Map<String, Object> createMercadoPagoCardCheckout(Map<String, Object> orderPayload, String paymentMethod) {
    String accessToken = service.trim(properties.mercadoPagoAccessToken());
    if (accessToken.isBlank()) {
      throw new ApiException(500, "MERCADOPAGO_ACCESS_TOKEN nao configurado para cartao.");
    }

    long orderId = service.longValue(orderPayload.get("id"));
    Map<String, Object> customer = asMap(orderPayload.get("customer"));
    @SuppressWarnings("unchecked")
    List<Map<String, Object>> items = (List<Map<String, Object>>) orderPayload.getOrDefault("items", List.of());

    List<Map<String, Object>> preferenceItems = new ArrayList<>();
    for (Map<String, Object> item : items) {
      Map<String, Object> prefItem = new LinkedHashMap<>();
      prefItem.put("id", String.valueOf(service.longValue(item.get("productId"))));
      prefItem.put("title", service.stringValue(item.get("name")));
      String sku = service.blankToNull(service.stringValue(item.get("sku")));
      if (sku != null) prefItem.put("description", sku);
      prefItem.put("category_id", "others");
      prefItem.put("quantity", service.intValue(item.get("quantity")));
      prefItem.put("currency_id", "BRL");
      prefItem.put("unit_price", bd(item.get("price")));
      preferenceItems.add(prefItem);
    }
    if (preferenceItems.isEmpty()) {
      preferenceItems.add(service.orderedMap(
          "id", "order-" + orderId,
          "title", "Pedido Rodando #" + orderId,
          "description", "Pedido Rodando #" + orderId,
          "category_id", "others",
          "quantity", 1,
          "currency_id", "BRL",
          "unit_price", bd(orderPayload.get("total"))));
    }

    Map<String, Object> requestBody = new LinkedHashMap<>();
    requestBody.put("items", preferenceItems);
    requestBody.put("external_reference", buildOrderExternalReference(orderId));
    requestBody.put("statement_descriptor", "Rodando Moto Center");
    requestBody.put("binary_mode", true);
    requestBody.put("metadata", service.orderedMap(
        "orderId", orderId,
        "platform", "rodando",
        "paymentMethod", paymentMethod));

    String payerEmail = service.blankToNull(normalizeMercadoPagoCheckoutEmail(service.stringValue(customer.get("email"))));
    if (payerEmail != null) {
      Map<String, Object> payerMap = new LinkedHashMap<>();
      payerMap.put("email", payerEmail);
      String payerName = service.trim(service.stringValue(customer.get("name")));
      if (!payerName.isBlank()) {
        List<String> nameParts = List.of(payerName.split("\\s+"));
        payerMap.put("name", nameParts.getFirst());
        if (nameParts.size() > 1) {
          payerMap.put("surname", String.join(" ", nameParts.subList(1, nameParts.size())));
        }
      }
      requestBody.put("payer", payerMap);
    }

    BigDecimal shippingCost = bd(orderPayload.get("shipping"));
    if (shippingCost.compareTo(BigDecimal.ZERO) > 0) {
      requestBody.put("shipment_cost", shippingCost);
    }
    if (canUseMercadoPagoReturnUrls()) {
      requestBody.put("back_urls", service.orderedMap(
          "success", properties.publicAppBaseUrl() + "/checkout?mpStatus=success",
          "pending", properties.publicAppBaseUrl() + "/checkout?mpStatus=pending",
          "failure", properties.publicAppBaseUrl() + "/checkout?mpStatus=cancelled"));
      requestBody.put("auto_return", "approved");
    }
    if (!properties.mercadoPagoNotificationUrl().isBlank() && isHttpsUrl(properties.mercadoPagoNotificationUrl())) {
      requestBody.put("notification_url", properties.mercadoPagoNotificationUrl());
    }

    Map<String, Object> response = postMercadoPagoPreference(orderId, requestBody);
    String preferenceId = service.blankToNull(service.stringValue(response.get("id")));
    String checkoutUrl = firstNonBlank(response.get("init_point"), response.get("sandbox_init_point"));
    if (preferenceId == null || checkoutUrl == null) {
      throw new ApiException(502, "Mercado Pago nao retornou o checkout do cartao.");
    }

    return service.orderedMap(
        "provider", "mercado_pago",
        "status", "requires_action",
        "externalId", preferenceId,
        "providerPaymentIntentId", null,
        "checkoutUrl", checkoutUrl,
        "providerPayload", response);
  }

  private Map<String, Object> createMercadoPagoPixPayment(Map<String, Object> orderPayload) {
    if (shouldUseLocalPixSimulation(orderPayload)) {
      return createLocalPixSimulation(orderPayload, "dados locais sem e-mail/documento compativeis com Mercado Pago live");
    }

    String accessToken = service.trim(properties.mercadoPagoAccessToken());
    if (accessToken.isBlank()) {
      if (properties.productionLike()) {
        throw new ApiException(500, "MERCADOPAGO_ACCESS_TOKEN nao configurado para Pix.");
      }
      return createLocalPixSimulation(orderPayload, "sem credenciais Mercado Pago – modo simulado local");
    }

    long orderId = service.longValue(orderPayload.get("id"));
    Map<String, Object> customer = asMap(orderPayload.get("customer"));
    String payerDocument = service.normalizeDocument(customer.get("document"));
    if (payerDocument.isBlank()) {
      throw new ApiException(400, "CPF/CNPJ do destinatario obrigatorio para gerar pagamento Pix.");
    }

    String payerEmail = resolveMercadoPagoPayerEmail(service.stringValue(customer.get("email")));
    String payerName = service.trim(service.stringValue(customer.get("name")));

    Map<String, Object> payer = new LinkedHashMap<>();
    payer.put("email", payerEmail);
    payer.put("identification", service.orderedMap(
        "type", payerDocument.length() > 11 ? "CNPJ" : "CPF",
        "number", payerDocument));
    if (!payerName.isBlank()) {
      List<String> nameParts = List.of(payerName.split("\\s+"));
      payer.put("first_name", nameParts.getFirst());
      if (nameParts.size() > 1) {
        payer.put("last_name", String.join(" ", nameParts.subList(1, nameParts.size())));
      }
    }

    Map<String, Object> requestBody = new LinkedHashMap<>();
    requestBody.put("transaction_amount", bd(orderPayload.get("total")));
    requestBody.put("description", "Pedido Rodando #" + orderId);
    requestBody.put("payment_method_id", "pix");
    requestBody.put("external_reference", buildOrderExternalReference(orderId));
    requestBody.put("payer", payer);
    requestBody.put("metadata", service.orderedMap(
        "orderId", orderId,
        "platform", "rodando",
        "paymentMethod", "pix"));
    if (!properties.mercadoPagoNotificationUrl().isBlank() && isHttpsUrl(properties.mercadoPagoNotificationUrl())) {
      requestBody.put("notification_url", properties.mercadoPagoNotificationUrl());
    }

    Map<String, Object> response;
    try {
      response = postMercadoPagoPayment(orderId, requestBody);
    } catch (ApiException exception) {
      if (!properties.productionLike() && shouldFallbackToLocalPixSimulation(exception)) {
        return createLocalPixSimulation(orderPayload, "fallback local – " + exception.getMessage());
      }
      throw exception;
    }
    Map<String, Object> pointOfInteraction = asMap(response.get("point_of_interaction"));
    Map<String, Object> transactionData = asMap(pointOfInteraction.get("transaction_data"));
    String paymentId = service.blankToNull(service.stringValue(response.get("id")));
    String qrCode = service.blankToNull(service.stringValue(transactionData.get("qr_code")));
    String qrCodeBase64 = service.blankToNull(service.stringValue(transactionData.get("qr_code_base64")));
    String ticketUrl = service.blankToNull(service.stringValue(transactionData.get("ticket_url")));
    String paymentStatus = normalizeProviderPaymentStatus("mercado_pago", service.stringValue(response.get("status")));

    if (paymentId == null) {
      throw new ApiException(502, "Mercado Pago nao retornou o identificador do pagamento Pix.");
    }
    if (qrCode == null) {
      throw new ApiException(502, "Mercado Pago nao retornou o codigo Pix para o pedido.");
    }

    return service.orderedMap(
        "provider", "mercado_pago",
        "status", paymentStatus.isBlank() ? "pending" : paymentStatus,
        "externalId", paymentId,
        "providerPaymentIntentId", paymentId,
        "checkoutUrl", ticketUrl,
        "qrCode", qrCode,
        "pix", qrCodeBase64 == null ? generatePixQrImage(qrCode) : qrCodeBase64,
        "providerPayload", response);
  }

  private boolean shouldUseLocalPixSimulation(Map<String, Object> orderPayload) {
    if (properties.productionLike()) {
      return false;
    }
    Map<String, Object> customer = asMap(orderPayload.get("customer"));
    String payerEmail = service.trim(service.stringValue(customer.get("email"))).toLowerCase(Locale.ROOT);
    String payerDocument = service.normalizeDocument(customer.get("document"));
    return payerEmail.isBlank() || payerEmail.endsWith(".local") || payerDocument.isBlank();
  }

  private boolean shouldFallbackToLocalPixSimulation(ApiException exception) {
    // In non-production, fall back to simulation for any MP-level rejection or
    // gateway error — live credentials require real CPF/email, self-payment is
    // blocked, CPF checksum must be valid, etc. None of these should hard-fail
    // in a dev/local environment.
    int status = exception.getStatus();
    return status == 400 || status == 401 || status == 403 || status == 422 || status >= 500;
  }

  private Map<String, Object> createLocalPixSimulation(Map<String, Object> orderPayload, String reason) {
    String externalId = "mp-pix-local-" + orderPayload.get("id") + "-" + UUID.randomUUID().toString().replace("-", "");
    String pixCode = buildSimulatedPixEmv(service.longValue(orderPayload.get("id")));
    return service.orderedMap(
        "provider", "mercado_pago",
        "status", "pending",
        "externalId", externalId,
        "providerPaymentIntentId", externalId,
        "checkoutUrl", null,
        "qrCode", pixCode,
        "pix", generatePixQrImage(pixCode),
        "simulated", true,
        "simulationReason", reason);
  }

  private Map<String, Object> postMercadoPagoPreference(long orderId, Map<String, Object> requestBody) {
    try {
      @SuppressWarnings("unchecked")
      List<Map<String, Object>> itemMaps = (List<Map<String, Object>>) requestBody.getOrDefault("items", List.of());
      List<PreferenceItemRequest> sdkItems = itemMaps.stream()
          .map(item -> {
            String desc = service.blankToNull(service.stringValue(item.get("description")));
            String catId = service.blankToNull(service.stringValue(item.get("category_id")));
            var ib = PreferenceItemRequest.builder()
                .id(service.stringValue(item.get("id")))
                .title(service.stringValue(item.get("title")))
                .quantity(service.intValue(item.get("quantity")))
                .currencyId("BRL")
                .unitPrice(bd(item.get("unit_price")));
            if (desc != null) ib.description(desc);
            if (catId != null) ib.categoryId(catId);
            return ib.build();
          })
          .toList();

      var builder = PreferenceRequest.builder()
          .items(sdkItems)
          .externalReference(service.stringValue(requestBody.get("external_reference")))
          .statementDescriptor(service.stringValue(requestBody.getOrDefault("statement_descriptor", "Rodando Moto Center")))
          .binaryMode(Boolean.TRUE.equals(requestBody.get("binary_mode")));

      @SuppressWarnings("unchecked")
      Map<String, Object> payerMap = (Map<String, Object>) requestBody.get("payer");
      if (payerMap != null) {
        String payerName = service.blankToNull(service.stringValue(payerMap.get("name")));
        String payerSurname = service.blankToNull(service.stringValue(payerMap.get("surname")));
        var pb = PreferencePayerRequest.builder()
            .email(service.stringValue(payerMap.get("email")));
        if (payerName != null) pb.name(payerName);
        if (payerSurname != null) pb.surname(payerSurname);
        builder.payer(pb.build());
      }

      @SuppressWarnings("unchecked")
      Map<String, Object> backUrlsMap = (Map<String, Object>) requestBody.get("back_urls");
      if (backUrlsMap != null) {
        builder.backUrls(PreferenceBackUrlsRequest.builder()
            .success(service.stringValue(backUrlsMap.get("success")))
            .pending(service.stringValue(backUrlsMap.get("pending")))
            .failure(service.stringValue(backUrlsMap.get("failure")))
            .build());
        builder.autoReturn(service.stringValue(requestBody.get("auto_return")));
      }

      BigDecimal shipmentCost = bd(requestBody.get("shipment_cost"));
      if (shipmentCost.compareTo(BigDecimal.ZERO) > 0) {
        builder.shipments(PreferenceShipmentsRequest.builder()
            .cost(shipmentCost)
            .mode("not_specified")
            .build());
      }

      String notificationUrl = service.blankToNull(service.stringValue(requestBody.get("notification_url")));
      if (notificationUrl != null) {
        builder.notificationUrl(notificationUrl);
      }

      MPRequestOptions options = MPRequestOptions.builder()
          .accessToken(properties.mercadoPagoAccessToken())
          .customHeaders(Map.of("X-Idempotency-Key", "rodando-card-order-" + orderId))
          .build();

      Preference pref = new PreferenceClient().create(builder.build(), options);

      Map<String, Object> result = new LinkedHashMap<>();
      result.put("id", pref.getId());
      result.put("init_point", pref.getInitPoint());
      result.put("sandbox_init_point", pref.getSandboxInitPoint());
      result.put("external_reference", pref.getExternalReference());
      return result;
    } catch (MPApiException exception) {
      throw mercadoPagoSdkException("criar o checkout do cartao", exception);
    } catch (MPException exception) {
      throw new ApiException(502, "Falha ao comunicar com o Mercado Pago para criar o checkout do cartao.");
    }
  }

  private Map<String, Object> postMercadoPagoPayment(long orderId, Map<String, Object> requestBody) {
    try {
      @SuppressWarnings("unchecked")
      Map<String, Object> payerMap = (Map<String, Object>) requestBody.getOrDefault("payer", Map.of());
      @SuppressWarnings("unchecked")
      Map<String, Object> identMap = (Map<String, Object>) payerMap.getOrDefault("identification", Map.of());

      var payerBuilder = PaymentPayerRequest.builder()
          .email(service.stringValue(payerMap.get("email")));
      if (!identMap.isEmpty()) {
        payerBuilder.identification(PaymentPayerIdentificationRequest.builder()
            .type(service.stringValue(identMap.get("type")))
            .number(service.stringValue(identMap.get("number")))
            .build());
      }
      String firstName = service.blankToNull(service.stringValue(payerMap.get("first_name")));
      String lastName = service.blankToNull(service.stringValue(payerMap.get("last_name")));
      if (firstName != null) payerBuilder.firstName(firstName);
      if (lastName != null) payerBuilder.lastName(lastName);

      var reqBuilder = PaymentCreateRequest.builder()
          .transactionAmount(bd(requestBody.get("transaction_amount")))
          .paymentMethodId("pix")
          .description(service.stringValue(requestBody.get("description")))
          .externalReference(service.stringValue(requestBody.get("external_reference")))
          .payer(payerBuilder.build());

      String notificationUrl = service.blankToNull(service.stringValue(requestBody.get("notification_url")));
      if (notificationUrl != null) {
        reqBuilder.notificationUrl(notificationUrl);
      }

      MPRequestOptions options = MPRequestOptions.builder()
          .accessToken(properties.mercadoPagoAccessToken())
          .customHeaders(Map.of("X-Idempotency-Key", "rodando-pix-order-" + orderId))
          .build();

      Payment payment = new PaymentClient().create(reqBuilder.build(), options);

      Map<String, Object> result = new LinkedHashMap<>();
      result.put("id", payment.getId());
      result.put("status", payment.getStatus());
      result.put("status_detail", payment.getStatusDetail());
      if (payment.getPointOfInteraction() != null
          && payment.getPointOfInteraction().getTransactionData() != null) {
        var txData = payment.getPointOfInteraction().getTransactionData();
        result.put("point_of_interaction", Map.of(
            "transaction_data", service.orderedMap(
                "qr_code", txData.getQrCode(),
                "qr_code_base64", txData.getQrCodeBase64(),
                "ticket_url", txData.getTicketUrl())));
      }
      return result;
    } catch (MPApiException exception) {
      throw mercadoPagoSdkException("gerar o Pix", exception);
    } catch (MPException exception) {
      throw new ApiException(502, "Falha ao comunicar com o Mercado Pago para gerar o Pix.");
    }
  }

  private Map<String, Object> fetchMercadoPagoPayment(String paymentId) {
    try {
      MPRequestOptions options = MPRequestOptions.builder()
          .accessToken(properties.mercadoPagoAccessToken())
          .build();
      Payment payment = new PaymentClient().get(Long.parseLong(paymentId), options);
      Map<String, Object> result = new LinkedHashMap<>();
      result.put("id", payment.getId());
      result.put("status", payment.getStatus());
      result.put("status_detail", payment.getStatusDetail());
      result.put("external_reference", payment.getExternalReference());
      return result;
    } catch (MPApiException exception) {
      throw mercadoPagoSdkException("consultar o pagamento", exception);
    } catch (MPException exception) {
      throw new ApiException(502, "Falha ao consultar o pagamento no Mercado Pago.");
    } catch (NumberFormatException exception) {
      throw new ApiException(400, "ID de pagamento invalido: " + paymentId);
    }
  }

  private Map<String, Object> searchMercadoPagoPaymentByExternalReference(long orderId) {
    try {
      Map<String, Object> response = webClient.get()
          .uri(uriBuilder -> uriBuilder
              .scheme("https")
              .host("api.mercadopago.com")
              .path("/v1/payments/search")
              .queryParam("external_reference", buildOrderExternalReference(orderId))
              .queryParam("sort", "date_created")
              .queryParam("criteria", "desc")
              .queryParam("limit", 1)
              .build())
          .header(HttpHeaders.AUTHORIZATION, "Bearer " + properties.mercadoPagoAccessToken())
          .accept(MediaType.APPLICATION_JSON)
          .retrieve()
          .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
          .block();
      Map<String, Object> payload = response == null ? Map.of() : response;
      Object results = payload.get("results");
      if (results instanceof List<?> list && !list.isEmpty() && list.getFirst() instanceof Map<?, ?> first) {
        @SuppressWarnings("unchecked")
        Map<String, Object> payment = (Map<String, Object>) first;
        return payment;
      }
      return Map.of();
    } catch (WebClientResponseException exception) {
      throw mercadoPagoRequestException("consultar o pagamento", exception);
    } catch (Exception exception) {
      throw new ApiException(502, "Falha ao consultar o pagamento no Mercado Pago.");
    }
  }

  private ApiException mercadoPagoRequestException(String action, WebClientResponseException exception) {
    Map<String, Object> payload = jsonSupport.readMap(exception.getResponseBodyAsString());
    String detail = firstNonBlank(
        extractMercadoPagoCause(payload),
        payload.get("message"),
        payload.get("error"),
        exception.getStatusText());
    if (detail != null && detail.toLowerCase(Locale.ROOT).contains("unauthorized use of live credentials")) {
      return new ApiException(400, "Mercado Pago recusou " + action + ": use um e-mail e CPF/CNPJ reais na conta para credenciais live.");
    }
    int status = exception.getStatusCode().value();
    if (status == 400 || status == 422) {
      return new ApiException(400, "Mercado Pago recusou " + action + ": " + detail);
    }
    return new ApiException(502, "Mercado Pago falhou ao " + action + ": " + detail);
  }

  private ApiException mercadoPagoSdkException(String action, MPApiException exception) {
    Map<String, Object> payload = jsonSupport.readMap(exception.getApiResponse().getContent());
    String detail = firstNonBlank(
        extractMercadoPagoCause(payload),
        payload.get("message"),
        payload.get("error"),
        exception.getMessage());
    if (detail != null && detail.toLowerCase(Locale.ROOT).contains("unauthorized use of live credentials")) {
      return new ApiException(400, "Mercado Pago recusou " + action + ": use um e-mail e CPF/CNPJ reais na conta para credenciais live.");
    }
    int status = exception.getStatusCode();
    if (status == 400 || status == 422) {
      return new ApiException(400, "Mercado Pago recusou " + action + ": " + detail);
    }
    return new ApiException(502, "Mercado Pago falhou ao " + action + ": " + detail);
  }

  private String extractMercadoPagoCause(Map<String, Object> payload) {
    Object causes = payload.get("cause");
    if (causes instanceof List<?> list && !list.isEmpty() && list.getFirst() instanceof Map<?, ?> cause) {
      return firstNonBlank(cause.get("description"), cause.get("code"));
    }
    return null;
  }

  private String resolveMercadoPagoPayerEmail(String rawEmail) {
    String email = service.trim(rawEmail).toLowerCase(Locale.ROOT);
    if (email.isBlank()) {
      throw new ApiException(400, "Email do comprador obrigatorio para gerar pagamento Pix.");
    }
    if (email.endsWith(".local")) {
      throw new ApiException(400, "Atualize o e-mail da conta para um endereco real antes de gerar pagamento Pix com Mercado Pago.");
    }
    return email;
  }

  private String normalizeMercadoPagoCheckoutEmail(String rawEmail) {
    String email = service.trim(rawEmail).toLowerCase(Locale.ROOT);
    return email.endsWith(".local") ? "" : email;
  }

  private String buildOrderExternalReference(long orderId) {
    return "order-" + orderId;
  }

  private long parseOrderIdFromExternalReference(String externalReference) {
    String normalized = service.trim(externalReference);
    if (!normalized.startsWith("order-")) {
      return 0L;
    }
    try {
      return Long.parseLong(normalized.substring("order-".length()));
    } catch (Exception ignored) {
      return 0L;
    }
  }

  private boolean looksLikeMercadoPagoPaymentId(String value) {
    return service.trim(value).matches("^\\d+$");
  }

  private boolean canUseMercadoPagoReturnUrls() {
    String baseUrl = properties.publicAppBaseUrl();
    return isHttpsUrl(baseUrl) || isLocalhostUrl(baseUrl);
  }

  private boolean isHttpsUrl(String value) {
    try {
      return "https".equalsIgnoreCase(URI.create(service.trim(value)).getScheme());
    } catch (Exception ignored) {
      return false;
    }
  }

  private boolean isLocalhostUrl(String value) {
    try {
      String host = URI.create(service.trim(value)).getHost();
      return host != null && (host.equals("localhost") || host.equals("127.0.0.1"));
    } catch (Exception ignored) {
      return false;
    }
  }

  private String firstNonBlank(Object... values) {
    for (Object value : values) {
      String candidate = service.blankToNull(service.stringValue(value));
      if (candidate != null) {
        return candidate;
      }
    }
    return null;
  }

  /**
   * Gera um EMV QR Code Pix estruturalmente válido (padrão BACEN) para ambientes simulados.
   * A chave Pix não é real, mas os campos de tamanho e o CRC-16/CCITT-FALSE são calculados
   * corretamente, então o código é parseável por qualquer leitor sem erro de "chave inválida".
   */
  private String buildSimulatedPixEmv(long orderId) {
    String gui = "BR.GOV.BCB.PIX";
    String key = "pedido-" + orderId + "@rodando.local";

    String guiField = "00" + String.format("%02d", gui.length()) + gui;
    String keyField = "01" + String.format("%02d", key.length()) + key;
    String merchantInfo = guiField + keyField;
    String tag26 = "26" + String.format("%02d", merchantInfo.length()) + merchantInfo;

    // Campos obrigatórios do EMV Pix: versão, merchant info, MCC, moeda, país, CRC placeholder
    String payload = "000201" + tag26 + "52040000" + "5303986" + "5802BR" + "6304";

    // CRC-16/CCITT-FALSE: poly 0x1021, valor inicial 0xFFFF, sem reflexão
    int crc = 0xFFFF;
    for (char c : payload.toCharArray()) {
      crc ^= (c << 8);
      for (int i = 0; i < 8; i++) {
        crc = (crc & 0x8000) != 0 ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xFFFF;
      }
    }
    return payload + String.format("%04X", crc);
  }

  public String generatePixQrImage(String pixCode) {
    try {
      Map<EncodeHintType, Object> hints = new HashMap<>();
      hints.put(EncodeHintType.MARGIN, 1);
      hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
      hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");

      var matrix =
          new QRCodeWriter()
              .encode(pixCode, BarcodeFormat.QR_CODE, PIX_QR_IMAGE_SIZE, PIX_QR_IMAGE_SIZE, hints);

      BufferedImage image =
          new BufferedImage(matrix.getWidth(), matrix.getHeight(), BufferedImage.TYPE_INT_RGB);
      for (int x = 0; x < matrix.getWidth(); x += 1) {
        for (int y = 0; y < matrix.getHeight(); y += 1) {
          image.setRGB(x, y, matrix.get(x, y) ? 0xFF000000 : 0xFFFFFFFF);
        }
      }

      ByteArrayOutputStream output = new ByteArrayOutputStream();
      ImageIO.write(image, "PNG", output);
      return Base64.getEncoder().encodeToString(output.toByteArray());
    } catch (Exception exception) {
      throw new ApiException(500, "Falha ao gerar QR Code Pix.");
    }
  }

  private void consumeCartItemsForOrder(long orderId) {
    Map<String, Object> order = service.one("""
        SELECT id, user_id AS "userId", cart_consumed_at AS "cartConsumedAt"
        FROM orders
        WHERE id = ?
        LIMIT 1
        """, orderId).orElse(null);
    if (order == null || order.get("cartConsumedAt") != null) {
      return;
    }
    List<Map<String, Object>> orderItems = service.many("""
        SELECT product_id AS "productId", quantity
        FROM order_items
        WHERE order_id = ?
        ORDER BY created_at ASC
        """, orderId);
    Map<String, Object> cart = service.one("""
        SELECT id
        FROM carts
        WHERE user_id = ? AND status = 'open'
        ORDER BY created_at ASC
        LIMIT 1
        """, service.longValue(order.get("userId"))).orElse(null);
    if (cart != null) {
      for (Map<String, Object> item : orderItems) {
        service.run("DELETE FROM cart_items WHERE cart_id = ? AND product_id = ? AND quantity <= ?",
            service.longValue(cart.get("id")), service.longValue(item.get("productId")), service.intValue(item.get("quantity")));
        service.run("UPDATE cart_items SET quantity = quantity - ?, updated_at = NOW() WHERE cart_id = ? AND product_id = ?",
            service.intValue(item.get("quantity")), service.longValue(cart.get("id")), service.longValue(item.get("productId")));
      }
      service.run("DELETE FROM cart_items WHERE cart_id = ? AND quantity <= 0", service.longValue(cart.get("id")));
      int remaining = service.intValue(service.one("SELECT COUNT(*) AS total FROM cart_items WHERE cart_id = ?", service.longValue(cart.get("id"))).orElse(Map.of()).get("total"));
      if (remaining == 0) {
        service.run("UPDATE carts SET status = 'converted', updated_at = NOW() WHERE id = ?", service.longValue(cart.get("id")));
      }
    }
    service.run("UPDATE orders SET cart_consumed_at = NOW(), updated_at = NOW() WHERE id = ?", orderId);
    enqueueOrderNotifications(orderId);
  }

  private void enqueueOrderNotifications(long orderId) {
    service.run("""
        INSERT INTO outbox_jobs (job_type, payload_json, status, created_at, updated_at)
        VALUES ('customer_order_confirmation', ?::jsonb, 'pending', NOW(), NOW())
        """, service.json(service.orderedMap("orderId", orderId)));
    service.run("""
        INSERT INTO outbox_jobs (job_type, payload_json, status, created_at, updated_at)
        VALUES ('owner_sale_notification', ?::jsonb, 'pending', NOW(), NOW())
        """, service.json(service.orderedMap("orderId", orderId)));
  }

  private void restoreStockForOrder(long orderId, String reason) {
    long locationId = service.one("SELECT id FROM stock_locations WHERE name = ? LIMIT 1", "Loja")
        .map(row -> service.longValue(row.get("id")))
        .orElse(1L);
    List<Map<String, Object>> items = service.many("""
        SELECT product_id AS "productId", quantity
        FROM order_items
        WHERE order_id = ?
        ORDER BY created_at ASC
        """, orderId);
    for (Map<String, Object> item : items) {
      service.run("UPDATE product_stocks SET quantity = quantity + ? WHERE product_id = ?",
          service.intValue(item.get("quantity")), service.longValue(item.get("productId")));
      service.run("""
          INSERT INTO inventory_movements (product_id, location_id, delta, reason, created_at)
          VALUES (?, ?, ?, ?, NOW())
          """, service.longValue(item.get("productId")), locationId, service.intValue(item.get("quantity")), reason);
    }
  }

  private void cancelOrderAndRestoreResources(long orderId, String paymentStatus, String description, String source, boolean cancelPaymentTransactions) {
    Map<String, Object> order = service.one("""
        SELECT id, status
        FROM orders
        WHERE id = ?
        LIMIT 1
        """, orderId).orElse(null);
    if (order == null || "cancelled".equals(service.normalize(service.stringValue(order.get("status"))))) {
      return;
    }
    restoreStockForOrder(orderId, "order_cancelled");
    service.run("UPDATE orders SET status = 'cancelled', payment_status = ?, updated_at = NOW() WHERE id = ?", paymentStatus, orderId);
    if (cancelPaymentTransactions) {
      service.run("UPDATE payment_transactions SET status = 'cancelled', updated_at = NOW() WHERE order_id = ? AND status <> 'paid'", orderId);
    }
    service.run("""
        INSERT INTO order_events (order_id, status, title, description, source, created_at)
        VALUES (?, 'cancelled', 'Pedido cancelado', ?, ?, NOW())
        """, orderId, description, source);
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> asMap(Object value) {
    return value instanceof Map<?, ?> map ? (Map<String, Object>) map : Map.of();
  }
}


