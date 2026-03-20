package com.rodando.backend.auth;

public record AuthContext(String token, AuthUser user, String guestToken, String guestTokenHash) {

  public static final String ATTRIBUTE = AuthContext.class.getName();

  public boolean authenticated() {
    return user != null && user.id() > 0;
  }

  public record AuthUser(
      long id,
      String name,
      String email,
      String role,
      String phone,
      String document,
      String cep,
      String addressStreet,
      String addressCity,
      String addressState,
      String createdAt) {
  }
}


