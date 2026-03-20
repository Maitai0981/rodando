# React + TypeScript + Vite

## Performance scripts

- `npm run perf:build`: executa build completo e gera `frontend/perf/frontend-build.json`.
- `npm run perf:bundle`: analisa `dist/assets` e gera `frontend/perf/frontend-bundle.json` com totais e top chunks.

## Build notes

- O frontend não depende mais de `tailwind/postcss` nesta base.
- O chunking do Vite está configurado para separar `react`, `mui`, `react-query` e `motion/lucide`.
- Para producao, configure `VITE_API_URL` com a URL publica do backend (sem `/` final).

## Variaveis de ambiente

- `VITE_API_URL=https://api.example.com`
- `VITE_WEB_VITALS=0|1`
- `VITE_SOURCEMAP=0|1`
- `VITE_DISABLE_ROUTE_MOTION=0|1`

Em desenvolvimento local, se `VITE_API_URL` estiver vazio, o frontend usa o proxy do Vite para `http://localhost:4000`.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## E2E com PostgreSQL local (Windows PowerShell)

Defina a conexão do banco usada no backend do Playwright:

```powershell
$env:E2E_DATABASE_URL="postgres://postgres:SUA_SENHA@127.0.0.1:5432/rodando_e2e"
npm --prefix frontend run test:e2e
```

`test:e2e` agora executa um preflight de conexão antes do Playwright.
O backend de E2E roda em banco isolado e com defaults:
- `SEED_BASE_CATALOG=1`
- `SEED_DEMO_DATA=0`

### Troubleshooting

- `28P01`: usuário/senha inválidos no PostgreSQL.
- `ECONNREFUSED`: PostgreSQL não está rodando ou não está ouvindo em `127.0.0.1:5432`.
- `3D000` (`database does not exist`): crie o banco ou use usuário com permissão para criação automática.
- `npm ci` com `package-lock` fora de sync (`Missing: yaml@... from lock file`):
  - use Node `20.11.1` (`.nvmrc`) e rode `npm --prefix frontend install` para regenerar o lock.
  - valide com `npm --prefix frontend ci --ignore-scripts`.
- `EPERM` no `esbuild.exe` (Windows):
  - encerre `vite/node` em execução.
  - remova `frontend/node_modules`.
  - execute novamente `npm --prefix frontend ci`.
  - se persistir, revise bloqueio de antivírus no diretório `frontend/node_modules`.
