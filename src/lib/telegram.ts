/**
 * Utilitário para envio de mensagens via Telegram Bot API
 */

export async function sendTelegramMessage(message: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatIdsEnv = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatIdsEnv) {
        console.warn('[Telegram] Token ou Chat ID não configurados.');
        return;
    }

    const chatIds = chatIdsEnv.split(',').map((id) => id.trim());
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    for (const chatId of chatIds) {
        if (!chatId) continue;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'Markdown',
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                console.error(`[Telegram] Erro ao enviar mensagem para ${chatId}:`, error);
            }
        } catch (err) {
            console.error(`[Telegram] Erro de rede para ${chatId}:`, err);
        }
    }
}
