import { getClient } from './cache'

/**
 * Publica um evento realtime no canal Redis.
 * Usado para notificar o servidor WebSocket (rodando em outra VPS) sobre
 * alterações de estado no sistema (pedidos, produção, estoque, etc).
 * 
 * @param event Nome do evento (ex: 'ORDER_SUBMITTED', 'PRODUCTION_STARTED')
 * @param payload Dados adicionais do evento
 */
export async function publishRealtimeEvent(event: string, payload?: Record<string, any>) {
    try {
        const client = getClient()
        const message = JSON.stringify({
            event,
            payload,
            timestamp: new Date().toISOString()
        })

        // O canal "inventory-channel" é o que o servidor WS está escutando
        await client.publish('inventory-channel', message)
    } catch (error) {
        // Trata silenciosamente conforme especificado, não quebra a request
        console.warn('[pubsub] Erro ao publicar evento realtime:', error)
    }
}
