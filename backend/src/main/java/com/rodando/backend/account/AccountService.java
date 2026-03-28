package com.rodando.backend.account;
import com.rodando.backend.core.RodandoService;
import com.rodando.backend.core.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.rodando.backend.auth.AuthContext;
import com.rodando.backend.common.ApiException;
import com.rodando.backend.config.AppProperties;
import com.rodando.backend.auth.PasswordResetTokenEntity;
import com.rodando.backend.auth.PasswordResetTokenRepository;
import com.rodando.backend.auth.RoleEntity;
import com.rodando.backend.auth.SessionEntity;
import com.rodando.backend.account.UserAddressEntity;
import com.rodando.backend.auth.UserEntity;
import com.rodando.backend.auth.RoleRepository;
import com.rodando.backend.auth.SessionRepository;
import com.rodando.backend.account.UserAddressRepository;
import com.rodando.backend.auth.UserRepository;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.security.SecureRandom;
import java.util.UUID;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;

@Service
public class AccountService {

  private static final Logger log = LoggerFactory.getLogger(AccountService.class);

  private final UserRepository userRepository;
  private final RoleRepository roleRepository;
  private final UserAddressRepository userAddressRepository;
  private final SessionRepository sessionRepository;
  private final PasswordResetTokenRepository passwordResetTokenRepository;
  private final RodandoService service;
  private final AppProperties properties;
  private final WebClient webClient;
  private final EmailService emailService;

  public AccountService(
      UserRepository userRepository,
      RoleRepository roleRepository,
      UserAddressRepository userAddressRepository,
      SessionRepository sessionRepository,
      PasswordResetTokenRepository passwordResetTokenRepository,
      RodandoService service,
      AppProperties properties,
      WebClient webClient,
      EmailService emailService) {
    this.userRepository = userRepository;
    this.roleRepository = roleRepository;
    this.userAddressRepository = userAddressRepository;
    this.sessionRepository = sessionRepository;
    this.passwordResetTokenRepository = passwordResetTokenRepository;
    this.service = service;
    this.properties = properties;
    this.webClient = webClient;
    this.emailService = emailService;
  }

  public record SessionInfo(String token, OffsetDateTime expiresAt) {
  }

  @Transactional
  public SessionInfo createSession(long userId) {
    UserEntity user = userRepository.findById(userId)
        .orElseThrow(() -> new ApiException(404, "Usuario nao encontrado."));
    String token = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    OffsetDateTime expiresAt = now.plusSeconds(properties.sessionTtlMs() / 1000);

    SessionEntity session = new SessionEntity();
    session.setUser(user);
    session.setTokenHash(service.hashToken(token));
    session.setCreatedAt(now);
    session.setExpiresAt(expiresAt);
    sessionRepository.save(session);
    return new SessionInfo(token, expiresAt);
  }

  @Transactional
  public void deleteSessionByToken(String token) {
    if (!StringUtils.hasText(token)) {
      return;
    }
    sessionRepository.deleteByTokenHash(service.hashToken(token));
  }

  @Transactional(readOnly = true)
  public AuthContext.AuthUser findUserFromSessionToken(String token) {
    return sessionRepository
        .findByTokenHashAndExpiresAtAfter(service.hashToken(token), OffsetDateTime.now(ZoneOffset.UTC))
        .map(SessionEntity::getUser)
        .map(this::mapAuthUser)
        .orElse(null);
  }

  @Transactional(readOnly = true)
  public Map<String, Object> mePayload(AuthContext context) {
    if (context == null || !context.authenticated()) {
      return service.orderedMap("user", null);
    }
    UserEntity user = userRepository.findDetailedById(context.user().id())
        .orElseThrow(() -> new ApiException(500, "Falha ao carregar sessao."));
    List<Map<String, Object>> addresses = listUserAddresses(user.getId());
    return service.orderedMap("user", authUserPayload(user, addresses));
  }

