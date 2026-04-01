# Guia de Contribuicao

Obrigado por contribuir com o Inventario Agil.

## Como comecar

1. Faça um fork do repositorio.
2. Clone o projeto localmente.
3. Crie uma branch descritiva, como `feature/nova-tela` ou `fix/reserva-duplicada`.
4. Instale as dependencias com `npm install`.

## Padroes de desenvolvimento

- Escreva codigo em TypeScript e evite `any`.
- Reaproveite os componentes de `src/components/ui` quando fizer sentido.
- Mantenha o estilo alinhado ao Tailwind e aos componentes ja existentes.
- Em alteracoes de banco, adicione migration e rode `npm run db:migrate`.

## Commits

Use Conventional Commits sempre que possivel:

- `feat:` para nova funcionalidade
- `fix:` para correcao de bug
- `docs:` para documentacao
- `refactor:` para refatoracao sem mudanca funcional
- `test:` para testes
- `chore:` para manutencao

## Checklist antes do PR

Rode estes comandos antes de abrir um pull request:

```bash
npm run lint
npm run typecheck
npm run build
```

Se voce alterou fluxo de interface ou operacao critica, rode tambem:

```bash
npm run test:e2e
```

## Enviando mudancas

1. Faça push da sua branch.
2. Abra o pull request para `main`.
3. Explique o contexto, o risco e como validar.
4. Inclua screenshots quando houver mudanca visual relevante.
