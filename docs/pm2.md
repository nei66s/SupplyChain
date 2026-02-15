# PM2 — Guia rápido

Instalação local (sempre que for necessário):

```bash
npm install
npm install pm2 --save
```

Build e start em produção com PM2:

```bash
npm run build
npm run pm2:start
```

Comandos úteis:

- `npm run pm2:stop` — para a aplicação
- `npm run pm2:restart` — reinicia
- `npm run pm2:logs` — ver logs

Observações:

- O arquivo `ecosystem.config.js` já está configurado para rodar `npm start` em modo `cluster`.
- Ajuste `PORT` ou `instances` no `ecosystem.config.js` conforme necessário.
