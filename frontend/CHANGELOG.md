# Changelog

## 0.1.0 — 2026-02-27

- Estrutura inicial: design tokens, tema MUI, primitivos de UI
- Layout público (`SiteLayout`, `StoreHeader`, `StoreFooter`)
- Roteamento com guard `OwnerRoute`
- Utilitários: `formatCurrency`, `maskPhone`, validadores
- ESLint flat config + Prettier

## 0.2.0 — 2026-03-27

- Fluxo de recuperação de senha via OTP por email (`ForgotPasswordPage`)
- Alteração de senha autenticada via OTP (`SecurityPage`)
- Página de aparência/tema (`SettingsPage`)
- Sidebar de conta (`AccountSidebar`) com links para Perfil, Pedidos, Segurança e Aparência
- Redirect de compatibilidade `/auth/reset-password` → `/auth/forgot-password`
- Backend: endpoints `/api/auth/password-reset/*` e `/api/auth/password-change/*`
- Backend: tabela `password_reset_tokens` (migrações V5 e V6)
- Backend: `EmailService` com envio de OTP por SMTP (modo dev retorna `devCode`)
