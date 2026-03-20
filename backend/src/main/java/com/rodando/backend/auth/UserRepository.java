package com.rodando.backend.auth;

import com.rodando.backend.auth.UserEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<UserEntity, Long> {

  @EntityGraph(attributePaths = "roles")
  Optional<UserEntity> findByEmailIgnoreCase(String email);

  @EntityGraph(attributePaths = "roles")
  @Query("select u from UserEntity u where u.id = :id")
  Optional<UserEntity> findDetailedById(@Param("id") Long id);
}


