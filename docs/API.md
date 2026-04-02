# Referencia da API (Next.js Routes)

A API do `Inventario Agil` e baseada em rotas do Next.js e utiliza autenticacao via sessao JWT/cookie.

## Autenticacao

Todas as rotas privadas exigem usuario autenticado.
- Path base: `/api/auth/*`
- Metodos principais: `POST` e `GET`
- Retorno: cookie de sessao e dados do usuario autenticado

---

## Pedidos (`/api/orders`)

Gerencia o ciclo de vida dos pedidos de venda e transferencias.

### `GET /api/orders`

Retorna a lista de pedidos nao arquivados.

Campos principais por pedido:
- `id`: prefixo `O-` seguido do id numerico
- `status`: `RASCUNHO`, `ABERTO`, `EM_PICKING`, `FINALIZADO`, `CANCELADO`
- `readiness`: `NOT_READY`, `READY_PARTIAL`, `READY_FULL`
- `operationMode`: `QUANTITY`, `WEIGHT` ou `BOTH`
- `items`: lista de itens do pedido
- `items[].qtyRequested`: quantidade solicitada
- `items[].requestedWeight`: peso solicitado do item quando aplicavel

### `POST /api/orders`

Cria um novo pedido.

Payload relevante:

```json
{
  "clientName": "Cliente Exemplo",
  "dueDate": "2026-04-10",
  "source": "manual",
  "operationMode": "BOTH"
}
```

### `PATCH /api/orders/[id]`

Atualiza metadados, itens e a operacao do pedido.

Acoes relevantes:
- `action: "update_meta"` aceita `operationMode`
- `action: "save_order"` aceita `operationMode`
- `action: "update_item"` aceita `qtyRequested` e `requestedWeight`
- `action: "complete_picking"` valida o preenchimento conforme o `operationMode` do pedido

### `POST /api/orders/submit`

Ao enviar o pedido para o fluxo operacional, os itens podem persistir:
- `qtyRequested`
- `requestedWeight`

### Regras do tipo do pedido

- `QUANTITY`: o fluxo usa quantidade como preenchimento principal.
- `WEIGHT`: o fluxo usa peso como preenchimento principal.
- `BOTH`: o fluxo exige quantidade e peso.

---

## Producao (`/api/production`)

Controla as ordens e tarefas que precisam ser fabricadas.

### `GET /api/production`

Lista tarefas pendentes ou concluidas.

Campos relevantes:
- `status`: `PENDING` ou `DONE`
- `operationMode`: modo operacional do pedido de origem
- `requestedWeight`: peso solicitado do item, usado como referencia visual

### `PATCH /api/production`

Atualiza o progresso de uma tarefa ou a marca como concluida.

As validacoes seguem o `operationMode` do pedido:
- `QUANTITY`: exige quantidade produzida
- `WEIGHT`: exige peso produzido
- `BOTH`: exige quantidade e peso

---

## MRP (`/api/mrp-suggestions`)

Interface com o motor de inteligencia artificial.

### `GET /api/mrp-suggestions`

Retorna as sugestoes geradas pela ultima rodada da IA.

Campos comuns:
- `materialId`
- `suggestedQty`
- `reasoning`
- `status`

---

## Notificacoes (`/api/notifications`)

Sistema de alertas interno.

### `GET /api/notifications`

Retorna alertas de estoque baixo, rupturas e novas alocacoes.

---

## Indicadores (`/api/people-indicators`)

Dados para dashboards de performance.

Retorna metricas agregadas por dia e por operador.

---

## Notas tecnicas

- Formato principal: JSON
- Erros: `{ "error": "mensagem" }` com status HTTP correspondente
- Realtime: algumas rotas publicam eventos para atualizar a UI sem refresh
