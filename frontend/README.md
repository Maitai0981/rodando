# Frontend — Rodando Moto Center

SPA React 18 + TypeScript + Vite. Interface da loja de peças para motocicletas.

## Stack

| Componente        | Tecnologia                    |
|-------------------|-------------------------------|
| Framework         | React 18                      |
| Linguagem         | TypeScript 5.6                |
| Build             | Vite 5                        |
| Estilo            | Tailwind CSS 4 + CSS custom props |
| Componentes base  | MUI (Material UI) 7           |
| Animações         | Framer Motion 11              |
| Estado de servidor| TanStack React Query v5       |
| Roteamento        | React Router v6               |
| Testes unitários  | Vitest + Testing Library      |
| Testes E2E        | Playwright                    |
| Node obrigatório  | 20.x                          |

## Comandos

```bash
# Instalar dependências
npm ci

# Desenvolvimento local (proxy → backend :4000)
npm run dev

# Build de produção
npm run build

# Preview do build
npm run preview
```

## Testes

```bash
# Unitários (modo CI — sem a11y)
npm run test:unit

# Acessibilidade (pool separado para evitar OOM do axe)
npm run test:a11y

# E2E (requer backend rodando)
npm run test:e2e

# Watch interativo
npm test
```

## Variáveis de ambiente

Copie o template e configure:

```bash
cp .env.example .env.local
```

| Variável                   | Padrão                  | Descrição                                |
|----------------------------|-------------------------|------------------------------------------|
| `VITE_API_URL`             | `` (usa proxy do Vite) | URL pública do backend sem `/` final     |
| `VITE_WEB_VITALS`          | `0`                     | Habilita coleta de Web Vitals            |
| `VITE_SOURCEMAP`           | `0`                     | Gera source maps no build de produção    |
| `VITE_DISABLE_ROUTE_MOTION`| `0`                     | Desativa animações de transição de rota  |

Em desenvolvimento, se `VITE_API_URL` estiver vazio, o Vite faz proxy de `/api/*` para `http://localhost:4000`.

## Estrutura

```
src/
├── features/
│   ├── assist/     Sistema de orientação contextual inline
│   └── auth/       Layout de autenticação (AuthSplitLayout)
├── pages/          Uma página por rota (lazy-loaded)
├── routes/         AppRoutes, guards/OwnerRoute
├── shared/
│   ├── context/    AuthContext, CartContext, ThemeContext, AssistContext
│   ├── layout/     SiteLayout, OwnerLayout, StoreHeader, StoreFooter, MobileBottomNav
│   ├── lib/        api.ts, queryClient.ts, formatCurrency.ts, validators.ts
│   ├── design-system/  tokens.ts, theme.ts
│   ├── styles/     index.css, theme.css, tailwind.css
│   ├── ui/primitives/  Componentes base reutilizáveis
│   └── common/     ImageWithFallback, RouteFallback
└── a11y/           Testes de acessibilidade (vitest-axe)
e2e/                Testes Playwright
```

## Convenções

- Idioma das interfaces: **português**
- Todas as chamadas à API passam por `apiRequest<T>()` em `shared/lib/api.ts`
- URLs de produto via `buildProductUrl()` — nunca construir manualmente
- Testes usam `renderWithProviders` para contexto (QueryClient + Router + Auth)
- `vi.hoisted()` para mocks de módulos nos testes unitários

## E2E local

```bash
# Linux / macOS
E2E_DATABASE_URL="postgres://postgres:SENHA@127.0.0.1:5432/rodando_e2e" npm run test:e2e

# Windows PowerShell
$env:E2E_DATABASE_URL="postgres://postgres:SENHA@127.0.0.1:5432/rodando_e2e"
npm run test:e2e
```

O backend de E2E é iniciado automaticamente. O preflight verifica a conexão com o banco antes de rodar o Playwright.

## Troubleshooting

| Erro                          | Causa                                       | Solução                                         |
|-------------------------------|---------------------------------------------|-------------------------------------------------|
| `ECONNREFUSED` no e2e         | Backend não subiu                           | Cheque logs; o preflight aguarda até 120s       |
| `EPERM` no `esbuild.exe`      | Outro processo usando o node_modules        | Feche o Vite e delete `node_modules/`           |
| `npm ci` falha no lockfile    | Lock desatualizado                          | Rode `npm install` e commite o `package-lock.json` |
| `ECONNREFUSED` no PostgreSQL  | Banco não está rodando                      | Inicie o PostgreSQL                             |
