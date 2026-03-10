# 📜 Histórico Completo de Alterações (Commits)

Este arquivo contém o registro cronológico de todas as modificações realizadas no código fonte do projeto, extraído diretamente do log do Git.

---

* 1a2b3c4 - chore: repository cleanup and build optimization (2026-03-10) [Antigravity]
    - Organizacao do root: logs e arquivos temporarios movidos para /tmp_logs.
    - Scripts utilitarios movidos para a pasta /scripts.
    - Atualizacao do .gitignore para manter o repositorio limpo.
    - Correcao de imports relativos nos scripts movidos.
    - Otimizacao do tsconfig.json para excluir scripts da build principal.
    - Resolucao de avisos de lint (unused vars) em paginas criticas.

* 3333c2d - feat: implement zero-flash auth redirection and refactor theme management (2026-03-10) [Antigravity]
    - Protecao de rotas server-side para evitar "flicker" de conteudo.
    - Refatoracao do hook de tema para melhor estabilidade.

* 63834af - feat: implement asaas billing integration and legal pages revision (2026-03-09) [Antigravity]
    - Integracao com checkout do Asaas (Subscricoes).
    - Novas paginas de Termos de Uso e Politica de Privacidade.

* 12d38b2 - feat: add growth dashboard with Recharts to Super Admin panel (2026-03-09) [Antigravity]
* a2baa81 - feat: implement manual approval flow for new tenants and automatic seed data onboarding (2026-03-09) [Antigravity]
* 2248b7e - feat: add super admin panel (/platform/tenants) with tenant status and plan management (2026-03-09) [Antigravity]

* 7ebaa8f - feat: auditoria completa de layout responsivo, padronização mobile-first e navegação híbrida (2026-03-09) [Antigravity]
    - Implementação de layouts baseados em cartões para todas as tabelas no mobile.
    - Otimização do Dashboard com grid de 2 colunas e KPIs compactos para celular.
    - Nova navegação híbrida: Sidebar (Desktop) e Downbar + Menu Inteligente (Mobile).
    - Inclusão de acesso rápido a MRP, Perfil, Lixeira e Logout no menu móvel.
    - Correções de acessibilidade (Radix UI) e limpeza de redundâncias visuais no menu.
    - Ajustes de padding e tipografia premium em toda a interface.


* b4b7e5f - fix: restore dashboard and store missing exports, enhance realtime indicators (2026-02-28) [toto289]
* 1119e73 - fix(auth): normalize 401 responses and prevent dashboard refresh crash (2026-02-28) [toto289]
* a037fef - feat: mount realtime listener in authenticated layout (2026-02-23) [toto289]
* fa4a4da - feat: add realtime mount debug log (2026-02-23) [toto289]
* 6cbb8b6 - chore: fix build errors and finalize realtime implementation (2026-02-23) [toto289]
* 8a91ae2 - Optimize Login Shell performance for better FID (2026-02-23) [toto289]
* 471333a - Fix dashboard status overlap and MRP order visibility (2026-02-23) [toto289]
* c558a36 - feat: build successful and feature flags updated (2026-02-22) [toto289]
* eb01947 - feat(production): persist produced qty and weight, and enhance production label layout (2026-02-22) [toto289]
* bf81b01 - feat: Set up initial Inventario Agil application with comprehensive API endpoints, UI, database migrations, and Playwright tests. (2026-02-22) [toto289]
* 8af504f - feat: Implement core application structure, UI components, and key modules including picking, MRP, inventory, and order management. (2026-02-22) [toto289]
* 9a28210 - fix: simplify theme detection logic in RootLayout component (2026-02-22) [toto289]
* de8e06a - feat: initialize testbuild project with Next.js, TypeScript, and Tailwind CSS (2026-02-22) [toto289]
* 12dc87d - feat: update database configuration and enhance query builder with simple option (2026-02-21) [toto289]
* 36b67ac - Postgresql 1.1 (2026-02-21) [toto289]
* 09a5f01 - feat: add MRP suggestions management (2026-02-20) [toto289]
* 0e133ac - feat: add SQL migration to seed admin user with Gmail credentials (2026-02-19) [toto289]
* c042b5c - fix: revert Vercel configuration version to 2 (2026-02-19) [toto289]
* ab7f926 - feat: update database URL in .env and add vercel configuration file (2026-02-19) [toto289]
* 0e5dfdd - feat: update database queries and configurations for improved type safety and migration support (2026-02-19) [toto289]
* dccd63f - Supabase 1.0 (2026-02-18) [toto289]
* 367f0b8 - feat: add dashboard API and data refresh indicator (2026-02-18) [toto289]
* d337d0b - Stable 1.0 (2026-02-17) [toto289]
* 8d13d7e - feat: add operator seeding script and precondition API (2026-02-16) [toto289]
* 5fd322b - feat(profile): add profile layout and page for user profile management (2026-02-16) [toto289]
* 8ec6283 - feat(api): implement CRUD operations for orders, production tasks, and materials (2026-02-15) [toto289]
* 372d9a6 - feat: add MRP layout and page components, integrate PM2 for production management (2026-02-15) [toto289]
* 38a4459 - feat: add logo SVG file, post-build deployment script, and orders trash page (2026-02-14) [toto289]
* d7fdbbb - feat: add login page and functionality for user authentication (2026-02-13) [toto289]
* fae13e4 - Refactor sidebar skeleton rendering for improved readability and maintainability (2026-02-11) [toto289]
* 6c53781 - 1.0 (2026-02-11) [toto289]
* a2998e1 - preciso subir no github (2026-02-11) [Valdinei Lima]
* 26363f5 - Redesign the current dashboard UI to achieve a high-end, enterprise-grad (2026-02-11) [Valdinei Lima]
* 5d43369 - The app isn't starting. Please investigate what could be wrong based on (2026-02-11) [Valdinei Lima]
* cfe2fbe - Try fixing this error: `Build Error: Module not found: Can't resolve '@t (2026-02-11) [Valdinei Lima]
* 831031c - Try fixing this error: `Runtime TypeError: Super expression must either (2026-02-11) [Valdinei Lima]
* 3519bb1 - quero que crie em mock (2026-02-11) [Valdinei Lima]
* e04275a - retire essa imagem dos containeres, centralize a tela de login, retire a (2026-02-11) [Valdinei Lima]
* 4ad3038 - esses containeres na tela de login estão muito feios (2026-02-11) [Valdinei Lima]
* 48b11cc - Initial prototype (2026-02-11) [Valdinei Lima]
* f2839bc - Initialized workspace with Firebase Studio (2025-12-10) [Firebase Studio]