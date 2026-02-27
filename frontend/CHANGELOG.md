# Changelog

## 0.1.0 - 2026-02-27 17:47 (UTC-05:00)

- Added design tokens in `src/styles/tokens.ts` and centralized MUI theme in `src/theme/index.ts`.
- Created reusable UI primitives in `src/components/ui` with typed props and per-component folders.
- Added foundational sections (`Header`, `Footer`) and placeholders for core home sections.
- Introduced `AppShell` layout and connected public pages to shared header/footer structure.
- Moved routing config into `src/routes` with `OwnerRoute` guard.
- Added helper utilities in `src/lib` (`formatCurrency`, `maskPhone`, validators).
- Added Prettier configuration and scripts, and aligned ESLint integration for flat config.
