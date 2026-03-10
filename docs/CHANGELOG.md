# Registro de Alterações (Changelog)

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo. O formato é baseado no [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), e este projeto adere ao [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-09

### Adicionado
- **Piloto Operacional**: Lançamento inicial da UX completa para Pedidos, Produção, Estoque e Picking.
- **Engine de Reservas**: Implementação de reservas com TTL de 5 minutos e heartbeat.
- **IA (MRP)**: Integração com Genkit/Gemini para sugestões de reposição baseadas em heurísticas.
- **Impressão de Etiquetas**: Suporte a geração de PDF/QR Code para volumes de separação.
- **Autenticação**: Sistema RBAC básico para Admin, Gestor, Vendedor, Operador e Picker.
- **Documentação Profissional**: Novas guias de Arquitetura, API, Scripts e Contribuição.

---

### Versões Anteriores (DRAFT)
- **v0.0.1**: Setup inicial do Next.js + Tailwind + Mock de dados iniciais.
- **v0.0.5**: Implementação do Repository Pattern para desacoplamento de backend.
- **v0.0.9**: Adição das tabelas PostgreSQL para persistência MRP.
