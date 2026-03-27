package com.rodando.backend.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.time.OffsetDateTime;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetTokenEntity, Long> {

  @Query("""
      SELECT t FROM PasswordResetTokenEntity t
      WHERE t.user.id = ?1
        AND t.purpose = ?2
        AND t.usedAt IS NULL
        AND t.expiresAt > ?3
      ORDER BY t.createdAt DESC
      LIMIT 1
      """)
  Optional<PasswordResetTokenEntity> findActiveByUserIdAndPurpose(long userId, String purpose, OffsetDateTime now);

  @Modifying
  @Query("DELETE FROM PasswordResetTokenEntity t WHERE t.user.id = ?1 AND t.purpose = ?2")
  void deleteByUserIdAndPurpose(long userId, String purpose);

  @Modifying
  @Query("DELETE FROM PasswordResetTokenEntity t WHERE t.user.id = ?1")
  void deleteByUserId(long userId);
}
