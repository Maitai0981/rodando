# Storefront Rebuild Checklist

## Contratos Congelados

- `data-testid` do header:
  - `header-nav-home`
  - `header-nav-catalog`
  - `header-search-autocomplete`
  - `header-search-input`
  - `header-search-input-mobile`
  - `header-cart-button`
  - `header-account-button`
- `data-testid` mobile:
  - `mobile-bottom-nav`
  - `mobile-nav-home`
  - `mobile-nav-catalog`
  - `mobile-nav-cart`
  - `mobile-nav-account`
- `data-testid` de catalogo/carrinho:
  - `catalog-add-*`
  - `catalog-apply-filters`
  - `catalog-clear-filters`
  - `catalog-review-message-input`
  - `catalog-review-submit-button`
  - `cart-checkout-button`
  - `cart-clear`

## Novas Rotas

- `GET /produto/:id-:slug`
- `GET /checkout`

## Backend

- `GET /api/products/:id`
  - retorna `404` para produto ausente/inativo
  - retorna shape completo para PDP

## Fluxos

- PLP -> PDP por URL canonica de produto
- Cart -> Checkout dedicado
- Usuario anonimo em checkout redireciona para `/auth?returnTo=/checkout`

## Qualidade

- Direcao de transicao preservada via `data-route-direction`
- Base visual centralizada em `src/design-system`
- Componentes reutilizaveis centralizados em `src/ui/*`
