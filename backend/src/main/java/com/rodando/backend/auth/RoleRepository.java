package com.rodando.backend.auth;

import com.rodando.backend.auth.RoleEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<RoleEntity, Short> {

  Optional<RoleEntity> findByCode(String code);
}


