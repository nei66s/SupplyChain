-- People activity log for tracking user actions and computing people indicators
BEGIN;

CREATE TABLE IF NOT EXISTS people_activity_log (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,          -- ORDER_CREATED, PICK_COMPLETED, PRODUCTION_STARTED, PRODUCTION_COMPLETED, SEPARATION_DONE
  entity_type TEXT NOT NULL,          -- order, production_task, pick
  entity_id INTEGER,
  qty NUMERIC(12,4),
  weight NUMERIC(12,4),
  duration_seconds INTEGER,           -- time to complete the action (for SLA)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pal_user_id ON people_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_pal_action_type ON people_activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_pal_created_at ON people_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_pal_user_action_date ON people_activity_log(user_id, action_type, created_at);

COMMIT;
