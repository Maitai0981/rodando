# Rodando - Releitura do www.rodando.com.br

Projeto de catálogo e gestão de peças para motos, com foco em experiência comercial para cliente final e operação segura para o proprietário.

## Escopo de produto
- Área pública: início, informações técnicas e catálogo de produtos.
- Área restrita do proprietário: autenticação e gerenciamento de produtos.
- Persistência em Supabase com políticas RLS.

## Banco e segurança
Arquivo SQL: `supabase/schema.sql`
- Leitura pública do catálogo.
- Escrita apenas para dono autenticado (`owner_id = auth.uid()`).

## Testes automatizados
### Cobertura por parte do sistema
- `tests/e2e/public-navigation-catalog.spec.js`
  - navegação pública
  - listagem e busca de catálogo
- `tests/e2e/restricted-owner-access.spec.js`
  - usuário comum não vê painel de cadastro
  - acesso restrito sem autenticação
- `tests/e2e/owner-auth-crud.spec.js`
  - login proprietário
  - cadastro, edição, exclusão e logout
- `tests/e2e/owner-validation.spec.js`
  - validações destrutivas de formulário
  - bloqueio de dados inválidos
- `tests/e2e/supabase-live-connectivity.spec.js`
  - conexão real com Supabase REST
  - resposta do endpoint de autenticação

## Executar testes
1. Instalar dependências:
```bash
npm install
```

2. Instalar browser de teste:
```bash
npx playwright install chromium
```

3. Rodar suíte completa (mock estável para QA funcional):
```bash
npm test
```

4. Rodar conectividade real com Supabase:
```bash
npm run test:live
```

Opcional com variáveis explícitas:
```bash
RUN_LIVE_SUPABASE=1 SUPABASE_URL="https://neyicdngqsourghhnpnm.supabase.co" SUPABASE_PUBLISHABLE_KEY="sb_publishable_EsD6vF0jBH7G7y5We25ZGQ_aGGWOiaX" npx playwright test tests/e2e/supabase-live-connectivity.spec.js
```
