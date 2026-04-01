# Guia de Variaveis de Ambiente

Este projeto depende de um conjunto pequeno de variaveis obrigatorias e varias opcionais para operacao, billing e observabilidade.

## Obrigatorias

### `DATABASE_URL`

String de conexao com PostgreSQL.

Exemplo:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/inventario_agil?sslmode=disable
```

### `AUTH_SECRET`

Segredo usado na autenticacao e cookies de sessao.

### `NEXT_PUBLIC_APP_URL`

URL publica base da aplicacao. E usada nos redirects do billing.

### `STRIPE_SECRET_KEY`

Chave secreta da conta Stripe.

### `STRIPE_WEBHOOK_SECRET`

Segredo do webhook Stripe para validar eventos recebidos.

## Opcionais

### IA

- `GEMINI_API_KEY`: habilita recursos de IA do modulo MRP.

### Redis

- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`

Se nao configurado, partes do sistema continuam funcionando, mas voce perde ganhos de cache e integracoes de tempo real associadas.

### Banco e performance

- `PGSSLMODE`
- `PG_POOL_MIN`
- `PG_POOL_MAX`
- `PG_IDLE_TIMEOUT_MS`
- `PG_CONNECTION_TIMEOUT_MS`
- `DEBUG_PERF`

### Realtime

- `NEXT_PUBLIC_WS_URL`: endpoint WebSocket usado pelo cliente.

### Notificacoes

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

### Jobs e deploy

- `CRON_SECRET`
- `DEPLOY_ON_BUILD`
- `AUTO_DEPLOY`
- `DEPLOY_COMMAND`
- `VERCEL_TOKEN`

### Relatorios

- `SPEED_INSIGHTS_PORT`
- `SPEED_INSIGHTS_PATH`
- `SPEED_INSIGHTS_TIMEOUT`

## Exemplo rapido

Use [.env.example](../.env.example) como base para novos ambientes.

## Boas praticas

- Nunca versione o `.env` real.
- Use segredos diferentes entre desenvolvimento, preview e producao.
- Revise variaveis de billing e autenticacao antes de cada deploy.
