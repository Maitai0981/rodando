package com.rodando.backend.auth;

import com.rodando.backend.auth.SessionEntity;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionRepository extends JpaRepository<SessionEntity, Long> {

  @EntityGraph(attributePaths = {"user", "user.roles"})
  Optional<SessionEntity> findByTokenHashAndExpiresAtAfter(String tokenHash, OffsetDateTime expiresAt);

  void deleteByTokenHash(String tokenHash);
}


