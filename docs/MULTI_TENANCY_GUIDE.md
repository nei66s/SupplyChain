# 🏢 Guia de Administração Multi-tenant (SaaS)

Este guia explica como gerenciar múltiplas empresas clientes (Tenants) dentro do Inventário Ágil.

## 🛡️ Camada de Isolamento
O sistema utiliza **Row Level Security (RLS)** no PostgreSQL. Isso significa que, a nível de banco de dados, um cliente nunca consegue ver os dados de outro.

### Melhorias de Performance e Robustez
1. **Índices Automáticos**: Todas as tabelas multi-tenant possuem índices na coluna `tenant_id` (Migração 045). Isso é vital para que o banco não precise escanear dados de outras empresas.
2. **Padrão Automático (Fallback)**: Se um desenvolvedor esquecer de passar o `tenant_id` em um comando `INSERT`, o banco de dados tentará recuperá-lo automaticamente da sessão atual (`app.current_tenant_id`). Isso previne erros de constraint nula em ambiente multi-empresa.

## 🚀 Como Criar um Novo Cliente

### Opção 1: Via Linha de Comando (Recomendado para Parceiros)
Para criar uma empresa manualmente através do servidor:

```bash
node scripts/create-tenant.js "Nome da Empresa" "slug-da-empresa" "email@admin.com" "senha-temporaria"
```

O script fará automaticamente:
1. Criar o registro na tabela `tenants`.
2. Inicializar as configurações de site (Logo e Nome) para essa empresa.
3. Criar o primeiro usuário **Admin** com a senha fornecida.

### Opção 2: Via API de Autocadastro
Existe um endpoint público que pode ser conectado a um formulário na Landing Page:
`POST /api/tenants/register`

JSON Body:
```json
{
  "tenantName": "Nome da Empresa",
  "adminEmail": "email@empresa.com",
  "adminPassword": "senha"
}
```

## 🎨 Identidade Visual (Branding)
Cada empresa pode ter seu próprio Logotipo e Nome de Plataforma.
1. O usuário Admin da empresa deve logar.
2. Ir em **Administração > Ajustes**.
3. Alterar o Logo. 

O sistema salvará isso no banco vinculado ao `tenant_id` dele, sem afetar o portal principal ou outros clientes.

---
**Dica:** Para testar o isolamento, crie um "Tenant de Teste", cadastre um material nele, e depois logue com a sua conta principal da "São José Cordas". Você verá que o material de teste não aparece na sua lista.
