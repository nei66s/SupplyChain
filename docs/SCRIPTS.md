# Utilitários e Scripts de Automação

O projeto conta com diversos scripts em `node.js` para facilitar a manutenção, o seed de dados e o troubleshooting do sistema.

## 💾 Banco de Dados & Migrations

| Script | Descrição |
| :--- | :--- |
| `run-migrations.js` | Executa as migrações SQL no PostgreSQL conforme definido em `/migrations`. |
| `clear-db.js` | Limpa todas as tabelas do banco de dados (CUIDADO: Use apenas em dev). |
| `test-db.js` | Testa a conectividade com o PostgreSQL configurado no `.env`. |

## 🌱 Seed de Dados (População Inicial)

Estes scripts são fundamentais para rodar o projeto pela primeira vez ou após um reset.

- `seed-legacy-materials.js`: Carrega o catálogo de materiais padrão com suas configurações de produção.
- `seed-operators.js`: Cria os usuários/operadores padrão no sistema.
- `seed-stock.js`: Inicializa os saldos de estoque para os materiais.
- `import-cadastros.js`: Script legado para importação em massa de cadastros.
- `import-legacy-variations.js` e `import-legacy-excel-history.js`: importam dados legados a partir de arquivos em `data/raw/export_app` (cadastros e relatórios exportados).

## 🏭 Produção & MRP

| Script | Descrição |
| :--- | :--- |
| `list-mrp-production-tasks.js` | Lista todas as tarefas de produção vinculadas ao MRP. |
| `update-mrp-status.js` | Utilitário para forçar a atualização de status de sugestões MRP. |
| `check-mrp-items.js` | Verifica a consistência entre itens de pedido e sugestões MRP. |
| `find-production-qtys.js` | Localiza as quantidades pendentes de produção por material. |

## 🛠 Troubleshooting & Operações Rápidas

- `add-admin-gmail.js`: Adiciona privilégios administrativos para um e-mail específico.
- `patch_task.js`: Corrige manualmente uma tarefa de produção específica.
- `test_production_flow.js`: Simula um fluxo de produção de ponta a ponta para teste de integração.
- `run-speed-insights-dashboard.js`: Gera um dashboard de performance e insights (Lighthouse style).

## 🚀 Build & Deployment

- `clean-build.js`: Limpa as pastas `.next` e `out` para um build limpo.
- `postbuild-deploy.js`: Script executado após o build para preparar o ambiente de produção.

---
Para rodar qualquer um destes scripts, utilize:
```bash
node scripts/nome-do-script.js
```
*Certifique-se de que as variáveis de ambiente (.env) estão configuradas corretamente.*
