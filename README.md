# Empresa Pilot (Frontend-only)

Piloto de Supply Chain com UX completa e regras operacionais simuladas no frontend.

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
- Etiquetas e QR sao gerados client-side (`jspdf` + `qrcode`).
- Reimpressao e eventos ficam no `auditTrail` do pedido.
