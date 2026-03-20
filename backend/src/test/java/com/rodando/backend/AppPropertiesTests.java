package com.rodando.backend;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import com.rodando.backend.config.AppProperties;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class AppPropertiesTests {

  @Test
  void prefersSpringDatasourceSettingsOverDatabaseUrl() {
    MockEnvironment environment = new MockEnvironment()
        .withProperty("DATABASE_URL", "postgres://legacy:legacy@127.0.0.1:5433/legacy")
        .withProperty("SPRING_DATASOURCE_URL", "jdbc:postgresql://127.0.0.1:5432/rodando")
        .withProperty("SPRING_DATASOURCE_USERNAME", "postgres")
        .withProperty("SPRING_DATASOURCE_PASSWORD", "S@R@");
    AppProperties properties = new AppProperties(environment);

    assertEquals("jdbc:postgresql://127.0.0.1:5432/rodando", properties.databaseUrl());
    assertEquals("postgres", properties.databaseUsername());
    assertEquals("S@R@", properties.databasePassword());
  }

  @Test
  void defaultsFlywayBaselineFlagsForCleanLocalBoot() {
    AppProperties properties = new AppProperties(new MockEnvironment());

    assertFalse(properties.flywayBaselineOnMigrate());
    assertEquals("0", properties.flywayBaselineVersion());
  }
}


