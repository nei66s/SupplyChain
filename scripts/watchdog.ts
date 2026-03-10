import 'dotenv/config';
import { query } from '../src/lib/db';
import { sendTelegramMessage } from '../src/lib/telegram';

async function checkHealth() {
    const now = new Date().toLocaleString('pt-BR');

    try {
        // 1. Testar conexão com o banco
        const start = Date.now();
        await query('SELECT 1');
        const dbLatency = Date.now() - start;

        // Se o argumento --report estiver presente, envia relatório completo
        if (process.argv.includes('--report')) {
            const orderCount = await query('SELECT count(*) FROM orders');
            const tenantStats = await query(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN LOWER(status) = 'active' THEN 1 ELSE 0 END) as active,
                    SUM(CASE WHEN LOWER(status) = 'blocked' THEN 1 ELSE 0 END) as blocked
                FROM tenants
            `);

            const stats = tenantStats.rows[0];

            const message =
                `📊 *Relatório Técnico de Gestão*\n` +
                `📅 ${now}\n\n` +
                `🖥️ *Banco de Dados:* Online\n` +
                `⏱️ *Latência:* ${dbLatency}ms\n\n` +
                `🏢 *Tenants (Empresas):*\n` +
                `🔹 Total: ${stats.total}\n` +
                `✅ Ativas: ${stats.active}\n` +
                `🚫 Bloqueadas: ${stats.blocked}\n\n` +
                `📦 *Pedidos Totais:* ${orderCount.rows[0].count}\n\n` +
                `🚀 _Sistema Operacional_`;

            await sendTelegramMessage(message);
            console.log('Relatório enviado ao Telegram.');
        } else {
            console.log(`[${now}] Health Check OK (${dbLatency}ms)`);
        }

    } catch (error: any) {
        const errorMsg = `🚨 *ALERTA: SISTEMA FORA DO AR!*\n\n` +
            `📅 ${now}\n` +
            `❌ *Erro:* ${error.message || 'Falha de conexão com o banco'}\n\n` +
            `⚠️ Verifique o servidor imediatamente.`;

        await sendTelegramMessage(errorMsg);
        console.error(`[${now}] HEALTH CHECK FAILED:`, error.message);
    }

    process.exit(0);
}

checkHealth();
