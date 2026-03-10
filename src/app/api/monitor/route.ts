import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendTelegramMessage } from '@/lib/telegram';

/**
 * API para Vercel Cron Jobs
 * Esta rota será chamada pelo Vercel para monitorar o sistema.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'check'; // 'check' ou 'report'

    // Segurança: Verifica o token da Vercel Cron via Header de Autorização
    if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const now = new Date().toLocaleString('pt-BR');

    try {
        if (type === 'report') {
            // Lógica de Relatório Técnico (Foco em Banco e Tenants)
            const start = Date.now();
            await query('SELECT 1');
            const dbLatency = Date.now() - start;

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
                `☁️ _Monitoramento Vercel Cloud_`;

            await sendTelegramMessage(message);
            return NextResponse.json({ success: true, type: 'report', sent: true });
        } else {
            // Lógica de Health Check (padrão)
            await query('SELECT 1');
            return NextResponse.json({ success: true, type: 'check', status: 'online' });
        }
    } catch (error: any) {
        const errorMsg = `🚨 *ALERTA VERCEL: SISTEMA FORA DO AR!*\n\n` +
            `📅 ${now}\n` +
            `❌ *Erro:* ${error.message || 'Falha de conexão com o banco'}\n\n` +
            `⚠️ Verifique a conexão do banco na Vercel.`;

        await sendTelegramMessage(errorMsg);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
