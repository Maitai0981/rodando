package com.rodando.backend.account;
import com.rodando.backend.auth.UserEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import java.time.OffsetDateTime;

@Entity
@Table(name = "user_addresses")
@Getter
@Setter
public class UserAddressEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private UserEntity user;

  @Column(nullable = false)
  private String label;

  @Column(nullable = false)
  private String cep;

  @Column(nullable = false)
  private String street;

  private String number;

  private String complement;

  private String district;

  @Column(nullable = false)
  private String city;

  @Column(nullable = false)
  private String state;

  @Column(name = "reference")
  private String reference;

  private Double lat;

  private Double lng;

  @Column(name = "is_default", nullable = false)
  private boolean isDefault;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;
}