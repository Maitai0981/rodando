package com.rodando.backend.config;

import com.rodando.backend.core.RodandoService;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Objects;
import javax.sql.DataSource;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class DatabaseConfig {

  @Bean
  public DataSource dataSource(AppProperties properties) {
    ParsedJdbcUrl parsed = ParsedJdbcUrl.from(properties);
    HikariConfig config = new HikariConfig();
    config.setJdbcUrl(parsed.jdbcUrl());
    config.setUsername(parsed.username());
    config.setPassword(parsed.password());
    config.setMaximumPoolSize(12);
    config.setIdleTimeout(30_000);
    config.setConnectionTimeout(5_000);
    config.setPoolName("rodando-pool");
    config.addDataSourceProperty("reWriteBatchedInserts", "true");
    return new HikariDataSource(config);
  }

  @Bean
  public FlywayMigrationStrategy flywayMigrationStrategy(AppProperties properties) {
    return flyway -> {
      if (properties.dbReset()) {
        flyway.clean();
      }
      if (properties.flywayBaselineOnMigrate()) {
        flyway.baseline();
      }
      flyway.migrate();
    };
  }

  @Bean
  public TransactionTemplate transactionTemplate(PlatformTransactionManager manager) {
    return new TransactionTemplate(Objects.requireNonNull(manager));
  }

  @Bean
  public WebClient webClient() {
    return WebClient.builder().build();
  }

  @Bean
  public ApplicationRunner validationRunner(EnvironmentValidator validator, AppProperties properties) {
    return ignored -> {
      EnvironmentValidator.ValidationResult result = validator.validate(properties);
      if (!result.ok()) {
        throw new IllegalStateException(
            "Falha de validacao de ambiente (" + result.appEnv() + "): " + String.join(" | ", result.issues()));
      }
    };
  }

  @Bean
  public ApplicationRunner bootstrapRunner(RodandoService service) {
    return ignored -> service.bootstrap();
  }

  private record ParsedJdbcUrl(String jdbcUrl, String username, String password) {
    static ParsedJdbcUrl from(AppProperties properties) {
      String value = properties.databaseUrl();
      String explicitUsername = properties.databaseUsername();
      String explicitPassword = properties.databasePassword();
      if (value.startsWith("jdbc:")) {
        String username = explicitUsername.isBlank() ? "postgres" : explicitUsername;
        String password = explicitPassword.isBlank() ? "postgres" : explicitPassword;
        return new ParsedJdbcUrl(value, username, password);
      }
      URI uri = URI.create(value);
      String[] userInfo = (uri.getUserInfo() == null ? "postgres:postgres" : uri.getUserInfo()).split(":", 2);
      String parsedUsername = userInfo.length > 0 ? decode(userInfo[0]) : "postgres";
      String parsedPassword = userInfo.length > 1 ? decode(userInfo[1]) : "postgres";
      String username = explicitUsername.isBlank() ? parsedUsername : explicitUsername;
      String password = explicitPassword.isBlank() ? parsedPassword : explicitPassword;
      String jdbcUrl = "jdbc:postgresql://" + uri.getHost() + ":" + (uri.getPort() > 0 ? uri.getPort() : 5432) + uri.getPath();
      return new ParsedJdbcUrl(jdbcUrl, username, password);
    }

    private static String decode(String value) {
      return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }
  }
}


