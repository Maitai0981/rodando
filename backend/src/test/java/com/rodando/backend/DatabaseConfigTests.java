package com.rodando.backend;

import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoMoreInteractions;

import com.rodando.backend.config.AppProperties;
import com.rodando.backend.config.DatabaseConfig;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.mock.env.MockEnvironment;

class DatabaseConfigTests {

  private final DatabaseConfig databaseConfig = new DatabaseConfig();

  @Test
  void migratesOnlyByDefault() {
    Flyway flyway = mock(Flyway.class);
    AppProperties properties = new AppProperties(new MockEnvironment());

    FlywayMigrationStrategy strategy = databaseConfig.flywayMigrationStrategy(properties);
    strategy.migrate(flyway);

    InOrder order = inOrder(flyway);
    order.verify(flyway).migrate();
    verifyNoMoreInteractions(flyway);
  }

  @Test
  void baselinesBeforeMigratingWhenEnabled() {
    Flyway flyway = mock(Flyway.class);
    AppProperties properties = new AppProperties(
        new MockEnvironment().withProperty("FLYWAY_BASELINE_ON_MIGRATE", "true"));

    FlywayMigrationStrategy strategy = databaseConfig.flywayMigrationStrategy(properties);
    strategy.migrate(flyway);

    InOrder order = inOrder(flyway);
    order.verify(flyway).baseline();
    order.verify(flyway).migrate();
    verifyNoMoreInteractions(flyway);
  }

  @Test
  void cleansBeforeBaselineAndMigrationWhenResetAndBaselineAreEnabled() {
    Flyway flyway = mock(Flyway.class);
    AppProperties properties = new AppProperties(new MockEnvironment()
        .withProperty("DB_RESET", "true")
        .withProperty("FLYWAY_BASELINE_ON_MIGRATE", "true"));

    FlywayMigrationStrategy strategy = databaseConfig.flywayMigrationStrategy(properties);
    strategy.migrate(flyway);

    InOrder order = inOrder(flyway);
    order.verify(flyway).clean();
    order.verify(flyway).baseline();
    order.verify(flyway).migrate();
    verifyNoMoreInteractions(flyway);
  }
}


