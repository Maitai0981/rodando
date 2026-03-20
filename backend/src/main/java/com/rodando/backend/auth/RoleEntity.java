package com.rodando.backend.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "roles")
@Getter
@Setter
public class RoleEntity {

  @Id
  private Short id;

  @Column(nullable = false, unique = true)
  private String code;

  @Column(nullable = false)
  private String name;
}