#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');

/*
  Script de deploy acionado automaticamente pelo npm `postbuild`.
  Comportamento:
  - Só executa deploy se a variável de ambiente `DEPLOY_ON_BUILD` ou `AUTO_DEPLOY` estiver definida como `1`, `true` ou `yes`.
  - Prioriza `DEPLOY_COMMAND` (comando shell personalizado).
  - Se não houver `DEPLOY_COMMAND`, e existir `VERCEL_TOKEN`, executa `npx vercel --prod`.
  - Se nada estiver configurado, mostra instruções e sai sem erro.

  Uso local (Windows PowerShell):
    $env:DEPLOY_ON_BUILD = '1'; $env:VERCEL_TOKEN = 'seu_token'; npm run build

  Uso local (bash):
    DEPLOY_ON_BUILD=1 VERCEL_TOKEN=seu_token npm run build
*/

function truthy(v) {
  if (!v) return false;
  return ['1', 'true', 'yes'].includes(String(v).toLowerCase());
}

const enabled = truthy(process.env.DEPLOY_ON_BUILD) || truthy(process.env.AUTO_DEPLOY);

if (!enabled) {
  console.log('postbuild-deploy: deploy não acionado. Para habilitar, defina DEPLOY_ON_BUILD=1 ou AUTO_DEPLOY=1.');
  console.log('Para deploy automático com Vercel: set DEPLOY_ON_BUILD=1 e VERCEL_TOKEN.');
  console.log('Ou defina DEPLOY_COMMAND com o comando shell de deploy desejado.');
  process.exit(0);
}

const custom = process.env.DEPLOY_COMMAND;
if (custom) {
  console.log('postbuild-deploy: executando DEPLOY_COMMAND:', custom);
  const r = spawnSync(custom, { stdio: 'inherit', shell: true });
  process.exit(r.status || 0);
}

const vercelToken = process.env.VERCEL_TOKEN || process.env.NPM_CONFIG_VERCEL_TOKEN;
if (vercelToken) {
  console.log('postbuild-deploy: deploy para Vercel usando VERCEL_TOKEN...');
  const cmd = `npx vercel --prod --confirm --token "${vercelToken}"`;
  const r = spawnSync(cmd, { stdio: 'inherit', shell: true });
  if (r.error) {
    console.error('postbuild-deploy: erro ao executar vercel:', r.error);
    process.exit(1);
  }
  process.exit(r.status || 0);
}

console.log('postbuild-deploy: nenhuma estratégia de deploy configurada. Exiting.');
process.exit(0);
