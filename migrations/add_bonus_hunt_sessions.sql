-- Add bonus hunt sessions table to track individual hunts
-- This separates the hunt settings from individual bonuses

CREATE TABLE IF NOT EXISTS bonus_hunt_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Hunt Settings
  hunt_name VARCHAR(200) NOT NULL,
  start_amount NUMERIC(10, 2) DEFAULT 0,
  target_amount NUMERIC(10, 2) DEFAULT 0,
  stop_loss NUMERIC(10, 2) DEFAULT 0,
  
  -- Hunt Status
  status VARCHAR(20) DEFAULT 'building', -- building, saved, opening, completed
  
  -- Calculated Stats (updated as bonuses open)
  total_cost NUMERIC(10, 2) DEFAULT 0,
  total_wins NUMERIC(10, 2) DEFAULT 0,
  total_profit_loss NUMERIC(10, 2) DEFAULT 0,
  bonuses_count INTEGER DEFAULT 0,
  bonuses_opened INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add session reference to bonus_hunt_history
ALTER TABLE bonus_hunt_history 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES bonus_hunt_sessions(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX idx_bonus_hunt_sessions_user ON bonus_hunt_sessions(user_id);
CREATE INDEX idx_bonus_hunt_sessions_status ON bonus_hunt_sessions(status);
CREATE INDEX idx_bonus_hunt_sessions_created ON bonus_hunt_sessions(created_at DESC);
CREATE INDEX idx_bonus_hunt_history_session ON bonus_hunt_history(session_id);

-- Enable RLS
ALTER TABLE bonus_hunt_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bonus_hunt_sessions
CREATE POLICY "users can view own hunt sessions"
  ON bonus_hunt_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users can create own hunt sessions"
  ON bonus_hunt_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update own hunt sessions"
  ON bonus_hunt_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users can delete own hunt sessions"
  ON bonus_hunt_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_bonus_hunt_sessions_updated_at
  BEFORE UPDATE ON bonus_hunt_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update session stats when bonuses are added/updated
CREATE OR REPLACE FUNCTION update_bonus_hunt_session_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update session stats
  UPDATE bonus_hunt_sessions
  SET 
    bonuses_count = (
      SELECT COUNT(*) 
      FROM bonus_hunt_history 
      WHERE session_id = NEW.session_id
    ),
    bonuses_opened = (
      SELECT COUNT(*) 
      FROM bonus_hunt_history 
      WHERE session_id = NEW.session_id AND bonus_win > 0
    ),
    total_cost = (
      SELECT COALESCE(SUM(bonus_cost), 0) 
      FROM bonus_hunt_history 
      WHERE session_id = NEW.session_id
    ),
    total_wins = (
      SELECT COALESCE(SUM(bonus_win), 0) 
      FROM bonus_hunt_history 
      WHERE session_id = NEW.session_id
    ),
    total_profit_loss = (
      SELECT COALESCE(SUM(profit_loss), 0) 
      FROM bonus_hunt_history 
      WHERE session_id = NEW.session_id
    ),
    updated_at = NOW()
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session stats
CREATE TRIGGER update_session_stats_on_bonus_change
  AFTER INSERT OR UPDATE OR DELETE ON bonus_hunt_history
  FOR EACH ROW
  EXECUTE FUNCTION update_bonus_hunt_session_stats();

COMMENT ON TABLE bonus_hunt_sessions IS 'Stores bonus hunt sessions with settings and aggregated stats';
COMMENT ON TABLE bonus_hunt_history IS 'Individual bonuses within hunt sessions';
