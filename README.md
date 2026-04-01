# Inventario Agil

Sistema web de operacao logistica com foco em pedidos, estoque, producao, picking e governanca multi-tenant.

## Visao geral

O projeto foi construido com Next.js App Router e TypeScript, com persistencia em PostgreSQL, cache opcional em Redis e cobranca recorrente via Stripe. A aplicacao prioriza operacao em tempo real, isolamento por tenant e UX para times internos.

## Principais recursos

- Gestao de pedidos com reserva de estoque e sinalizacao de falta de material.
- Fluxo de producao e picking integrado ao status operacional.
- Arquitetura multi-tenant com RLS no banco.
- Dashboard com consultas otimizadas e atualizacao em segundo plano.
- Onboarding de tenants e estrutura de billing recorrente.

## Stack principal

- Next.js 15
- React 19
- TypeScript
- PostgreSQL
- Redis
- Stripe
- Playwright

## Como rodar localmente

1. Instale as dependencias:

```bash
npm install
```

2. Crie seu arquivo `.env` a partir de `.env.example`.

3. Rode a aplicacao:

```bash
npm run dev
```

4. Se precisar aplicar migrations manualmente:

```bash
npm run db:migrate
```

## Comandos importantes

```bash
npm run lint
npm run typecheck
npm run build
npm run test:e2e
npm run ci
```

`npm run ci` executa a validacao principal usada no pipeline.

## Qualidade e entrega

- Pull requests passam por CI com lint, typecheck e build.
- O repositorio possui templates de issue e pull request.
- Releases e publicacao de imagem Docker possuem workflows dedicados.

## Documentacao

- [Arquitetura](./docs/ARCHITECTURE.md)
- [API](./docs/API.md)
- [Ambiente](./docs/ENVIRONMENT.md)
- [Scripts](./docs/SCRIPTS.md)
- [Troubleshooting](./docs/TROUBLESHOOTING.md)
- [Contribuicao](./docs/CONTRIBUTING.md)
- [Changelog](./docs/CHANGELOG.md)
- [Seguranca](./docs/SECURITY.md)

## Licenca

MIT. Veja [docs/LICENSE](./docs/LICENSE).
