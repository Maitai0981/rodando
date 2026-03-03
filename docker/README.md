# Docker Organization

Docker-related files live under `docker/` to keep root clean.

## PostgreSQL

- Compose entrypoint remains `docker-compose.yml` at project root.
- DB config template: `docker/postgres/.env.example`
- Optional init scripts: `docker/postgres/init/`

## Usage

1. Copy env template:
   - `Copy-Item docker/postgres/.env.example docker/postgres/.env`
2. Start database:
   - `docker compose --env-file docker/postgres/.env up -d`
3. Check health:
   - `docker compose ps`