  @Transactional
  public Map<String, Object> signUp(Map<String, Object> body, AuthContext context) {
    String name = service.trim(service.stringValue(body.get("name")));
    String email = service.normalize(service.stringValue(body.get("email")));
    String password = service.stringValue(body.get("password"));
    String cep = service.normalizeCep(body.get("cep"));
    String street = service.trim(service.stringValue(body.get("addressStreet")));
    String city = service.trim(service.stringValue(body.get("addressCity")));
    String state = service.trim(service.stringValue(body.get("addressState"))).toUpperCase(Locale.ROOT);

    if (name.length() < 2) {
      throw new ApiException(400, "Nome deve ter pelo menos 2 caracteres.");
    }
    if (!email.contains("@") || email.length() < 5) {
      throw new ApiException(400, "Email invalido.");
    }
    if (password.length() < 6) {
      throw new ApiException(400, "Senha deve ter pelo menos 6 caracteres.");
    }
    if (!service.isValidCep(cep)) {
      throw new ApiException(400, "CEP invalido. Informe 8 digitos.");
    }
    if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
      throw new ApiException(409, "Email ja cadastrado.");
    }

    Map<String, String> resolvedAddress = resolveAddressForSignup(cep, street, city, state);
    UserEntity user = createCustomerUser(name, email, password, cep, resolvedAddress);
    upsertUserAddress(
        user,
        null,
        Map.of(
            "label", "Principal",
            "cep", cep,
            "street", resolvedAddress.get("street"),
            "number", "",
            "complement", "",
            "district", "",
            "city", resolvedAddress.get("city"),
            "state", resolvedAddress.get("state"),
            "reference", "",
            "isDefault", true));
    service.mergeGuestBagToUser(context == null ? "" : context.guestTokenHash(), user.getId());
    List<Map<String, Object>> addresses = listUserAddresses(user.getId());
    return Map.of(
        "message", "Conta de cliente criada e autenticada.",
        "user", authUserPayload(user, addresses));
  }

  @Transactional
  public Map<String, Object> signIn(Map<String, Object> body, AuthContext context, boolean ownerOnly) {
    String email = service.normalize(service.stringValue(body.get("email")));
    String password = service.stringValue(body.get("password"));
    if (email.isBlank() || password.isBlank()) {
      throw new ApiException(400, "Informe email e senha.");
    }

    UserEntity user = userRepository.findByEmailIgnoreCase(email)
        .orElseThrow(() -> new ApiException(401, "Credenciais invalidas."));
    if (!service.verifyPassword(password, service.stringValue(user.getPasswordHash()))) {
      throw new ApiException(401, "Credenciais invalidas.");
    }

    String role = resolveRole(user);
    if (ownerOnly && !"owner".equals(role)) {
      throw new ApiException(403, "Acesso restrito ao owner.");
    }
    if (!ownerOnly && "owner".equals(role)) {
      throw new ApiException(403, "Conta owner deve usar /owner/login.");
    }

    service.mergeGuestBagToUser(context == null ? "" : context.guestTokenHash(), user.getId());
    List<Map<String, Object>> addresses = listUserAddresses(user.getId());
    return Map.of(
        "message", ownerOnly ? "Login owner realizado com sucesso." : "Login realizado com sucesso.",
        "user", authUserPayload(user, addresses));
  }

  @Transactional
  public Map<String, Object> updateProfile(long userId, Map<String, Object> body) {
    String name = service.trim(service.stringValue(body.get("name")));
    String phone = service.normalizePhone(body.get("phone"));
    String document = service.normalizeDocument(body.get("document"));
    if (name.length() < 2) {
      throw new ApiException(400, "Nome deve ter pelo menos 2 caracteres.");
    }
    if (!phone.isBlank() && phone.length() < 10) {
      throw new ApiException(400, "Telefone invalido.");
    }
    if (!document.isBlank() && !service.isValidDocument(document)) {
      throw new ApiException(400, "CPF/CNPJ invalido.");
    }

    UserEntity user = userRepository.findDetailedById(userId)
        .orElseThrow(() -> new ApiException(404, "Usuario nao encontrado."));
    user.setName(name);
    user.setPhone(blankToNull(phone));
    user.setDocument(blankToNull(document));
    user.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
    userRepository.save(user);

    List<Map<String, Object>> addresses = listUserAddresses(userId);
    return Map.of("user", authUserPayload(user, addresses));
  }

  @Transactional
  public Map<String, Object> changePassword(long userId, Map<String, Object> body) {
    String current = service.trim(service.stringValue(body.get("currentPassword")));
    String next = service.trim(service.stringValue(body.get("newPassword")));
    if (current.isBlank() || next.isBlank()) {
      throw new ApiException(400, "Preencha a senha atual e a nova senha.");
    }
    if (next.length() < 6) {
      throw new ApiException(400, "A nova senha deve ter pelo menos 6 caracteres.");
    }
    UserEntity user = userRepository.findDetailedById(userId)
        .orElseThrow(() -> new ApiException(404, "Usuario nao encontrado."));
    if (!service.verifyPassword(current, service.stringValue(user.getPasswordHash()))) {
      throw new ApiException(400, "Senha atual incorreta.");
    }
    user.setPasswordHash(service.hashPassword(next));
    user.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
    userRepository.save(user);
    return service.orderedMap("ok", true);
  }

  // ── Password reset / change via OTP ──────────────────────────────────────

  private static final long   OTP_TTL_MINUTES    = 15;
  private static final int    OTP_MAX_ATTEMPTS   = 5;
  private static final SecureRandom SECURE_RANDOM = new SecureRandom();

  private static final String RESET_REQUEST_OK =
      "Se esse email estiver cadastrado, voce recebera um codigo de verificacao em breve.";

  private String generateOtp() {
    return String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
  }

  // ── Forgot-password: step 1 – send OTP ───────────────────────────────────

  @Transactional
  public Map<String, Object> requestPasswordReset(Map<String, Object> body) {
    String email = service.normalize(service.stringValue(body.get("email")));
    if (!email.contains("@") || email.length() < 5) {
      return service.orderedMap("message", RESET_REQUEST_OK);
    }
    String[] devCodeHolder = { null };
    userRepository.findByEmailIgnoreCase(email).ifPresent(user -> {
      passwordResetTokenRepository.deleteByUserIdAndPurpose(user.getId(), "reset");

      String otp = generateOtp();
      OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

      PasswordResetTokenEntity token = new PasswordResetTokenEntity();
      token.setUser(user);
      token.setPurpose("reset");
      token.setTokenHash(service.hashToken(otp));
      token.setAttempts(0);
      token.setExpiresAt(now.plusMinutes(OTP_TTL_MINUTES));
      token.setCreatedAt(now);
      passwordResetTokenRepository.save(token);

      try {
        devCodeHolder[0] = emailService.sendPasswordOtpEmail(user.getName(), user.getEmail(), otp, "reset");
      } catch (Exception emailEx) {
        log.error("[PASSWORD_RESET] Falha ao enviar email de OTP para {}. Token salvo. Erro: {}", user.getEmail(), emailEx.getMessage());
      }
    });
    if (devCodeHolder[0] != null) {
      return service.orderedMap("message", RESET_REQUEST_OK, "devCode", devCodeHolder[0]);
    }
    return service.orderedMap("message", RESET_REQUEST_OK);
  }

  // ── Forgot-password: step 2 – validate OTP + set new password ────────────

  @Transactional
  public Map<String, Object> confirmPasswordReset(Map<String, Object> body) {
    String email       = service.normalize(service.stringValue(body.get("email")));
    String otp         = service.trim(service.stringValue(body.get("code")));
    String newPassword = service.trim(service.stringValue(body.get("password")));

    if (!email.contains("@") || otp.length() != 6 || newPassword.length() < 6) {
      throw new ApiException(400, "Dados invalidos.");
    }

    UserEntity user = userRepository.findByEmailIgnoreCase(email)
        .orElseThrow(() -> new ApiException(400, "Codigo invalido ou expirado."));

    applyOtpAndChangePassword(user, otp, newPassword, "reset");
    sessionRepository.deleteAllByUserId(user.getId());
    return service.orderedMap("message", "Senha redefinida com sucesso. Faca login com a nova senha.");
  }

  // ── Change-password (logged-in): step 1 – send OTP ───────────────────────

  @Transactional
  public Map<String, Object> requestPasswordChangeCode(long userId) {
    UserEntity user = userRepository.findDetailedById(userId)
        .orElseThrow(() -> new ApiException(404, "Usuario nao encontrado."));
    if (!StringUtils.hasText(user.getEmail())) {
      throw new ApiException(500, "Email do usuario nao configurado.");
    }

    passwordResetTokenRepository.deleteByUserIdAndPurpose(userId, "change");

    String otp = generateOtp();
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

    PasswordResetTokenEntity token = new PasswordResetTokenEntity();
    token.setUser(user);
    token.setPurpose("change");
    token.setTokenHash(service.hashToken(otp));
    token.setAttempts(0);
    token.setExpiresAt(now.plusMinutes(OTP_TTL_MINUTES));
    token.setCreatedAt(now);
    passwordResetTokenRepository.save(token);

    String devCode = emailService.sendPasswordOtpEmail(user.getName(), user.getEmail(), otp, "change");
    if (devCode != null) {
      return service.orderedMap("message", "Codigo de verificacao enviado para o seu email.", "devCode", devCode);
    }
    return service.orderedMap("message", "Codigo de verificacao enviado para o seu email.");
  }

  // ── Change-email (logged-in): step 1 – send OTP to the new email address

  @Transactional
  public Map<String, Object> requestEmailChangeCode(long userId, Map<String, Object> body) {
    String newEmail = service.normalize(service.stringValue(body.get("email")));
    if (!newEmail.contains("@") || newEmail.length() < 5) {
      throw new ApiException(400, "Email invalido.");
    }

    UserEntity user = userRepository.findDetailedById(userId)
        .orElseThrow(() -> new ApiException(404, "Usuario nao encontrado."));

    if (newEmail.equalsIgnoreCase(user.getEmail())) {
      throw new ApiException(400, "O novo email deve ser diferente do atual.");
    }
    if (userRepository.findByEmailIgnoreCase(newEmail).isPresent()) {
      throw new ApiException(409, "Esse email ja esta em uso por outra conta.");
    }

    passwordResetTokenRepository.deleteByUserIdAndPurpose(userId, "email-change");

    String otp = generateOtp();
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

    PasswordResetTokenEntity token = new PasswordResetTokenEntity();
    token.setUser(user);
    token.setPurpose("email-change");
    token.setTokenHash(service.hashToken(otp + "|" + newEmail));
    token.setAttempts(0);
    token.setExpiresAt(now.plusMinutes(OTP_TTL_MINUTES));
    token.setCreatedAt(now);
    passwordResetTokenRepository.save(token);

    String devCode = emailService.sendPasswordOtpEmail(user.getName(), newEmail, otp, "email-change");
    if (devCode != null) {
      return service.orderedMap("message", "Codigo de verificacao enviado para " + newEmail + ".", "devCode", devCode);
    }
    return service.orderedMap("message", "Codigo de verificacao enviado para " + newEmail + ".");
  }

  // ── Change-email (logged-in): step 2 – validate OTP + apply new email

  @Transactional
  public Map<String, Object> confirmEmailChange(long userId, Map<String, Object> body) {
    String otp      = service.trim(service.stringValue(body.get("code")));
    String newEmail = service.normalize(service.stringValue(body.get("email")));

    if (otp.length() != 6) throw new ApiException(400, "Codigo invalido. Informe os 6 digitos.");
    if (!newEmail.contains("@") || newEmail.length() < 5) throw new ApiException(400, "Email invalido.");

    UserEntity user = userRepository.findDetailedById(userId)
        .orElseThrow(() -> new ApiException(404, "Usuario nao encontrado."));

    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    PasswordResetTokenEntity token = passwordResetTokenRepository
        .findActiveByUserIdAndPurpose(userId, "email-change", now)
        .orElseThrow(() -> new ApiException(400, "Codigo expirado ou ja utilizado. Solicite um novo."));

    token.setAttempts(token.getAttempts() + 1);

    if (!service.hashToken(otp + "|" + newEmail).equals(token.getTokenHash())) {
      if (token.getAttempts() >= OTP_MAX_ATTEMPTS) {
        token.setUsedAt(now);
        passwordResetTokenRepository.save(token);
        throw new ApiException(400, "Muitas tentativas incorretas. Solicite um novo codigo.");
      }
      passwordResetTokenRepository.save(token);
      int remaining = OTP_MAX_ATTEMPTS - token.getAttempts();
      throw new ApiException(400, "Codigo invalido. " + remaining + " tentativa(s) restante(s).");
    }

    if (userRepository.findByEmailIgnoreCase(newEmail).filter(u -> !u.getId().equals(userId)).isPresent()) {
      throw new ApiException(409, "Esse email ja esta em uso por outra conta.");
    }

    token.setUsedAt(now);
    passwordResetTokenRepository.save(token);

    user.setEmail(newEmail);
    user.setUpdatedAt(now);
    userRepository.save(user);

    List<Map<String, Object>> addresses = listUserAddresses(userId);
    return service.orderedMap("message", "Email alterado com sucesso.", "user", authUserPayload(user, addresses));
  }

  // ── Change-password (logged-in): step 2 – validate OTP + set new password

  @Transactional
  public Map<String, Object> confirmPasswordChange(long userId, Map<String, Object> body) {
    String otp         = service.trim(service.stringValue(body.get("code")));
    String newPassword = service.trim(service.stringValue(body.get("password")));

    if (otp.length() != 6) {
      throw new ApiException(400, "Codigo invalido. Informe os 6 digitos.");
    }
    if (newPassword.length() < 6) {
      throw new ApiException(400, "Senha deve ter pelo menos 6 caracteres.");
    }

    UserEntity user = userRepository.findDetailedById(userId)
        .orElseThrow(() -> new ApiException(404, "Usuario nao encontrado."));

    applyOtpAndChangePassword(user, otp, newPassword, "change");
    return service.orderedMap("message", "Senha alterada com sucesso.");
  }

  // ── shared OTP validation ─────────────────────────────────────────────────

  private void applyOtpAndChangePassword(UserEntity user, String otp, String newPassword, String purpose) {
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

    PasswordResetTokenEntity token = passwordResetTokenRepository
        .findActiveByUserIdAndPurpose(user.getId(), purpose, now)
        .orElseThrow(() -> new ApiException(400, "Codigo expirado ou ja utilizado. Solicite um novo."));

    token.setAttempts(token.getAttempts() + 1);

    if (!service.hashToken(otp).equals(token.getTokenHash())) {
      if (token.getAttempts() >= OTP_MAX_ATTEMPTS) {
        token.setUsedAt(now);
        passwordResetTokenRepository.save(token);
        throw new ApiException(400, "Muitas tentativas incorretas. Solicite um novo codigo.");
      }
      passwordResetTokenRepository.save(token);
      int remaining = OTP_MAX_ATTEMPTS - token.getAttempts();
      throw new ApiException(400, "Codigo invalido. " + remaining + " tentativa(s) restante(s).");
    }

    token.setUsedAt(now);
    passwordResetTokenRepository.save(token);

    user.setPasswordHash(service.hashPassword(newPassword));
    user.setUpdatedAt(now);
    userRepository.save(user);
  }

  private static final Set<String> AVATAR_MIME_TYPES = Set.of("image/jpeg", "image/png", "image/webp", "image/gif", "image/avif");

  @Transactional
  public Map<String, Object> uploadAvatar(long userId, MultipartFile image, String publicBaseUrl) {
    if (image == null || image.isEmpty()) {
      throw new ApiException(400, "Nenhuma imagem enviada.");
    }
    String mimeType = service.trim(image.getContentType()).toLowerCase(Locale.ROOT);
    if (!AVATAR_MIME_TYPES.contains(mimeType)) {
      throw new ApiException(400, "Arquivo invalido. Envie JPG, PNG, WebP, GIF ou AVIF.");
    }
    if (image.getSize() > properties.uploadMaxBytes()) {
      throw new ApiException(400, "Imagem excede o limite de tamanho permitido.");
    }
    String ext = mimeType.equals("image/jpeg") ? ".jpg" : mimeType.equals("image/png") ? ".png"
        : mimeType.equals("image/webp") ? ".webp" : mimeType.equals("image/gif") ? ".gif" : ".avif";
    String fileName = "avatar-" + userId + "-" + System.currentTimeMillis() + ext;
    Path uploadPath = Path.of("uploads", "avatars", fileName);
    try (InputStream input = image.getInputStream()) {
      Files.createDirectories(uploadPath.getParent());
      Files.copy(input, uploadPath, StandardCopyOption.REPLACE_EXISTING);
    } catch (Exception exception) {
      throw new ApiException(500, "Falha ao enviar imagem.");
    }
    String avatarUrl = publicBaseUrl.replaceAll("/+$", "") + "/uploads/avatars/" + fileName;
    UserEntity user = userRepository.findDetailedById(userId)
        .orElseThrow(() -> new ApiException(404, "Usuario nao encontrado."));
    user.setAvatarUrl(avatarUrl);
    user.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
    userRepository.save(user);
    List<Map<String, Object>> addresses = listUserAddresses(userId);
    return Map.of("user", authUserPayload(user, addresses));
  }

  @Transactional(readOnly = true)
  public List<Map<String, Object>> listUserAddresses(long userId) {
    return userAddressRepository.findByUserIdOrderByIsDefaultDescCreatedAtAscIdAsc(userId)
        .stream()
        .map(this::mapUserAddressRow)
        .toList();
  }

  @Transactional
  public Map<String, Object> createAddress(long userId, Map<String, Object> body) {
    UserEntity user = userRepository.findDetailedById(userId)
        .orElseThrow(() -> new ApiException(404, "Usuario nao encontrado."));
    return upsertUserAddress(user, null, body);
  }

  @Transactional
  public Map<String, Object> updateAddress(long userId, long id, Map<String, Object> body) {
    UserEntity user = userRepository.findDetailedById(userId)
        .orElseThrow(() -> new ApiException(404, "Usuario nao encontrado."));
    if (userAddressRepository.findByIdAndUserId(id, userId).isEmpty()) {
      throw new ApiException(404, "Endereco nao encontrado.");
    }
    return upsertUserAddress(user, id, body);
  }

  @Transactional
  public Map<String, Object> setDefaultAddress(long userId, long id) {
    UserEntity user = userRepository.findDetailedById(userId)
        .orElseThrow(() -> new ApiException(404, "Usuario nao encontrado."));
    UserAddressEntity address = userAddressRepository.findByIdAndUserId(id, userId)
        .orElseThrow(() -> new ApiException(404, "Endereco nao encontrado."));
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

    userAddressRepository.clearDefaultForUser(userId, now);
    address.setDefault(true);
    address.setUpdatedAt(now);
    userAddressRepository.save(address);
    syncLegacyUserAddressFromDefault(user);

    List<Map<String, Object>> items = listUserAddresses(userId);
    return Map.of("items", items, "defaultAddressId", id);
  }

  @Transactional
  public void deleteAddress(long userId, long id) {
    UserEntity user = userRepository.findDetailedById(userId)
        .orElseThrow(() -> new ApiException(404, "Usuario nao encontrado."));
    UserAddressEntity address = userAddressRepository.findByIdAndUserId(id, userId)
        .orElseThrow(() -> new ApiException(404, "Endereco nao encontrado."));

    if (userAddressRepository.countOpenOrdersUsingAddress(id) > 0) {
      throw new ApiException(409, "Endereco vinculado a pedido em andamento.");
    }

    boolean wasDefault = address.isDefault();
    userAddressRepository.delete(address);

    if (wasDefault) {
      userAddressRepository.findFirstByUserIdOrderByCreatedAtAsc(userId).ifPresent(next -> {
        next.setDefault(true);
        next.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        userAddressRepository.save(next);
      });
      syncLegacyUserAddressFromDefault(user);
    }
  }

  private UserEntity createCustomerUser(
      String name,
      String email,
      String password,
      String cep,
      Map<String, String> resolvedAddress) {
    RoleEntity customerRole = roleRepository.findByCode("customer")
        .orElseThrow(() -> new ApiException(500, "Role nao encontrada."));
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

    UserEntity user = new UserEntity();
    user.setName(name);
    user.setEmail(email);
    user.setPasswordHash(service.hashPassword(password));
    user.setCep(blankToNull(cep));
    user.setAddressStreet(blankToNull(resolvedAddress.get("street")));
    user.setAddressCity(blankToNull(resolvedAddress.get("city")));
    user.setAddressState(blankToNull(resolvedAddress.get("state")));
    user.setCreatedAt(now);
    user.setUpdatedAt(now);
    user.getRoles().add(customerRole);
    return userRepository.save(user);
  }

  private Map<String, String> resolveAddressForSignup(String cep, String street, String city, String state) {
    if (!street.isBlank() && !city.isBlank() && state.matches("^[A-Z]{2}$")) {
      return Map.of("street", street, "city", city, "state", state);
    }
    try {
      Map<String, Object> payload = webClient.get()
          .uri("https://viacep.com.br/ws/{cep}/json/", cep)
          .retrieve()
          .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
          .timeout(Duration.ofSeconds(5))
          .block();
      if (payload == null || service.booleanValue(payload.get("erro"))) {
        throw new ApiException(400, "CEP nao encontrado.");
      }
      String resolvedCity = service.trim(service.stringValue(payload.get("localidade")));
      String resolvedState = service.trim(service.stringValue(payload.get("uf"))).toUpperCase(Locale.ROOT);
      if (resolvedCity.isBlank() || !resolvedState.matches("^[A-Z]{2}$")) {
        throw new ApiException(503, "Servico de CEP indisponivel. Informe logradouro, cidade e UF para continuar.");
      }
      return Map.of(
          "street", service.trim(service.stringValue(payload.get("logradouro"))),
          "city", resolvedCity,
          "state", resolvedState);
    } catch (ApiException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new ApiException(503, "Servico de CEP indisponivel. Informe logradouro, cidade e UF para continuar.");
    }
  }

  private Map<String, Object> upsertUserAddress(UserEntity user, Long id, Map<String, Object> body) {
    String label = service.trim(service.stringValue(body.getOrDefault("label", "Endereco")));
    String cep = service.normalizeCep(body.get("cep"));
    String street = service.trim(service.stringValue(body.get("street")));
    String number = service.trim(service.stringValue(body.get("number")));
    String complement = service.trim(service.stringValue(body.get("complement")));
    String district = service.trim(service.stringValue(body.get("district")));
    String city = service.trim(service.stringValue(body.get("city")));
    String state = service.trim(service.stringValue(body.get("state"))).toUpperCase(Locale.ROOT);
    String reference = service.trim(service.stringValue(body.get("reference")));
    boolean isDefault = body.get("isDefault") == null || service.booleanValue(body.get("isDefault"));
    Double lat = service.parseOptionalDouble(body.get("lat"));
    Double lng = service.parseOptionalDouble(body.get("lng"));

    if (!service.isValidCep(cep)) {
      throw new ApiException(400, "CEP invalido. Informe 8 digitos.");
    }
    if (street.length() < 3) {
      throw new ApiException(400, "Logradouro invalido.");
    }
    if (city.length() < 2) {
      throw new ApiException(400, "Cidade invalida.");
    }
    if (!state.matches("^[A-Z]{2}$")) {
      throw new ApiException(400, "UF invalida.");
    }

    long count = userAddressRepository.countByUserId(user.getId());
    if ((id == null || id <= 0) && count >= 10) {
      throw new ApiException(400, "Limite de 10 enderecos de entrega atingido.");
    }

    boolean shouldBeDefault = isDefault || count == 0;
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    if (shouldBeDefault) {
      userAddressRepository.clearDefaultForUser(user.getId(), now);
    }

    UserAddressEntity address = id != null && id > 0
        ? userAddressRepository.findByIdAndUserId(id, user.getId())
            .orElseThrow(() -> new ApiException(404, "Endereco nao encontrado."))
        : new UserAddressEntity();

    address.setUser(user);
    address.setLabel(label);
    address.setCep(cep);
    address.setStreet(street);
    address.setNumber(blankToNull(number));
    address.setComplement(blankToNull(complement));
    address.setDistrict(blankToNull(district));
    address.setCity(city);
    address.setState(state);
    address.setReference(blankToNull(reference));
    address.setLat(lat);
    address.setLng(lng);
    address.setDefault(shouldBeDefault);
    if (address.getCreatedAt() == null) {
      address.setCreatedAt(now);
    }
    address.setUpdatedAt(now);
    UserAddressEntity saved = userAddressRepository.save(address);
    syncLegacyUserAddressFromDefault(user);
    return mapUserAddressRow(saved);
  }

  private void syncLegacyUserAddressFromDefault(UserEntity user) {
    userAddressRepository.findFirstByUserIdAndIsDefaultTrue(user.getId()).ifPresentOrElse(defaultAddress -> {
      user.setCep(blankToNull(defaultAddress.getCep()));
      user.setAddressStreet(blankToNull(defaultAddress.getStreet()));
      user.setAddressCity(blankToNull(defaultAddress.getCity()));
      user.setAddressState(blankToNull(defaultAddress.getState()));
      user.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
      userRepository.save(user);
    }, () -> {
      user.setCep(null);
      user.setAddressStreet(null);
      user.setAddressCity(null);
      user.setAddressState(null);
      user.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
      userRepository.save(user);
    });
  }

  private Map<String, Object> authUserPayload(UserEntity user, List<Map<String, Object>> addresses) {
    Long defaultAddressId = addresses.stream()
        .filter(item -> service.booleanValue(item.get("isDefault")))
        .map(item -> service.longValue(item.get("id")))
        .findFirst()
        .orElse(null);

    return service.orderedMap(
        "id", user.getId(),
        "name", user.getName(),
        "email", user.getEmail(),
        "role", resolveRole(user),
        "phone", blankToNull(user.getPhone()),
        "document", blankToNull(user.getDocument()),
        "cep", blankToNull(user.getCep()),
        "addressStreet", blankToNull(user.getAddressStreet()),
        "addressCity", blankToNull(user.getAddressCity()),
        "addressState", blankToNull(user.getAddressState()),
        "avatarUrl", blankToNull(user.getAvatarUrl()),
        "createdAt", user.getCreatedAt() == null ? null : user.getCreatedAt().toString(),
        "addresses", addresses,
        "defaultAddressId", defaultAddressId);
  }

  private AuthContext.AuthUser mapAuthUser(UserEntity user) {
    return new AuthContext.AuthUser(
        user.getId(),
        user.getName(),
        user.getEmail(),
        resolveRole(user),
        blankToNull(user.getPhone()),
        blankToNull(user.getDocument()),
        blankToNull(user.getCep()),
        blankToNull(user.getAddressStreet()),
        blankToNull(user.getAddressCity()),
        blankToNull(user.getAddressState()),
        user.getCreatedAt() == null ? "" : user.getCreatedAt().toString());
  }

  private Map<String, Object> mapUserAddressRow(UserAddressEntity address) {
    return service.orderedMap(
        "id", address.getId(),
        "userId", address.getUser().getId(),
        "label", service.stringValue(address.getLabel()),
        "cep", service.stringValue(address.getCep()),
        "street", service.stringValue(address.getStreet()),
        "number", service.stringValue(address.getNumber()),
        "complement", service.stringValue(address.getComplement()),
        "district", service.stringValue(address.getDistrict()),
        "city", service.stringValue(address.getCity()),
        "state", service.stringValue(address.getState()),
        "reference", service.stringValue(address.getReference()),
        "lat", address.getLat(),
        "lng", address.getLng(),
        "isDefault", address.isDefault(),
        "createdAt", address.getCreatedAt() == null ? null : address.getCreatedAt().toString(),
        "updatedAt", address.getUpdatedAt() == null ? null : address.getUpdatedAt().toString());
  }

  private String resolveRole(UserEntity user) {
    return user.getRoles().stream()
        .map(RoleEntity::getCode)
        .map(service::normalize)
        .filter(StringUtils::hasText)
        .min(Comparator.comparingInt((String role) -> "owner".equals(role) ? 0 : 1).thenComparing(role -> role))
        .orElse("customer");
  }

  private String blankToNull(String value) {
    return service.blankToNull(value);
  }
}
