# Registro de Alteracoes (Changelog)

Todas as mudancas notaveis neste projeto sao documentadas aqui.

O formato e baseado em Keep a Changelog, com versoes seguindo Semantic Versioning quando aplicavel.

## [Unreleased]

### Adicionado
- Tipo do pedido por ordem operacional com suporte a `QUANTITY`, `WEIGHT` e `BOTH`.
- Persistencia de `operation_mode` em `orders`.
- Persistencia de `requested_weight` em `order_items` para o cenario `BOTH`.
- Documentacao tecnica atualizada para refletir o fluxo por pedido.

### Corrigido / Aprimorado
- Tela de `Pedidos` ajustada para reagir ao tipo do pedido durante a edicao.
- `Picking` passou a usar o modo do proprio pedido, com labels e validacoes especificas.
- `Producao` passou a usar o modo do proprio pedido, com badges e validacoes coerentes.
- `Picking` e `Producao` passaram a exibir `peso solicitado` como referencia visual quando disponivel.

## [0.1.0] - 2026-03-09

### Adicionado
- Piloto operacional inicial para Pedidos, Producao, Estoque e Picking.
- Engine de reservas com TTL e heartbeat.
- Integracao de IA para sugestoes de reposicao.
- Suporte a impressao de etiquetas com PDF e QR Code.
- Sistema inicial de autenticacao com perfis operacionais.
- Conjunto inicial de documentacao tecnica do projeto.

### Rascunho historico
- `v0.0.1`: setup inicial com Next.js, Tailwind e dados mockados.
- `v0.0.5`: adocao de repository pattern para desacoplamento de backend.
- `v0.0.9`: persistencia inicial em PostgreSQL para o fluxo de MRP.
