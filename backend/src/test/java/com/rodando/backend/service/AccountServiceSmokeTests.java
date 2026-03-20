package com.rodando.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rodando.backend.account.AccountService;
import com.rodando.backend.auth.AuthContext;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class AccountServiceSmokeTests {

  @Autowired
  private AccountService accountService;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @AfterEach
  void cleanup() {
    jdbcTemplate.update("DELETE FROM users WHERE email LIKE 'account-service-test-%@example.com'");
  }

  @SuppressWarnings("unchecked")
  @Test
  void signUpAndManageAddressesUsingJpaAccountLayer() {
    String email = "account-service-test-" + UUID.randomUUID() + "@example.com";
    Map<String, Object> signup = accountService.signUp(
        Map.of(
            "name", "Cliente Teste",
            "email", email,
            "password", "123456",
            "cep", "01311000",
            "addressStreet", "Avenida Paulista",
            "addressCity", "Sao Paulo",
            "addressState", "SP"),
        new AuthContext(null, null, "guest-token", "guest-token-hash"));

    Map<String, Object> user = (Map<String, Object>) signup.get("user");
    List<Map<String, Object>> addresses = (List<Map<String, Object>>) user.get("addresses");

    assertEquals("Cliente Teste", user.get("name"));
    assertEquals(email, user.get("email"));
    assertEquals("customer", user.get("role"));
    assertEquals(1, addresses.size());
    assertNotNull(user.get("defaultAddressId"));

    long userId = ((Number) user.get("id")).longValue();
    AccountService.SessionInfo session = accountService.createSession(userId);
    AuthContext.AuthUser sessionUser = accountService.findUserFromSessionToken(session.token());
    assertNotNull(sessionUser);
    assertEquals(userId, sessionUser.id());

    Map<String, Object> createdAddress = accountService.createAddress(
        userId,
        Map.of(
            "label", "Trabalho",
            "cep", "01311000",
            "street", "Rua Secundaria",
            "city", "Sao Paulo",
            "state", "SP",
            "isDefault", false));

    assertEquals("Trabalho", createdAddress.get("label"));

    long addressId = ((Number) createdAddress.get("id")).longValue();
    Map<String, Object> defaultChanged = accountService.setDefaultAddress(userId, addressId);
    assertEquals(addressId, ((Number) defaultChanged.get("defaultAddressId")).longValue());

    Map<String, Object> signin = accountService.signIn(
        Map.of("email", email, "password", "123456"),
        new AuthContext(null, null, "", ""),
        false);
    Map<String, Object> signedUser = (Map<String, Object>) signin.get("user");

    assertTrue(((List<Map<String, Object>>) signedUser.get("addresses")).size() >= 2);
    assertEquals(addressId, ((Number) signedUser.get("defaultAddressId")).longValue());
  }
}


