import { matchPath } from 'react-router-dom'
import type { AssistScope } from '../lib/api'

export type AssistRouteKey =
  | 'home'
  | 'catalog'
  | 'cart'
  | 'auth-signin'
  | 'auth-signup'
  | 'account-profile'
  | 'orders'
  | 'order-details'
  | 'owner-login'
  | 'owner-dashboard'
  | 'owner-products'
  | 'owner-orders'
  | 'owner-settings'

export type AssistChecklistStep = {
  id: string
  label: string
}

export type AssistRouteDefinition = {
  key: AssistRouteKey
  scope: AssistScope
  title: string
  patterns: string[]
  overlayIntro: string[]
  checklist: AssistChecklistStep[]
}

export const ASSIST_ROUTE_DEFINITIONS: AssistRouteDefinition[] = [
  {
    key: 'owner-login',
    scope: 'owner',
    title: 'Acesso owner',
    patterns: ['/owner/login'],
    overlayIntro: [
      'Use apenas sua conta owner nesta tela.',
      'Se algo falhar, revise email e senha antes de tentar de novo.',
      'Depois do login, abra Dashboard, Produtos e Pedidos.',
    ],
    checklist: [
      { id: 'credentials-filled', label: 'Preencher email e senha owner' },
      { id: 'signin-complete', label: 'Entrar no painel owner' },
    ],
  },
  {
    key: 'owner-dashboard',
    scope: 'owner',
    title: 'Dashboard owner',
    patterns: ['/owner/dashboard'],
    overlayIntro: [
      'Comece pelo periodo para evitar leituras erradas.',
      'Confirme receita, conversao e estoque critico.',
      'Use a tabela para abrir os produtos com maior impacto.',
    ],
    checklist: [
      { id: 'period-filter', label: 'Aplicar filtro de periodo' },
      { id: 'kpi-read', label: 'Interpretar 3 KPIs principais' },
    ],
  },
  {
    key: 'owner-products',
    scope: 'owner',
    title: 'Produtos owner',
    patterns: ['/owner/products', '/owner/products/new', '/owner/products/:id/edit'],
    overlayIntro: [
      'Produto ativo precisa de imagem principal valida.',
      'Se tiver pedido vinculado, prefira arquivar em vez de excluir.',
      'Use estoque minimo e ponto de reposicao para evitar ruptura.',
    ],
    checklist: [
      { id: 'open-create', label: 'Abrir fluxo de novo produto' },
      { id: 'save-valid', label: 'Salvar produto com dados minimos validos' },
      { id: 'published-with-image', label: 'Publicar produto com imagem principal' },
    ],
  },
  {
    key: 'owner-orders',
    scope: 'owner',
    title: 'Pedidos owner',
    patterns: ['/owner/orders'],
    overlayIntro: [
      'Filtre por status para priorizar pedidos urgentes.',
      'No detalhe, valide pagamento e endereco antes de atualizar status.',
      'Use cancelamento apenas quando necessario.',
    ],
    checklist: [
      { id: 'filter-used', label: 'Aplicar filtro de status ou cidade' },
      { id: 'detail-opened', label: 'Abrir detalhe de pedido' },
      { id: 'status-updated', label: 'Atualizar status com seguranca' },
    ],
  },
  {
    key: 'owner-settings',
    scope: 'owner',
    title: 'Configuracoes owner',
    patterns: ['/owner/settings'],
    overlayIntro: [
      'Email de alerta de venda e obrigatorio.',
      'WhatsApp e opcional para notificacao complementar.',
      'Salve parametros de custo para manter margem operacional.',
    ],
    checklist: [
      { id: 'alert-email-filled', label: 'Informar email principal de alerta' },
      { id: 'settings-saved', label: 'Salvar configuracoes operacionais' },
    ],
  },
  {
    key: 'home',
    scope: 'public',
    title: 'Home',
    patterns: ['/'],
    overlayIntro: [
      'Use a busca para encontrar o item certo mais rapido.',
      'Abra o catalogo para comparar preco e disponibilidade.',
      'Confirme avaliacoes e prova social antes da compra.',
    ],
    checklist: [
      { id: 'search-used', label: 'Usar busca por produto ou categoria' },
      { id: 'open-catalog', label: 'Entrar no catalogo' },
      { id: 'social-proof-viewed', label: 'Ler prova social real' },
    ],
  },
  {
    key: 'catalog',
    scope: 'public',
    title: 'Catalogo',
    patterns: ['/catalog'],
    overlayIntro: [
      'Aplique filtro primeiro para reduzir erro de compra.',
      'Confirme categoria, fabricante e estoque no card.',
      'Adicione o item na mochila para seguir ao checkout.',
    ],
    checklist: [
      { id: 'filter-applied', label: 'Aplicar filtro ou busca' },
      { id: 'add-to-bag', label: 'Adicionar item na mochila' },
    ],
  },
  {
    key: 'cart',
    scope: 'public',
    title: 'Mochila / Checkout',
    patterns: ['/cart'],
    overlayIntro: [
      'Escolha retirada ou entrega antes de finalizar.',
      'Com entrega, selecione endereco valido.',
      'Revise total e confirme os dados do destinatario.',
    ],
    checklist: [
      { id: 'method-selected', label: 'Selecionar metodo de entrega' },
      { id: 'address-selected', label: 'Selecionar endereco (quando entrega)' },
      { id: 'recipient-filled', label: 'Preencher dados do destinatario' },
      { id: 'checkout-complete', label: 'Concluir checkout' },
    ],
  },
  {
    key: 'auth-signin',
    scope: 'public',
    title: 'Login',
    patterns: ['/auth'],
    overlayIntro: [
      'Preencha email e senha e confirme o acesso.',
      'Se falhar, revise credenciais antes de tentar novamente.',
      'Sem conta? abra o cadastro na tela seguinte.',
    ],
    checklist: [
      { id: 'credentials-filled', label: 'Preencher email e senha' },
      { id: 'signin-complete', label: 'Concluir login' },
    ],
  },
  {
    key: 'auth-signup',
    scope: 'public',
    title: 'Cadastro',
    patterns: ['/auth/signup'],
    overlayIntro: [
      'Nome, email, senha e CEP sao obrigatorios.',
      'Aguarde a validacao de CEP para preencher endereco.',
      'Ao concluir, voce entra automaticamente.',
    ],
    checklist: [
      { id: 'form-filled', label: 'Preencher dados obrigatorios' },
      { id: 'cep-validated', label: 'Validar CEP e endereco' },
      { id: 'signup-complete', label: 'Concluir cadastro' },
    ],
  },
  {
    key: 'account-profile',
    scope: 'public',
    title: 'Minha conta',
    patterns: ['/account/profile'],
    overlayIntro: [
      'Atualize perfil para evitar erro no checkout.',
      'Cadastre endereco completo e marque um principal.',
      'Use meus pedidos para acompanhar a entrega.',
    ],
    checklist: [
      { id: 'profile-saved', label: 'Salvar dados do perfil' },
      { id: 'address-created', label: 'Cadastrar endereco' },
      { id: 'default-address-set', label: 'Definir endereco principal' },
    ],
  },
  {
    key: 'orders',
    scope: 'public',
    title: 'Meus pedidos',
    patterns: ['/orders'],
    overlayIntro: [
      'Aqui voce acompanha todos os pedidos em um lugar.',
      'Abra detalhes para ver timeline e status.',
      'Use o historico para confirmar entrega e pagamento.',
    ],
    checklist: [
      { id: 'orders-viewed', label: 'Visualizar lista de pedidos' },
      { id: 'details-opened', label: 'Abrir detalhe de um pedido' },
    ],
  },
  {
    key: 'order-details',
    scope: 'public',
    title: 'Detalhe do pedido',
    patterns: ['/orders/:id'],
    overlayIntro: [
      'Revise status, pagamento e metodo de entrega.',
      'Confira itens e valores antes de acionar suporte.',
      'A timeline mostra cada etapa do pedido.',
    ],
    checklist: [
      { id: 'timeline-viewed', label: 'Ler timeline do pedido' },
    ],
  },
]

export function resolveAssistRoute(pathname: string): AssistRouteDefinition | null {
  for (const route of ASSIST_ROUTE_DEFINITIONS) {
    for (const pattern of route.patterns) {
      if (matchPath({ path: pattern, end: true }, pathname)) {
        return route
      }
    }
  }
  return null
}

export function getAssistRouteByKey(key: string): AssistRouteDefinition | null {
  return ASSIST_ROUTE_DEFINITIONS.find((route) => route.key === key) ?? null
}
