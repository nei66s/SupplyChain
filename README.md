# Inventário Ágil

Piloto de Inventário Ágil com UX completa e regras operacionais simuladas no frontend.

## Escopo

- Sem Firebase/Firestore/Cloud Functions nesta fase.
- Persistencia local via `localStorage`.
- Camadas separadas para futura troca de backend:
  - `src/lib/pilot/contracts.ts`
  - `src/lib/pilot/local-repository.ts`
  - `src/lib/pilot/engine.ts`
  - `src/lib/pilot/store.ts`

## Como rodar

```bash
npm install
npm run dev
```

App em `http://localhost:9002`.

## Fluxo ponta a ponta (demo)

1. Login em `/` e escolha um perfil.
2. Em `Pedidos`:
   - Crie pedido.
   - Adicione itens.
   - Edite `qtyRequested` e saia do campo (blur) para disparar reserva.
   - Veja `onHand`, `reservedTotal`, `available`, `qtyReservedFromStock`, `qtyToProduce`.
3. Em `Producao`:
   - Inicie e conclua tasks pendentes para gerar `receipt DRAFT`.
4. Em `Estoque > Receipts`:
   - Abra DRAFT e clique `Postar (IN)`.
   - Confirme `Auto-alocar?` (Sim/Não).
5. Em `Estoque > Inbox`:
   - Verifique notificacoes de alocacao e alertas.
6. Em `Separacao`:
   - Filtre fila por `READY_FULL`/`READY_PARTIAL`.
   - Informe `qtySeparated`.
   - Conclua picking para gerar baixa OUT simulada e status final.
   - Clique `Imprimir etiquetas` para gerar PDF com QR.
7. Em `Admin`:
   - Use `Reset demo data` para reiniciar o ambiente.

## Comandos de qualidade

```bash
npm run typecheck
npm run lint
npm run build
```

## Observacoes

- Reservas usam TTL de 5 minutos e heartbeat.
- Job client-side limpa reservas expiradas a cada 30s.
- Materiais agora são configurados com o catálogo legacy reduzido. Após aplicar as migrations (`node scripts/run-migrations.js`), execute `node scripts/seed-legacy-materials.js` para carregar os quatro materiais principais com as condições predefinidas e `node scripts/seed-operators.js` para criar os operadores de picking (`@gmail.com` / senha `12345`).
- Etiquetas e QR sao gerados client-side (`jspdf` + `qrcode`).
- Reimpressao e eventos ficam no `auditTrail` do pedido.
- **MRP (Planejamento de Materiais):** o painel `MRP` sugere reposições baseadas em heurísticas (consumo das últimas 4 semanas + lead time do material + estoque disponível) e exige que um gestor confirme cada recomendação antes de transformar em ordem. O `mrp_suggestions` persiste as sugestões com status, justificativa e timestamps, o endpoint `/api/mrp-suggestions` faz upsert protegido por `material_id` único e a interface só habilita “Criar ordem de produção” depois disso. Use `npm run db:migrate` com `PGSSLMODE=disable` (já configurado no `.env`) antes de rodar o módulo para garantir que a tabela esteja atualizada.
