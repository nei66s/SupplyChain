import 'dotenv/config';
import { query } from '../src/lib/db';
import { sendTelegramMessage } from '../src/lib/telegram';

/**
 * Lógica de Saúde (Health Check)
 * Verifica se o banco responde. Se falhar, manda alerta.
 */
async function performHealthCheck() {
    const now = new Date().toLocaleString('pt-BR');
    try {
        await query('SELECT 1');
        console.log(`[${now}] Health Check: OK`);
    } catch (error: any) {
        const errorMsg = `🚨 *ALERTA: SISTEMA FORA DO AR!*\n\n` +
            `📅 ${now}\n` +
            `❌ *Erro:* ${error.message || 'Falha de conexão com o banco'}\n\n` +
            `⚠️ Verifique o servidor imediatamente.`;
        await sendTelegramMessage(errorMsg);
        console.error(`[${now}] HEALTH CHECK FAILED:`, error.message);
    }
}

/**
 * Lógica de Relatório
 * Coleta indicadores e envia pro Telegram.
 */
async function sendDailyReport() {
    const now = new Date().toLocaleString('pt-BR');
    try {
        const userCount = await query('SELECT count(*) FROM users');
        const orderCount = await query('SELECT count(*) FROM orders');
        const tenantCount = await query('SELECT count(*) FROM tenants');

        const message =
            `📊 *Relatório Diário Automatizado*\n` +
            `📅 ${now}\n\n` +
            `✅ *Sistemas:* Online\n\n` +
            `👥 *Usuários:* ${userCount.rows[0].count}\n` +
            `📦 *Pedidos:* ${orderCount.rows[0].count}\n` +
            `🏢 *Tenants:* ${tenantCount.rows[0].count}\n\n` +
            `🚀 _Monitoramento Ativo_`;

        await sendTelegramMessage(message);
        console.log(`[${now}] Relatório enviado ao Telegram.`);
    } catch (error: any) {
        console.error('Erro ao gerar relatório:', error);
    }
}

// Configurações
const FIVE_MINUTES = 5 * 60 * 1000;
let lastReportDate = '';

console.log('--- SERVIÇO DE MONITORAMENTO INICIADO ---');

// Execução imediata no boot
performHealthCheck();

// Loop de Verificação (A cada 5 minutos)
setInterval(async () => {
    await performHealthCheck();

    // Lógica para Relatório Diário (ex: às 09:00 da manhã)
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const hour = now.getHours();

    // Se for 9h da manhã e ainda não enviou hoje
    if (hour === 9 && lastReportDate !== today) {
        await sendDailyReport();
        lastReportDate = today;
    }
}, FIVE_MINUTES);
