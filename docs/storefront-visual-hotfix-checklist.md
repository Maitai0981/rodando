# Storefront Visual Hotfix Checklist

## Objetivo
Garantir consistencia visual premium em todo o storefront com tipografia clara, icones coerentes e layout responsivo sem regressao funcional.

## Escopo validado
- Home, Catalogo, Produto, Carrinho, Checkout
- Auth e Owner/Admin
- Header, navegação mobile, footer e componentes assist

## Contratos preservados
- `data-testid` criticos de header, catalogo, carrinho, checkout e owner
- Rotas e query params existentes
- Fluxos de negocio (auth, cart, pedidos, owner)

## Verificacoes obrigatorias
1. Navegação muda de tela sem refresh manual.
2. Header e barra mobile mantem legibilidade em 390/768/1440.
3. Titulos, subtitulos, corpo e preco seguem hierarquia tipografica unica.
4. Todos os icones seguem o mesmo peso/traço visual.
5. Dicas assistidas ficam ocultas por padrao e abrem por `?`:
   - desktop: hover/focus
   - mobile: tap abre/fecha
6. Sem imports de `@mui/icons-material`.
7. Sem classes legadas `home-luxe-*`, `mobile-premium-*`, `glass-nav`.

## Comandos de qualidade
```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix frontend run test:unit
npm --prefix frontend run test:a11y
```

## E2E
E2E depende de `E2E_DATABASE_URL` valido e banco `_e2e` acessivel.
