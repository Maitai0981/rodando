# Paleta Visual do Site Rodando

## Direcao visual

O site trabalha com uma identidade de oficina premium para motopecas: base escura de alta densidade, dourado quente como cor de energia e agora uma variacao clara com o mesmo contraste de marca. A experiencia precisa continuar com cara de "moto center", sem perder leitura em checkout, catalogo e area da conta.

## Cores-base

### Tema escuro

| Papel                      | Token                       | Cor                      |
| -------------------------- | --------------------------- | ------------------------ |
| Fundo principal            | `--background`              | `#0A0A0F`                |
| Superficie                 | `--surface` / `--card`      | `#111118`                |
| Superficie forte           | `--surface-strong`          | `#060608`                |
| Texto principal            | `--foreground`              | `#F0EDE8`                |
| Texto secundario           | `--muted-foreground`        | `#6B7280`                |
| Texto de apoio             | `--muted-foreground-strong` | `#9CA3AF`                |
| Texto de navegacao inativa | `--nav-foreground`          | `#A0A0A0`                |
| Destaque primario          | `--primary`                 | `#D4A843`                |
| Destaque forte             | `--chart-2`                 | `#F0C040`                |
| Erro                       | `--destructive`             | `#EF4444`                |
| Borda neutra               | `--border`                  | `rgba(255,255,255,0.07)` |
| Campo/translucido          | `--surface-translucent`     | `rgba(255,255,255,0.05)` |

### Tema claro

| Papel                      | Token                       | Cor                      |
| -------------------------- | --------------------------- | ------------------------ |
| Fundo principal            | `--background`              | `#F7F2E8`                |
| Superficie                 | `--surface` / `--card`      | `#FFFAF2`                |
| Superficie forte           | `--surface-strong`          | `#EFE6D8`                |
| Texto principal            | `--foreground`              | `#1C2430`                |
| Texto secundario           | `--muted-foreground`        | `#667085`                |
| Texto de apoio             | `--muted-foreground-strong` | `#4E5D72`                |
| Texto de navegacao inativa | `--nav-foreground`          | `#5F6C81`                |
| Destaque primario          | `--primary`                 | `#D4A843`                |
| Destaque de contraste      | `--accent-foreground`       | `#9D6F19`                |
| Erro                       | `--destructive`             | `#DC2626`                |
| Borda neutra               | `--border`                  | `rgba(28,36,48,0.12)`    |
| Campo/translucido          | `--surface-translucent`     | `rgba(255,250,242,0.96)` |

## Regras de uso

- Dourado e amarelo quente sao reservados para CTA, indicadores ativos, chips de contagem e estados de destaque.
- Texto principal nunca deve usar dourado; dourado entra como acento e nao como massa de leitura.
- Cards, modais e formularios usam superficies translucidas ou claras, nunca preto puro.
- A hierarquia tipografica depende do contraste entre `--foreground`, `--muted-foreground` e `--muted-foreground-strong`.
- Bordas sempre ficam suaves; o peso visual vem da combinacao de contraste, espacamento e gradiente, nao de contornos pesados.

## Gradientes e interacoes

- CTA principal: `linear-gradient` de `#D4A843` para `#F0C040`.
- Hover de destaque: fundo dourado translucido entre `10%` e `14%` de opacidade.
- Estado ativo de navegacao: texto dourado com sublinhado em gradiente.
- Campos de formulario: base translucida no escuro e base marfim no claro, ambos com borda baixa e foco em `--ring`.

## Mapeamento semantico

- Hero e secoes de vitrine: `--background`.
- Cards de produto, blocos de perfil e listas: `--surface` ou `--surface-translucent-*`.
- Footer e barras de separacao fortes: `--surface-strong`.
- Texto de apoio, datas e descricoes curtas: `--muted-foreground`.
- Conteudo auxiliar e metadata: `--muted-foreground-strong`.
- Acoes destrutivas: `--destructive`.

## Observacoes para futuras telas

- Qualquer nova tela publica deve respeitar os tokens acima antes de introduzir hex novo.
- Se um componente precisar de outra variacao, prefira criar um token semantico novo em `frontend/src/styles/theme.css`.
- A marca deve continuar reconhecivel nos dois temas: fundo muda, mas o dourado continua sendo a ancora visual principal.
