Crie um novo endpoint REST seguindo as convenções do projeto Rodando.

**Convenções obrigatórias:**
- Backend: endpoint público em `CatalogController.java`, endpoint de owner em `OwnerController.java`
- Resposta JSON via `service.orderedMap()` com chaves em camelCase
- SQL via `service.many()` / `service.one()` / `service.execute()`
- Cache público via `PublicCacheService` quando aplicável
- Frontend: método novo em `frontend/src/shared/lib/api.ts` usando `apiRequest<T>()`
- Nunca construir URLs de produto manualmente — usar `buildProductUrl()`

Descreva o endpoint que deseja criar (método HTTP, path, dados de entrada/saída) e implementarei seguindo essas convenções.
