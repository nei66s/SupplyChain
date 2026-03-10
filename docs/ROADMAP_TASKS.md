# 🎯 Roadmap de Implementação: Inventário Ágil SaaS

Este documento detalha as tarefas necessárias para transformar as promessas do roadmap em realidade técnica na plataforma **Black Tower X**.

---

## 🚨 Prioridade Zero: Consistência da Landing Page
*Objetivo: Integrar as funcionalidades prometidas no marketing que ainda não existem no sistema operacional.*

- [x] **Interface de Suporte Real**
  - [x] Integrar botão de WhatsApp flutuante na página principal.
  - [x] Configurar roteamento de suporte para o time da Black Tower X.
- [x] **Infraestrutura Escalável**
  - [x] Migrar para um setup multitenant via RLS (Row-Level Security)
  - [x] Criar formulário de self-service onboarding.
- [ ] **Módulo de Faturamento / Billing (MVP)**
  - [ ] Desenvolver a lógica de ativação de conta ativa e gerir bloqueios via sistema de pagamentos ou ativação manual do admin.

---

## 🏗️ Fase 1: Módulo de Billing & Assinaturas (Em Breve)
*Objetivo: Permitir a monetização automática e gestão de planos.*

- [ ] **Integração com Gateway de Pagamento (Stripe/Asaas/Pagar.me)**
  - [ ] Implementar Webhooks para processamento de pagamentos.
  - [ ] Criar sincronização de status de assinatura no banco de dados.
- [ ] **Interface de Gestão de Assinatura (Admin/Billing)**
  - [ ] Tela para o cliente visualizar fatura e trocar de plano.
  - [ ] Logica de bloqueio de acesso em caso de inadimplência.
- [ ] **Upgrade de Infraestrutura para Multi-tenancy**
  - [ ] Garantir isolamento total de dados entre diferentes empresas na mesma base (Row-Level Security).

## 📱 Fase 2: App Mobile v2 (Próximo Trimestre)
*Objetivo: Experiência nativa offline para o chão de fábrica.*

- [ ] **Desenvolvimento em React Native ou Flutter**
  - [ ] Sincronização offline-first (banco local SQLite).
  - [ ] Integração com câmera do celular para leitura ultra-rápida de QR Codes.
- [ ] **Módulo de Notificações Push**
  - [ ] Alertas de "Pedido Urgente" direto no celular do Separador/Picker.

## 🔌 Fase 3: API Pública de Integração (Próximo Trimestre)
*Objetivo: Permitir que o cliente conecte o Inventário Ágil ao seu ERP.*

- [ ] **Documentação Swagger/OpenAPI**
  - [ ] Endpoints para Inserção de Pedidos e Consulta de Saldo de Estoque.
- [ ] **Gestão de API Keys**
  - [ ] Painel para o Admin gerar e revogar tokens de acesso.

---

## 🧠 Fase 4: Inteligência Avançada (Planejado)
*Pesquisa e Desenvolvimento de Longo Prazo.*

- [ ] **Otimização de Rotas (Logística Externa)**
  - [ ] Integração com Google Maps API / Mapbox para roteirização.
  - [ ] Algoritmo de IA para agrupamento de entregas por região.
- [ ] **Visão Computacional no Checkout**
  - [ ] Implementação de YOLO ou similares para detecção de objetos via webcam.
  - [ ] Validação automática de "Itens vs Pedido" na expedição.
- [ ] **Digital Twin (Gêmeo Digital)**
  - [ ] Renderização 3D do mapa do armazém usando Three.js baseado no cadastro de localizações.
  - [ ] Heatmap de movimentação (quais corredores são mais acessados).

---

## 🛠️ Manutenção Institucional
- [ ] **Páginas Jurídicas:** Revisar placeholder dos Termos de Uso por um advogado.
- [ ] **Certificações:** Iniciar processo de auditoria para selos de segurança (ISO/SOC2).
