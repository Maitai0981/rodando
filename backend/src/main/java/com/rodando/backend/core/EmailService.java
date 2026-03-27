package com.rodando.backend.core;

import com.rodando.backend.config.AppProperties;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

  private static final Logger log = LoggerFactory.getLogger(EmailService.class);
  private static final Locale PT_BR = new Locale("pt", "BR");

  private final RodandoService service;
  private final AppProperties properties;
  private final JavaMailSender mailSender;

  public EmailService(RodandoService service, AppProperties properties, ObjectProvider<JavaMailSender> mailSenderProvider) {
    this.service = service;
    this.properties = properties;
    this.mailSender = mailSenderProvider.getIfAvailable();
  }

  // ── public API ───────────────────────────────────────────────────────────

  public void sendCustomerOrderConfirmation(long orderId) {
    Map<String, Object> order = queryOrderForEmail(orderId);
    if (order == null) {
      log.warn("[EMAIL] sendCustomerOrderConfirmation: pedido {} nao encontrado", orderId);
      return;
    }
    String toEmail = service.trim(service.stringValue(order.get("customerEmail")));
    if (toEmail.isBlank()) {
      log.warn("[EMAIL] sendCustomerOrderConfirmation: email do cliente nao encontrado para pedido {}", orderId);
      return;
    }
    String customerName = service.trim(service.stringValue(order.get("customerName")));
    String subject = "Pedido #" + orderId + " confirmado – " + properties.emailFromName();
    String html = buildCustomerConfirmationHtml(orderId, customerName, order);
    send(toEmail, subject, html);
  }

  /**
   * Sends the OTP code by email.
   * @return the OTP code itself when email is NOT configured (dev/test mode), null otherwise.
   */
  public String sendPasswordOtpEmail(String userName, String userEmail, String otp, String purpose) {
    boolean isReset = "reset".equals(purpose);
    String subject = (isReset ? "Redefinicao de senha" : "Codigo de verificacao para alteracao de senha")
        + " – " + properties.emailFromName();
    String html = buildPasswordOtpHtml(userName, otp, isReset);
    if (!properties.emailEnabled()) {
      log.warn("[OTP DEV] Email nao configurado. Codigo para {}: {} (purpose={})", userEmail, otp, purpose);
      send(userEmail, subject, html); // still calls send() for the simulation log
      return otp;
    }
    send(userEmail, subject, html);
    return null;
  }

  public void sendOwnerSaleAlert(long orderId) {
    Map<String, Object> settings = service.one("""
        SELECT sales_alert_email AS "salesAlertEmail", sales_alert_whatsapp AS "salesAlertWhatsapp"
        FROM owner_settings
        ORDER BY updated_at DESC
        LIMIT 1
        """).orElse(Map.of());
    String alertEmail = service.trim(service.stringValue(settings.get("salesAlertEmail")));
    if (alertEmail.isBlank()) {
      // Fallback: try owner user email
      Optional<Map<String, Object>> owner = service.one("""
          SELECT u.email FROM users u
          JOIN user_roles ur ON ur.user_id = u.id
          JOIN roles r ON r.id = ur.role_id
          WHERE r.code = 'owner'
          ORDER BY u.id ASC LIMIT 1
          """);
      alertEmail = owner.map(row -> service.trim(service.stringValue(row.get("email")))).orElse("");
    }
    if (alertEmail.isBlank()) {
      log.info("[EMAIL] sendOwnerSaleAlert: nenhum email de alerta configurado para pedido {}", orderId);
      return;
    }
    Map<String, Object> order = queryOrderForEmail(orderId);
    if (order == null) {
      log.warn("[EMAIL] sendOwnerSaleAlert: pedido {} nao encontrado", orderId);
      return;
    }
    String subject = "Nova venda – Pedido #" + orderId + " | " + formatCurrency(order.get("total"));
    String html = buildOwnerAlertHtml(orderId, order);
    send(alertEmail, subject, html);
  }

  // ── internal: send ───────────────────────────────────────────────────────

  public void send(String to, String subject, String htmlBody) {
    if (mailSender == null || !properties.emailEnabled()) {
      log.info("[EMAIL SIMULADO] Para: {} | Assunto: {} | Tamanho: {} chars", to, subject, htmlBody.length());
      return;
    }
    try {
      MimeMessage message = mailSender.createMimeMessage();
      MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
      helper.setFrom(new InternetAddress(properties.emailFromAddress(), properties.emailFromName(), "UTF-8"));
      helper.setTo(to);
      helper.setSubject(subject);
      helper.setText(htmlBody, true);
      mailSender.send(message);
      log.info("[EMAIL ENVIADO] Para: {} | Assunto: {}", to, subject);
    } catch (Exception e) {
      log.error("[EMAIL ERRO] Para: {} | Assunto: {} | Erro: {}", to, subject, e.getMessage());
      throw new RuntimeException("Falha ao enviar email: " + e.getMessage(), e);
    }
  }

  // ── internal: DB query ───────────────────────────────────────────────────

  @SuppressWarnings("unchecked")
  private Map<String, Object> queryOrderForEmail(long orderId) {
    Map<String, Object> order = service.one("""
        SELECT
          o.id,
          o.status,
          o.payment_status AS "paymentStatus",
          o.payment_method AS "paymentMethod",
          o.delivery_method AS "deliveryMethod",
          o.subtotal,
          o.shipping,
          o.total,
          o.eta_days AS "etaDays",
          o.recipient_name AS "recipientName",
          o.recipient_phone AS "recipientPhone",
          o.delivery_street AS "deliveryStreet",
          o.delivery_number AS "deliveryNumber",
          o.delivery_complement AS "deliveryComplement",
          o.delivery_district AS "deliveryDistrict",
          o.delivery_city AS "deliveryCity",
          o.delivery_state AS "deliveryState",
          o.delivery_cep AS "deliveryCep",
          o.created_at AS "createdAt",
          u.name AS "customerName",
          u.email AS "customerEmail",
          u.phone AS "customerPhone"
        FROM orders o
        JOIN users u ON u.id = o.user_id
        WHERE o.id = ?
        LIMIT 1
        """, orderId).orElse(null);
    if (order == null) return null;

    List<Map<String, Object>> items = service.many("""
        SELECT
          p.name AS "productName",
          oi.quantity,
          oi.unit_price AS "unitPrice",
          oi.line_total AS "lineTotal"
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ?
        ORDER BY oi.created_at ASC
        """, orderId);
    Map<String, Object> mutable = new java.util.LinkedHashMap<>(order);
    mutable.put("items", items);
    return mutable;
  }

  // ── internal: HTML builders ───────────────────────────────────────────────

  @SuppressWarnings("unchecked")
  private String buildCustomerConfirmationHtml(long orderId, String customerName, Map<String, Object> order) {
    String deliveryMethod = service.trim(service.stringValue(order.get("deliveryMethod")));
    String paymentMethod = service.trim(service.stringValue(order.get("paymentMethod")));
    List<Map<String, Object>> items = (List<Map<String, Object>>) order.getOrDefault("items", List.of());

    String deliverySection = buildDeliverySection(deliveryMethod, order);
    String itemsRows = buildItemsRows(items);
    String paymentLabel = paymentLabel(paymentMethod);
    String appUrl = properties.publicAppBaseUrl();

    return """
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Pedido confirmado</title></head>
        <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
        <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
          <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;">
              <!-- Header -->
              <tr><td style="background:#111118;padding:24px 32px;">
                <h1 style="margin:0;color:#d4a843;font-size:22px;font-weight:700;">Rodando Moto Center</h1>
                <p style="margin:6px 0 0;color:#9ca3af;font-size:13px;">Peças para motos – Cascavel / PR</p>
              </td></tr>
              <!-- Body -->
              <tr><td style="padding:32px;">
                <h2 style="margin:0 0 8px;color:#111118;font-size:18px;">Pedido #%d confirmado!</h2>
                <p style="margin:0 0 24px;color:#374151;font-size:14px;">Olá, <strong>%s</strong>! Seu pagamento foi confirmado com sucesso.</p>

                <!-- Payment info -->
                <table width="100%%" cellpadding="8" cellspacing="0" style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:6px;">
                  <tr style="background:#f9fafb;">
                    <td style="font-size:12px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:10px 16px;" colspan="2">Pagamento</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#374151;padding:8px 16px;">Método</td>
                    <td style="font-size:13px;color:#111118;font-weight:600;padding:8px 16px;">%s</td>
                  </tr>
                  <tr style="background:#f9fafb;">
                    <td style="font-size:13px;color:#374151;padding:8px 16px;">Subtotal</td>
                    <td style="font-size:13px;color:#111118;padding:8px 16px;">%s</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#374151;padding:8px 16px;">Frete</td>
                    <td style="font-size:13px;color:#111118;padding:8px 16px;">%s</td>
                  </tr>
                  <tr style="background:#fff8e1;">
                    <td style="font-size:14px;color:#374151;font-weight:700;padding:10px 16px;">Total</td>
                    <td style="font-size:14px;color:#d4a843;font-weight:700;padding:10px 16px;">%s</td>
                  </tr>
                </table>

                <!-- Items -->
                <table width="100%%" cellpadding="8" cellspacing="0" style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:6px;">
                  <tr style="background:#f9fafb;">
                    <td style="font-size:12px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:10px 16px;" colspan="3">Itens do pedido</td>
                  </tr>
                  <tr style="background:#f3f4f6;">
                    <td style="font-size:11px;color:#6b7280;padding:6px 16px;">Produto</td>
                    <td style="font-size:11px;color:#6b7280;padding:6px 8px;text-align:center;">Qtd</td>
                    <td style="font-size:11px;color:#6b7280;padding:6px 16px;text-align:right;">Total</td>
                  </tr>
                  %s
                </table>

                <!-- Delivery -->
                %s

                <!-- CTA -->
                <div style="margin-top:24px;text-align:center;">
                  <a href="%s/orders/%d" style="display:inline-block;padding:12px 28px;background:#d4a843;color:#111118;font-weight:700;font-size:14px;text-decoration:none;border-radius:8px;">
                    Acompanhar pedido
                  </a>
                </div>

                <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;text-align:center;">Dúvidas? Entre em contato com nossa equipe.</p>
              </td></tr>
              <!-- Footer -->
              <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
                <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">Rodando Moto Center · Cascavel, PR · Este é um email automático.</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
        </body></html>
        """.formatted(
        orderId, customerName,
        paymentLabel,
        formatCurrency(order.get("subtotal")),
        formatCurrency(order.get("shipping")),
        formatCurrency(order.get("total")),
        itemsRows,
        deliverySection,
        appUrl, orderId);
  }

  @SuppressWarnings("unchecked")
  private String buildOwnerAlertHtml(long orderId, Map<String, Object> order) {
    String customerName = service.trim(service.stringValue(order.get("customerName")));
    String customerEmail = service.trim(service.stringValue(order.get("customerEmail")));
    String customerPhone = service.trim(service.stringValue(order.get("customerPhone")));
    String deliveryMethod = service.trim(service.stringValue(order.get("deliveryMethod")));
    String paymentMethod = service.trim(service.stringValue(order.get("paymentMethod")));
    List<Map<String, Object>> items = (List<Map<String, Object>>) order.getOrDefault("items", List.of());
    String itemsRows = buildItemsRows(items);
    String deliverySection = buildDeliverySection(deliveryMethod, order);
    String appUrl = properties.publicAppBaseUrl();

    return """
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Nova venda</title></head>
        <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
        <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
          <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;">
              <tr><td style="background:#111118;padding:24px 32px;">
                <h1 style="margin:0;color:#d4a843;font-size:22px;font-weight:700;">Nova venda recebida!</h1>
                <p style="margin:6px 0 0;color:#9ca3af;font-size:13px;">Pedido #%d · %s</p>
              </td></tr>
              <tr><td style="padding:32px;">
                <!-- Customer -->
                <table width="100%%" cellpadding="8" cellspacing="0" style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:6px;">
                  <tr style="background:#f9fafb;">
                    <td style="font-size:12px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:10px 16px;" colspan="2">Cliente</td>
                  </tr>
                  <tr><td style="font-size:13px;color:#374151;padding:8px 16px;">Nome</td><td style="font-size:13px;color:#111118;font-weight:600;padding:8px 16px;">%s</td></tr>
                  <tr style="background:#f9fafb;"><td style="font-size:13px;color:#374151;padding:8px 16px;">Email</td><td style="font-size:13px;color:#111118;padding:8px 16px;">%s</td></tr>
                  <tr><td style="font-size:13px;color:#374151;padding:8px 16px;">Telefone</td><td style="font-size:13px;color:#111118;padding:8px 16px;">%s</td></tr>
                </table>

                <!-- Order summary -->
                <table width="100%%" cellpadding="8" cellspacing="0" style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:6px;">
                  <tr style="background:#f9fafb;">
                    <td style="font-size:12px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:10px 16px;" colspan="2">Pedido</td>
                  </tr>
                  <tr><td style="font-size:13px;color:#374151;padding:8px 16px;">Pagamento</td><td style="font-size:13px;color:#111118;padding:8px 16px;">%s</td></tr>
                  <tr style="background:#f9fafb;"><td style="font-size:13px;color:#374151;padding:8px 16px;">Entrega</td><td style="font-size:13px;color:#111118;padding:8px 16px;">%s</td></tr>
                  <tr><td style="font-size:13px;color:#374151;padding:8px 16px;">Subtotal</td><td style="font-size:13px;color:#111118;padding:8px 16px;">%s</td></tr>
                  <tr style="background:#f9fafb;"><td style="font-size:13px;color:#374151;padding:8px 16px;">Frete</td><td style="font-size:13px;color:#111118;padding:8px 16px;">%s</td></tr>
                  <tr style="background:#fff8e1;"><td style="font-size:14px;color:#374151;font-weight:700;padding:10px 16px;">Total</td><td style="font-size:14px;color:#d4a843;font-weight:700;padding:10px 16px;">%s</td></tr>
                </table>

                <!-- Items -->
                <table width="100%%" cellpadding="8" cellspacing="0" style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:6px;">
                  <tr style="background:#f9fafb;">
                    <td style="font-size:12px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:10px 16px;" colspan="3">Itens</td>
                  </tr>
                  <tr style="background:#f3f4f6;">
                    <td style="font-size:11px;color:#6b7280;padding:6px 16px;">Produto</td>
                    <td style="font-size:11px;color:#6b7280;padding:6px 8px;text-align:center;">Qtd</td>
                    <td style="font-size:11px;color:#6b7280;padding:6px 16px;text-align:right;">Total</td>
                  </tr>
                  %s
                </table>

                %s

                <div style="margin-top:24px;text-align:center;">
                  <a href="%s/owner/orders" style="display:inline-block;padding:12px 28px;background:#d4a843;color:#111118;font-weight:700;font-size:14px;text-decoration:none;border-radius:8px;">
                    Ver no painel owner
                  </a>
                </div>
              </td></tr>
              <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
                <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">Rodando Moto Center · Painel owner · Email automático</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
        </body></html>
        """.formatted(
        orderId, formatCurrency(order.get("total")),
        customerName, customerEmail, customerPhone.isBlank() ? "—" : customerPhone,
        paymentLabel(paymentMethod),
        "delivery".equals(deliveryMethod) ? "Entrega" : "Retirada na loja",
        formatCurrency(order.get("subtotal")),
        formatCurrency(order.get("shipping")),
        formatCurrency(order.get("total")),
        itemsRows,
        deliverySection,
        appUrl);
  }

  private String buildItemsRows(List<Map<String, Object>> items) {
    if (items.isEmpty()) return "<tr><td colspan=\"3\" style=\"font-size:13px;color:#6b7280;padding:8px 16px;\">Nenhum item.</td></tr>";
    StringBuilder sb = new StringBuilder();
    for (Map<String, Object> item : items) {
      String name = service.trim(service.stringValue(item.get("productName")));
      int qty = service.intValue(item.get("quantity"));
      String lineTotal = formatCurrency(item.get("lineTotal"));
      sb.append("<tr>");
      sb.append("<td style=\"font-size:13px;color:#111118;padding:8px 16px;\">").append(escapeHtml(name)).append("</td>");
      sb.append("<td style=\"font-size:13px;color:#374151;padding:8px 8px;text-align:center;\">").append(qty).append("</td>");
      sb.append("<td style=\"font-size:13px;color:#111118;font-weight:600;padding:8px 16px;text-align:right;\">").append(lineTotal).append("</td>");
      sb.append("</tr>");
    }
    return sb.toString();
  }

  private String buildDeliverySection(String deliveryMethod, Map<String, Object> order) {
    if ("delivery".equals(deliveryMethod)) {
      String street = service.trim(service.stringValue(order.get("deliveryStreet")));
      String number = service.trim(service.stringValue(order.get("deliveryNumber")));
      String complement = service.trim(service.stringValue(order.get("deliveryComplement")));
      String district = service.trim(service.stringValue(order.get("deliveryDistrict")));
      String city = service.trim(service.stringValue(order.get("deliveryCity")));
      String state = service.trim(service.stringValue(order.get("deliveryState")));
      String cep = service.trim(service.stringValue(order.get("deliveryCep")));
      int eta = service.intValue(order.get("etaDays"));
      String addressLine = street + (number.isBlank() ? "" : ", " + number) + (complement.isBlank() ? "" : " – " + complement);
      String cityLine = (district.isBlank() ? "" : district + " · ") + city + "/" + state + (cep.isBlank() ? "" : " · CEP " + cep);
      return """
          <table width="100%%" cellpadding="8" cellspacing="0" style="margin-bottom:16px;border:1px solid #bbf7d0;border-radius:6px;background:#f0fdf4;">
            <tr><td style="font-size:12px;color:#16a34a;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:10px 16px;" colspan="2">Entrega</td></tr>
            <tr><td style="font-size:13px;color:#374151;padding:6px 16px;">Endereço</td><td style="font-size:13px;color:#111118;padding:6px 16px;">%s<br><span style="color:#6b7280;">%s</span></td></tr>
            <tr style="background:#dcfce7;"><td style="font-size:13px;color:#374151;padding:6px 16px;">Prazo estimado</td><td style="font-size:13px;color:#16a34a;font-weight:600;padding:6px 16px;">%s</td></tr>
          </table>
          """.formatted(escapeHtml(addressLine), escapeHtml(cityLine),
          eta > 0 ? eta + " dia" + (eta == 1 ? " útil" : "s úteis") : "A confirmar");
    }
    // pickup
    return """
        <table width="100%%" cellpadding="8" cellspacing="0" style="margin-bottom:16px;border:1px solid #fde68a;border-radius:6px;background:#fffbeb;">
          <tr><td style="font-size:12px;color:#d97706;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:10px 16px;">Retirada na loja</td></tr>
          <tr><td style="font-size:13px;color:#374151;padding:8px 16px;">Av. das Torres, Cascavel – PR<br><span style="color:#6b7280;">Aguarde a confirmação de disponibilidade antes de retirar.</span></td></tr>
        </table>
        """;
  }

  private String buildPasswordOtpHtml(String userName, String otp, boolean isReset) {
    String displayName = userName == null || userName.isBlank() ? "cliente" : userName;
    String title   = isReset ? "Redefinição de senha" : "Alteração de senha";
    String context = isReset
        ? "Recebemos uma solicitação para redefinir a senha da sua conta."
        : "Recebemos uma solicitação para alterar a senha da sua conta.";
    String ignore  = isReset
        ? "Se você não solicitou a redefinição de senha, ignore este email — sua senha permanece a mesma."
        : "Se você não solicitou essa alteração, ignore este email — sua senha permanece a mesma.";
    // Render each digit as a big box for readability
    StringBuilder digitBoxes = new StringBuilder();
    for (char c : otp.toCharArray()) {
      digitBoxes.append(
          "<span style=\"display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;" +
          "font-size:28px;font-weight:700;color:#111118;background:#f9fafb;" +
          "border:2px solid #d4a843;border-radius:8px;margin:0 4px;\">")
          .append(c).append("</span>");
    }
    return """
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>%s</title></head>
        <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
        <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
          <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;">
              <tr><td style="background:#111118;padding:24px 32px;">
                <h1 style="margin:0;color:#d4a843;font-size:22px;font-weight:700;">Rodando Moto Center</h1>
                <p style="margin:6px 0 0;color:#9ca3af;font-size:13px;">Peças para motos – Cascavel / PR</p>
              </td></tr>
              <tr><td style="padding:32px;">
                <h2 style="margin:0 0 8px;color:#111118;font-size:18px;">%s</h2>
                <p style="margin:0 0 16px;color:#374151;font-size:14px;">Olá, <strong>%s</strong>!</p>
                <p style="margin:0 0 24px;color:#374151;font-size:14px;">%s</p>
                <p style="margin:0 0 12px;color:#374151;font-size:14px;font-weight:600;">Seu código de verificação:</p>
                <div style="text-align:center;margin-bottom:8px;">%s</div>
                <p style="margin:0 0 24px;text-align:center;color:#6b7280;font-size:12px;">
                  Válido por <strong>15 minutos</strong> · Máximo de 5 tentativas
                </p>
                <p style="margin:0;color:#9ca3af;font-size:12px;">%s</p>
              </td></tr>
              <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
                <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">Rodando Moto Center · Cascavel, PR · Este é um email automático.</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
        </body></html>
        """.formatted(title, title, escapeHtml(displayName), escapeHtml(context),
        digitBoxes.toString(), escapeHtml(ignore));
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private String formatCurrency(Object value) {
    try {
      BigDecimal amount = switch (value) {
        case BigDecimal bd -> bd;
        case Number n -> BigDecimal.valueOf(n.doubleValue()).setScale(2, RoundingMode.HALF_UP);
        case String s -> new BigDecimal(s.trim());
        case null -> BigDecimal.ZERO;
        default -> BigDecimal.ZERO;
      };
      return NumberFormat.getCurrencyInstance(PT_BR).format(amount);
    } catch (Exception ignored) {
      return "R$ 0,00";
    }
  }

  private String paymentLabel(String method) {
    return switch (method) {
      case "card_credit" -> "Cartão de crédito";
      case "card_debit" -> "Cartão de débito";
      case "pix" -> "Pix";
      default -> method.isBlank() ? "—" : method;
    };
  }

  private String escapeHtml(String s) {
    if (s == null) return "";
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
  }
}
