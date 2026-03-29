package com.rodando.backend.core;

/**
 * Armazena o IP e o User-Agent da requisição atual em ThreadLocal para que
 * RodandoService.saveOwnerAuditLog() os capture automaticamente sem alterar
 * assinaturas de todos os serviços. Populado pelo AuditContextInterceptor.
 */
public final class AuditContext {

  private static final ThreadLocal<String> IP         = new ThreadLocal<>();
  private static final ThreadLocal<String> USER_AGENT = new ThreadLocal<>();

  private AuditContext() {}

  public static void init(String ip, String userAgent) {
    IP.set(ip == null ? "" : ip.strip());
    USER_AGENT.set(userAgent == null ? "" : userAgent.strip());
  }

  public static String ip() {
    String v = IP.get();
    return v == null ? "" : v;
  }

  public static String userAgent() {
    String v = USER_AGENT.get();
    return v == null ? "" : v;
  }

  public static void clear() {
    IP.remove();
    USER_AGENT.remove();
  }
}
