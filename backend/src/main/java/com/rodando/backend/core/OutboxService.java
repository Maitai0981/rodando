package com.rodando.backend.core;

import com.rodando.backend.common.JsonSupport;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class OutboxService {

  private final RodandoService service;
  private final JsonSupport jsonSupport;
  private final EmailService emailService;
  private final AtomicBoolean running = new AtomicBoolean(false);
  private final AtomicLong processedJobs = new AtomicLong();
  private final AtomicLong failedJobs = new AtomicLong();
  private volatile String lastRunAt;
  private volatile String lastSuccessAt;
  private volatile String lastError;

  public OutboxService(RodandoService service, JsonSupport jsonSupport, EmailService emailService) {
    this.service = service;
    this.jsonSupport = jsonSupport;
    this.emailService = emailService;
  }

  @Scheduled(fixedDelayString = "${OUTBOX_POLL_INTERVAL_MS:5000}")
  public void tick() {
    if (!running.compareAndSet(false, true)) {
      return;
    }
    lastRunAt = service.nowIso();
    try {
      List<Map<String, Object>> jobs = service.many("""
          SELECT id, job_type AS "jobType", payload_json AS "payloadJson", attempts
          FROM outbox_jobs
          WHERE status IN ('pending', 'error')
            AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
          ORDER BY created_at ASC, id ASC
          LIMIT 10
          """);
      for (Map<String, Object> job : jobs) {
        processJob(job);
      }
      lastSuccessAt = service.nowIso();
      lastError = null;
    } catch (Exception exception) {
      lastError = exception.getMessage();
    } finally {
      running.set(false);
    }
  }

  public Map<String, Object> runtimeSnapshot(int pollIntervalMs) {
    Map<String, Object> queue = service.one("""
        SELECT
          COUNT(*) FILTER (WHERE status IN ('pending', 'error'))::int AS pending,
          COUNT(*) FILTER (WHERE status = 'processing')::int AS processing,
          COUNT(*) FILTER (WHERE status = 'dead_letter')::int AS "deadLetter"
        FROM outbox_jobs
        """).orElse(Map.of());
    return service.orderedMap(
        "enabled", true,
        "running", running.get(),
        "pollIntervalMs", pollIntervalMs,
        "processedJobs", processedJobs.get(),
        "failedJobs", failedJobs.get(),
        "lastRunAt", lastRunAt,
        "lastSuccessAt", lastSuccessAt,
        "lastError", lastError,
        "queue", service.orderedMap(
            "pending", service.intValue(queue.get("pending")),
            "processing", service.intValue(queue.get("processing")),
            "deadLetter", service.intValue(queue.get("deadLetter"))));
  }

  private void processJob(Map<String, Object> job) {
    long id = service.longValue(job.get("id"));
    int attempts = service.intValue(job.get("attempts"));
    service.run("UPDATE outbox_jobs SET status = 'processing', updated_at = NOW() WHERE id = ?", id);
    try {
      String jobType = service.stringValue(job.get("jobType"));
      Map<String, Object> payload = jsonSupport.readMap(job.get("payloadJson"));
      if ("customer_order_confirmation".equals(jobType)) {
        dispatchCustomerOrderConfirmation(payload);
      } else if ("owner_sale_notification".equals(jobType)) {
        dispatchOwnerSaleNotification(payload);
      }
      service.run("UPDATE outbox_jobs SET status = 'completed', updated_at = NOW() WHERE id = ?", id);
      processedJobs.incrementAndGet();
    } catch (Exception exception) {
      failedJobs.incrementAndGet();
      int nextAttempts = attempts + 1;
      String nextStatus = nextAttempts >= 5 ? "dead_letter" : "error";
      service.run("""
          UPDATE outbox_jobs
          SET status = ?, attempts = attempts + 1, last_error = ?, next_attempt_at = ?::timestamptz, updated_at = NOW()
          WHERE id = ?
          """,
          nextStatus,
          exception.getMessage(),
          nextStatus.equals("dead_letter") ? null : Instant.now().plusSeconds(Math.min(900, 15L * nextAttempts)).toString(),
          id);
      throw exception;
    }
  }

  private void dispatchCustomerOrderConfirmation(Map<String, Object> payload) {
    long orderId = service.longValue(payload.get("orderId"));
    emailService.sendCustomerOrderConfirmation(orderId);
    service.run("""
        INSERT INTO owner_notifications (order_id, channel, target, status, attempts, sent_at, created_at)
        VALUES (?, 'email', 'customer', 'sent', 1, NOW(), NOW())
        """, orderId);
  }

  private void dispatchOwnerSaleNotification(Map<String, Object> payload) {
    long orderId = service.longValue(payload.get("orderId"));
    emailService.sendOwnerSaleAlert(orderId);
    Map<String, Object> settings = service.one("""
        SELECT sales_alert_email AS "salesAlertEmail", sales_alert_whatsapp AS "salesAlertWhatsapp"
        FROM owner_settings
        ORDER BY updated_at DESC
        LIMIT 1
        """).orElse(Map.of());
    String email = service.trim(service.stringValue(settings.get("salesAlertEmail")));
    String whatsapp = service.trim(service.stringValue(settings.get("salesAlertWhatsapp")));
    if (!email.isBlank()) {
      service.run("""
          INSERT INTO owner_notifications (order_id, channel, target, status, attempts, sent_at, created_at)
          VALUES (?, 'email', ?, 'sent', 1, NOW(), NOW())
          """, orderId, email);
    }
    if (!whatsapp.isBlank()) {
      service.run("""
          INSERT INTO owner_notifications (order_id, channel, target, status, attempts, sent_at, created_at)
          VALUES (?, 'whatsapp', ?, 'sent', 1, NOW(), NOW())
          """, orderId, whatsapp);
    }
  }
}


