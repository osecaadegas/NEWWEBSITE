-- Add worker slots system to brothels
-- Base slots = level + 2 (Level 1 = 3 slots, Level 2 = 4 slots, etc.)
-- Players can buy additional slots at level 5+

ALTER TABLE the_life_brothels 
ADD COLUMN IF NOT EXISTS worker_slots INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS additional_slots INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS slots_upgrade_cost INTEGER DEFAULT 10000;

-- Update existing brothels to have slots based on player level
-- This will set initial slots for existing players
UPDATE the_life_brothels b
SET worker_slots = COALESCE(
  (SELECT p.level + 2 FROM the_life_players p WHERE p.id = b.player_id),
  3
)
WHERE worker_slots = 3;
