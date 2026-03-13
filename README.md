<div align="center">
  <img src="./public/assets/logo.png" alt="Inventário Ágil Logo" width="200" height="200" />

  # **Inventário Ágil**
  ### *A próxima geração da gestão logística em tempo real.*

  [![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#)
  [![License](https://img.shields.io/badge/license-MIT-blue)](#)
  [![Next.js](https://img.shields.io/badge/framework-Next.js-black)](https://nextjs.org/)
  [![Genkit](https://img.shields.io/badge/AI-Genkit-orange)](https://firebase.google.com/docs/genkit)
</div>

---

## 📋 Sobre o Projeto

O **Inventário Ágil** é um piloto de sistema de WMS (Warehouse Management System) focado em **UX premium** e **regras operacionais em tempo real**. Ele resolve o gap entre a venda e a produção, garantindo que o estoque seja reservado no momento da negociação e que a produção seja acionada automaticamente quando necessário.

> [!IMPORTANT]
> Este projeto utiliza uma arquitetura híbrida (Local-First + Cloud-Ready) para permitir testes rápidos sem depender de infraestrutura complexa de backend na fase piloto.

---

## ✨ Principais Funcionalidades

### 🛒 Gestão de Pedidos & Reservas
- **Reserva Inteligente**: Bloqueio automático de estoque no `onblur` do campo de quantidade.
- **Heartbeat de Reserva**: TTL de 5 minutos com renovação automática durante a edição.
- **Transparência de Estoque**: Visualização clara de `onHand`, `reservedTotal`, `available` e `qtyToProduce`.

### 🏢 Arquitetura Multi-Tenant
- **Isolamento de Dados**: Sistema multi-empresa com RLS (Row Level Security) nativo no banco.
- **Performance Otimizada**: Índices inteligentes por Tenant e cache de duas camadas (L1 Memória / L2 Redis).
- **Painel Super Admin**: Gestão centralizada de tenants, planos e status de ativação.
- **Auto-onboarding**: Fluxo de registro simplificado com criação automática de dados iniciais.

### ⚡ Performance & Escalabilidade
- **Dual-Layer Caching**: Redução drástica de latência de rede com cache local de 5s para dados frequentes.
- **Paralelismo de Dados**: Carregamento ultra-rápido de dashboards via consultas paralelas (`Promise.all`).
- **Zero-Lock Refresh**: Atualização de relatórios em segundo plano (Concurrent Views) sem travar a interface.

### 💳 Assinatura & Faturamento
- **Checkout Integrado**: Integração com Asaas para gestão de subscrições (Cartão/Pix).
- **Planos Dinâmicos**: Controle de acesso baseado em tiers de serviço (Trial, Starter, Pro).

---

## 🚀 Como Rodar o Projeto
...
---

## 🏗 Arquitetura & Stack Tecnológica
...
---

## 🛠 Comandos de Qualidade & Produção
...
---

## 🗺 Roadmap

- [x] **Fase 1: Piloto Operacional** - UX Completa, Reservas locais, Fluxo Picking.
- [x] **Fase 2: Multi-Tenancy & SaaS** - Isolamento de dados, RLS e Painel Administrativo.
- [x] **Fase 3: Faturamento Automático** - Integração Asaas e gestão de assinaturas.
- [ ] **Fase 4: Inteligência Preditiva v2** - Refinamento das heurísticas de MRP via IA.
- [ ] **Fase 5: Mobile App** - App nativo para coletores via Expo/React Native.

---

## 📖 Documentação Detalhada

Explore mais informações sobre o funcionamento interno:

- [🏗 Arquitetura do Sistema](./docs/ARCHITECTURE.md) - Visão técnica e diagramas.
- [🔗 Referência da API](./docs/API.md) - Endpoints e estrutura de dados.
- [🔐 Configuração de Ambiente](./docs/ENVIRONMENT.md) - Guia de variáveis `.env`.
- [💾 Guia de Scripts](./docs/SCRIPTS.md) - Utilitários para dev e ops.
- [🩺 Troubleshooting](./docs/TROUBLESHOOTING.md) - Soluções de problemas comuns.
- [📜 Histórico de Commits](./docs/HISTORY.md) - Registro detalhado de cada code change.
- [🤝 Guia de Contribuição](./docs/CONTRIBUTING.md) - Como participar do projeto.
- [📜 Blueprint Original](./docs/blueprint.md) - Requisitos e regras de negócio.

---

## ⚖️ Licença & Governança

- **Licença**: [MIT](./docs/LICENSE)
- **Segurança**: [docs/SECURITY.md](./docs/SECURITY.md)
- **Histórico**: [docs/CHANGELOG.md](./docs/CHANGELOG.md)

---

<p align="center">
  Desenvolvido com foco em eficiência e experiência do usuário.
</p>
