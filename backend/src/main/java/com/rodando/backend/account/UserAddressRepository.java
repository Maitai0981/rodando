package com.rodando.backend.account;

import com.rodando.backend.account.UserAddressEntity;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserAddressRepository extends JpaRepository<UserAddressEntity, Long> {

  List<UserAddressEntity> findByUserIdOrderByIsDefaultDescCreatedAtAscIdAsc(Long userId);

  Optional<UserAddressEntity> findByIdAndUserId(Long id, Long userId);

  long countByUserId(Long userId);

  Optional<UserAddressEntity> findFirstByUserIdAndIsDefaultTrue(Long userId);

  Optional<UserAddressEntity> findFirstByUserIdOrderByCreatedAtAsc(Long userId);

  @Modifying
  @Query("update UserAddressEntity ua set ua.isDefault = false, ua.updatedAt = :updatedAt where ua.user.id = :userId")
  int clearDefaultForUser(@Param("userId") Long userId, @Param("updatedAt") OffsetDateTime updatedAt);

  @Query(
      value = """
          SELECT COUNT(*)
          FROM orders
          WHERE address_id = :addressId
            AND status IN ('created', 'paid', 'shipped')
          """,
      nativeQuery = true)
  int countOpenOrdersUsingAddress(@Param("addressId") Long addressId);
}


