# Guia de Contribuição

Obrigado por seu interesse em contribuir com o **Inventário Ágil**! Este documento descreve as diretrizes para garantir que o seu trabalho seja integrado da melhor forma possível.

## 🚀 Como Começar

1. **Fork o repositório**: Crie uma cópia do projeto em sua conta do GitHub.
2. **Clone localmente**: `git clone https://github.com/seu-usuario/Inventario-Agil.git`
3. **Crie uma branch**: Use um nome descritivo para sua feature ou correção (ex: `feature/nova-venda` ou `fix/erro-reserva`).
4. **Instale as dependências**: `npm install`.

## 🛠 Padrões de Desenvolvimento

### Codificação

- **TypeScript**: Todo o código deve ser tipado. Evite usar `any`.
- **Componentes**: Utilize os componentes de UI baseados em Radix (em `src/components/ui`) sempre que possível para manter a consistência.
- **Estilização**: Use Tailwind CSS seguindo os tokens definidos em `tailwind.config.ts`.

### Mensagens de Commit

Seguimos o padrão de [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` para novas funcionalidades.
- `fix:` para correções de bugs.
- `docs:` para alterações na documentação.
- `style:` para alterações de formatação de código que não afetam a lógica.
- `refactor:` para alterações de código que não corrigem bugs nem adicionam funcionalidades.

## ✅ Garantia de Qualidade

Antes de enviar seu Pull Request, certifique-se de que os seguintes comandos passem sem erros:

```bash
# Verificação de tipos
npm run typecheck

# Linting
npm run lint

# Build de teste
npm run build
```

## 🏗 Fluxo de Backend

O projeto utiliza uma arquitetura pensada para facilitar a troca de backend. Atualmente, partes funcionam via `localStorage` (para o piloto inicial) e outras via API com PostgreSQL/Redis.

- Ao adicionar novos serviços, siga o padrão de contratos em `src/lib/pilot/contracts.ts`.
- Certifique-se de rodar `npm run db:migrate` se houver mudanças no esquema do banco de dados.

## 📬 Enviando Mudanças

1. Faça o `push` da sua branch para o seu fork.
2. Abra um Pull Request para a branch `main`.
3. Descreva detalhadamente o que foi alterado e por que.
4. Aguarde a revisão por um dos mantenedores.

---
Feito com ❤️ pela equipe do **Inventário Ágil**.
