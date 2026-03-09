import { query } from './db'

export type ActivityAction =
    | 'ORDER_CREATED'
    | 'PICK_COMPLETED'
    | 'PRODUCTION_STARTED'
    | 'PRODUCTION_COMPLETED'
    | 'SEPARATION_DONE'

export type ActivityEntity = 'order' | 'production_task' | 'pick'

export async function logActivity(
    userId: string,
    actionType: ActivityAction,
    entityType: ActivityEntity,
    entityId?: number | null,
    qty?: number | null,
    weight?: number | null,
    durationSeconds?: number | null,
): Promise<void> {
    try {
        await query(
            `INSERT INTO people_activity_log (user_id, action_type, entity_type, entity_id, qty, weight, duration_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [userId, actionType, entityType, entityId ?? null, qty ?? null, weight ?? null, durationSeconds ?? null],
        )
    } catch (error) {
        // Never fail the main operation because of logging
        console.error('[logActivity] failed to log activity', error)
    }
}
