# Guia de Variáveis de Ambiente

Este documento descreve detalhadamente cada variável necessária no arquivo `.env` para o correto funcionamento do **Inventário Ágil**.

## 🔑 Autenticação & IA

### `GEMINI_API_KEY`
- **Descrição**: Chave de API do Google Gemini para processamento de linguagem natural no módulo MRP.
- **Como Obter**: Através do [Google AI Studio](https://aistudio.google.com/app/apikey).
- **Impacto**: Sem esta chave, o painel de sugestões do MRP não funcionará.

## 🗄 Persistência (PostgreSQL)

### `DATABASE_URL`
- **Descrição**: String de conexão padrão do PostgreSQL. Inclui usuário, senha, host, porta e nome do banco.
- **Formato**: `postgresql://[user]:[password]@[host]:[port]/[db_name]`
- **Dica**: Use `?sslmode=disable` se estiver rodando em ambiente de desenvolvimento local sem certificados SSL.

## 🚀 Cache & Mensageria (Redis)

O sistema utiliza Redis para caching de dashboards e para o sistema Pub/Sub de eventos em tempo real.

- `REDIS_HOST`: IP ou hostname do servidor Redis.
- `REDIS_PORT`: Porta do servidor Redis (padrão is 6379).
- `REDIS_PASSWORD`: Senha de acesso ao Redis (opcional se local).

## 🎛️ Ajustes de Performance (Opcional)

Estas variáveis permitem tunar o desempenho do sistema dependendo do hardware:

- `PG_POOL_MIN`: (Padrão: 2) Conexões mínimas mantidas no pool.
- `PG_POOL_MAX`: (Padrão: 10) Limite de conexões simultâneas com o banco. Aumente se o Dashboard estiver lento.
- `PG_CONNECTION_TIMEOUT_MS`: (Padrão: 10000) Tempo máximo de espera por uma conexão livre.
- `CACHE_TTL_SECONDS`: (Padrão: 60) Tempo de vida das informações no cache Redis. Dados de branding (logo) usam um cache interno fixo de 5 segundos em memória além deste.

## 📡 Comunicação em Tempo Real

### `NEXT_PUBLIC_WS_URL`
- **Descrição**: URL do servidor WebSockets (WS/WSS) para notificações e atualizações de UI em tempo real (ex: reserva de estoque simultânea).
- **Importância**: O prefixo `NEXT_PUBLIC_` permite que esta variável seja acessada pelo código do lado do cliente (browsers).

---
> [!WARNING]
> Nunca comite seu arquivo `.env` real no controle de versão (Git). Use sempre o `.env.example` como base para novos ambientes.
