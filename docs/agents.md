Objetivo
Definir regras, escopo, padrões técnicos e comportamento esperado dos agentes GPT utilizados neste repositório, garantindo consistência, segurança, rastreabilidade e qualidade das entregas.

Escopo do agente

O agente GPT deve:

- Auxiliar na geração de código, documentação técnica e scripts alinhados ao contexto do projeto.
- Sugerir melhorias arquiteturais com justificativa técnica.
- Resolver problemas técnicos priorizando soluções simples e iterativas.
- Gerar queries SQL parametrizadas, endpoints de API, integrações e validações seguras.
- Produzir documentação funcional e técnica acessível e atualizada.
- Manter consistência com os padrões definidos neste documento e adaptar-se às decisões já tomadas.

O agente GPT NÃO deve:

- Alterar decisões arquiteturais sem justificativa técnica documentada e aprovada.
- Introduzir dependências externas não autorizadas ou desnecessárias.
- Expor credenciais, segredos ou variáveis sensíveis.
- Gerar código que viole as convenções ou padrões do projeto.

Padrões técnicos

Stack sugerida:

- Frontend: Next.js, React, TypeScript e TailwindCSS quando aplicável.
- Mobile: React Native (Expo) quando houver módulo mobile.
- Backend: Node.js, PostgreSQL e Prisma (ou ORM especificado pelo projeto).
- Infraestrutura: VPS/Linux, Vercel ou Render; Docker quando justificável.

Recomendações de implementação:

- Respeitar tipagem estrita (evitar ny).
- Seguir boas práticas de Clean Code e SOLID.
- Escrever código modular, reutilizável e facilmente testável.
- Preferir soluções simples; evitar abstrações prematuras ou overengineering.

Convenções de código:

- Variáveis: camelCase
- Componentes React: PascalCase
- Arquivos de componente: PascalCase.tsx
- Hooks: useNomeDoHook.ts
- Funções utilitárias: nomeFuncao.ts
- Constantes globais: UPPER_SNAKE_CASE
- Manter a estrutura existente sem criar pastas desnecessárias (ex.: /src, /components, /hooks, /services, /lib, /utils, /types).

Segurança

O agente deve:

- Nunca inserir credenciais hardcoded; usar variáveis de ambiente.
- Validar entradas no servidor quando aplicável.
- Aplicar o princípio do menor privilégio.
- Evitar SQL injection usando queries parametrizadas/prepared statements.
- Alertar sobre riscos técnicos e propor alternativas seguras quando a solicitação for insegura.

Banco de dados

Padrões:

- Sempre usar migrations para mudanças de schema.
- Nunca alterar schema diretamente em produção sem migração.
- Nominar tabelas e colunas em snake_case.
- Chave primária padrão: id (UUID).
- Campos obrigatórios de auditoria: created_at e updated_at.

O agente deve:

- Fornecer scripts SQL seguros e parametrizados.
- Propor índices quando o desempenho justificar.
- Justificar adição de novas tabelas ou colunas.
- Evitar consultas não performáticas e sugerir paginação quando necessário.

Documentação

Sempre que gerar artefatos:

- APIs: incluir exemplos de request e response.
- Funções críticas: comentar e explicar a lógica.
- Scripts: indicar pré-requisitos e como executar.
- Integrações externas: documentar fluxo, campos necessários e ambientes (DEV/QAS/PRD).

Padrões para respostas do agente

- Respostas devem ser técnicas, objetivas e alinhadas ao contexto.
- Explicar o raciocínio em decisões arquiteturais, mencionando riscos e trade-offs.
- Incluir código pronto para uso, com comentários quando necessário.
- Evitar suposições não declaradas e explicitar limitações ou áreas pendentes.
- Em caso de ambiguidade, solicitar esclarecimentos antes de propor soluções complexas.

Performance e monitoramento

- Evitar algoritmos desnecessariamente ineficientes.
- Sugerir paginação, limites e cache quando apropriado.
- Aplicar memoização quando fizer sentido.
- Minimizar re-renderizações no React e indicar otimizações de render.
- Ao sugerir mudanças no backend, incluir tratamento de erros, logs estruturados (sem dados sensíveis) e códigos HTTP apropriados.

Testes

- Sempre que possível, gerar testes unitários e, quando aplicável, de integração.
- Sugerir cenários e casos de borda relevantes.
- Validar comportamentos para inputs inválidos.

Decisões arquiteturais

- Avaliar impacto antes de propor mudanças estruturais.
- Justificar tecnicamente a alteração e sugerir alternativas incrementais.
- Comunicar riscos e trade-offs.
- Preferir soluções incrementais ao invés de refatorações grandes sem justificativa.

Consciência e contexto

- Considerar decisões anteriores e manter consistência com padrões já adotados.
- Documentar integrações com SAP/ERP ou sistemas legados, incluindo BAPI, campos obrigatórios e ambiente envolvido.
- Quando houver impacto contábil ou financeiro, sinalizar para revisão especializada.

Estrutura recomendada para respostas (quando aplicável)

1. Diagnóstico
2. Solução proposta
3. Código/Exemplo
4. Observações técnicas
5. Próximos passos
