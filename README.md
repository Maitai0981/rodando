# Rodando - Releitura do www.rodando.com.br

Projeto de catálogo e gestão de peças para motos, com foco em experiência comercial para cliente final e operação segura para o proprietário.

## Escopo do produto
- Área pública: início, informações técnicas e catálogo.
- Área restrita: autenticação do proprietário e gerenciamento de produtos.
- Banco Supabase com regras de leitura pública e escrita restrita.

## Segurança de acesso
Arquivo SQL: `supabase/schema.sql`
- Leitura pública liberada para o catálogo (`products_public_read`).
- Escrita (insert/update/delete) permitida apenas ao dono autenticado (`owner_id = auth.uid()`).

## Testes automatizados
### Cobertura funcional (mock estável)
- `tests/e2e/public-navigation-catalog.spec.js`
  - navegação entre seções
  - catálogo público e busca
- `tests/e2e/system-sections.spec.js`
  - valida conteúdo da home
  - valida conteúdo técnico
  - confirma bloqueio visual de cadastro para visitante
- `tests/e2e/restricted-owner-access.spec.js`
  - usuário comum não acessa gestão
- `tests/e2e/owner-auth-crud.spec.js`
  - login proprietário
  - cadastro, edição, exclusão e logout
- `tests/e2e/owner-validation.spec.js`
  - validações destrutivas de formulário

### Cobertura live Supabase
- `tests/e2e/supabase-live-connectivity.spec.js`
  - REST de catálogo responde em tempo aceitável
  - endpoint de autenticação responde
  - escrita anônima é bloqueada
  - CRUD completo autenticado (opcional, quando credenciais do proprietário são informadas)

## Como executar
1. Instalar dependências:
```bash
npm install
```

2. Instalar browser de teste:
```bash
npx playwright install chromium
```

3. Rodar suíte funcional completa:
```bash
npm test
```

4. Rodar suíte live Supabase:
```bash
npm run test:live
```

## Variáveis para live
### Obrigatórias para conectividade
- `RUN_LIVE_SUPABASE=1`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (ou `SUPABASE_PUBLISHABLE_KEY`)

### Opcionais para validar CRUD autenticado
- `SUPABASE_OWNER_EMAIL`
- `SUPABASE_OWNER_PASSWORD`

Exemplo:
```bash
RUN_LIVE_SUPABASE=1 SUPABASE_URL="https://neyicdngqsourghhnpnm.supabase.co" SUPABASE_ANON_KEY="sb_publishable_..." SUPABASE_OWNER_EMAIL="owner@dominio.com" SUPABASE_OWNER_PASSWORD="sua_senha" npm run test:live
```
