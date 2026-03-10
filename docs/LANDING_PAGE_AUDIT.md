# 🔍 Auditoria: Landing Page vs. Aplicativo Real

Para manter a integridade e evitar propaganda enganosa, este documento lista o que já está funcionando e o que precisa ser desenvolvido para cumprir as promessas da Landing Page.

---

## ✅ Já é Realidade (Aprovado)
As seguintes funcionalidades já possuem código e lógica implementados no sistema:

1.  **Reserva em Tempo Real:** O sistema já calcula `onHand - reserved = available` e bloqueia estoque em pedidos de saída.
2.  **Picking 100% Digital:** Geração de etiquetas QR Code (`labels.ts`) e fluxos de separação estão operacionais.
3.  **Dashboards de Performance:** O módulo `src/lib/repository/dashboard.ts` já entrega métricas de giro de estoque e status de pedidos.
4.  **IA Preditiva (MVP):** Existe o fluxo Genkit (`suggest-optimal-stock-levels.ts`) para análise de estoque.
5.  **Multi-branding:** O sistema já troca Logo e Nome da empresa dinamicamente via banco de dados.

---

## ⚠️ Realidade Parcial (Em Refinamento)
Temos a base, mas a UX ou a automação ainda precisam de polimento:

1.  **Segurança Enterprise:** Temos logs (`log-activity.ts`), mas a auditoria precisa ser mais visual e acessível ao Admin.
2.  **MRP Automático:** A IA sugere os níveis, mas a criação automática de ordens de compra a partir disso ainda é um processo manual.
3.  **Relatórios Avançados:** Dashboards existem, mas a Curva ABC automática ainda pode ser aprofundada.

---

## ❌ Promessas / Ainda não existem (Prioridade Zero)
Estes itens estão na Landing Page mas NÃO possuem funcionalidade no backend:

1.  **Checkout & Assinatura (Billing):** Não existe integração com cartão de crédito ou gateways (Stripe/Asaas). O valor de R$ 300 é apenas visual.
2.  **App Mobile v2:** O sistema atual é uma Web App responsiva. Um App "Nativo" (Android/iOS) ainda está no roadmap.
3.  **Cloud Hosting Redundante:** O app roda em servidor fixo; a "Escalabilidade Elástica" vendida na landing ainda não é automática.
4.  **Suporte Prioritário Via WhatsApp:** Falta integrar um botão de chat ou canal de atendimento oficial.

---

## 🚀 Plano de Ação Imediato
Para que a Landing Page seja 100% honesta, devemos:
1.  Priorizar o **Módulo de Billing** para que o botão "Começar Agora" funcione de verdade cobrando o usuário, em vez de dar acesso automático no sistema SaaS. (Pendente)
2.  ~~Adicionar um **Botão de WhatsApp** flutuante na Landing para cumprir a promessa de suporte.~~ (Feito)
3.  ~~Ajustar o texto da Landing de "App Mobile" para "Web App Mobile Optimized" até que o nativo saia.~~ (Feito)
