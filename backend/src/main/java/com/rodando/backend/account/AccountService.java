package com.rodando.backend.account;
import com.rodando.backend.core.RodandoService;

import com.rodando.backend.auth.AuthContext;
import com.rodando.backend.common.ApiException;
import com.rodando.backend.config.AppProperties;
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
import java.util.UUID;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;

@Service
public class AccountService {

  private final UserRepository userRepository;
  private final RoleRepository roleRepository;
  private final UserAddressRepository userAddressRepository;
  private final SessionRepository sessionRepository;
  private final RodandoService service;
  private final AppProperties properties;
  private final WebClient webClient;

  public AccountService(
      UserRepository userRepository,
      RoleRepository roleRepository,
      UserAddressRepository userAddressRepository,
      SessionRepository sessionRepository,
      RodandoService service,
      AppProperties properties,
      WebClient webClient) {
    this.userRepository = userRepository;
    this.roleRepository = roleRepository;
    this.userAddressRepository = userAddressRepository;
    this.sessionRepository = sessionRepository;
    this.service = service;
    this.properties = properties;
    this.webClient = webClient;
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


