-- Add active flag to bonus hunt sessions
-- Only one hunt can be active at a time for widget display

ALTER TABLE bonus_hunt_sessions 
ADD COLUMN IF NOT EXISTS is_active_for_display BOOLEAN DEFAULT FALSE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_bonus_hunt_sessions_active ON bonus_hunt_sessions(user_id, is_active_for_display) WHERE is_active_for_display = true;

-- Add comment
COMMENT ON COLUMN bonus_hunt_sessions.is_active_for_display IS 'Flag to mark which hunt should be displayed in overlay widgets. Only one hunt per user should be active at a time.';
