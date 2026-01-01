-- Add inventory system for The Life game
-- Each player gets their own inventory with items from businesses

-- Create TheLife items table (items specific to The Life game)
CREATE TABLE IF NOT EXISTS the_life_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'consumable', 'special', 'business_reward', etc.
  icon TEXT NOT NULL, -- emoji or URL
  rarity TEXT NOT NULL DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  tradeable BOOLEAN DEFAULT false,
  usable BOOLEAN DEFAULT true,
  effect TEXT, -- JSON string describing what the item does
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create TheLife player inventory (items owned by each player)
CREATE TABLE IF NOT EXISTS the_life_player_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES the_life_players(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES the_life_items(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER DEFAULT 1,
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, item_id)
);

-- Enable RLS
ALTER TABLE the_life_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE the_life_player_inventory ENABLE ROW LEVEL SECURITY;

-- Policies for items (everyone can view)
CREATE POLICY "Anyone can view TheLife items"
  ON the_life_items FOR SELECT
  USING (true);

-- Policies for player inventory
CREATE POLICY "Players can view own inventory"
  ON the_life_player_inventory FOR SELECT
  USING (
    player_id IN (
      SELECT id FROM the_life_players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Players can manage own inventory"
  ON the_life_player_inventory FOR ALL
  USING (
    player_id IN (
      SELECT id FROM the_life_players WHERE user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_thelife_inventory_player ON the_life_player_inventory(player_id);
CREATE INDEX IF NOT EXISTS idx_thelife_inventory_item ON the_life_player_inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_thelife_items_type ON the_life_items(type);

-- Add reward_item_id to businesses table (what item they give)
ALTER TABLE the_life_businesses 
ADD COLUMN IF NOT EXISTS reward_item_id UUID REFERENCES the_life_items(id),
ADD COLUMN IF NOT EXISTS reward_item_quantity INTEGER DEFAULT 1;

-- Insert default items
INSERT INTO the_life_items (name, description, type, icon, rarity, tradeable, usable, effect) VALUES
  ('Jail Free Card', 'Get out of jail instantly, no questions asked', 'special', '🔓', 'legendary', false, true, '{"type": "jail_free"}'),
  ('Cash Stack', 'A bundle of cash from your business', 'business_reward', '💵', 'common', true, false, '{"type": "currency", "value": 1000}'),
  ('Drug Package', 'Sealed package of high-quality product', 'business_reward', '📦', 'rare', true, false, '{"type": "currency", "value": 5000}'),
  ('Luxury Watch', 'Expensive timepiece from jewelry store', 'business_reward', '⌚', 'epic', true, false, '{"type": "currency", "value": 10000}'),
  ('Gold Bar', 'Pure gold from the vault', 'business_reward', '🏅', 'legendary', true, false, '{"type": "currency", "value": 25000}'),
  ('Health Pack', 'Restores 50 HP instantly', 'consumable', '💊', 'rare', true, true, '{"type": "heal", "value": 50}'),
  ('Energy Drink', 'Restores 100 stamina', 'consumable', '🥤', 'common', true, true, '{"type": "stamina", "value": 100}'),
  ('Lucky Charm', 'Increases success rate by 10% for next crime', 'consumable', '🍀', 'epic', false, true, '{"type": "luck_boost", "value": 10}')
ON CONFLICT DO NOTHING;

-- Update existing businesses to give items
-- Get the item IDs first
DO $$
DECLARE
  cash_stack_id UUID;
  drug_package_id UUID;
  luxury_watch_id UUID;
  gold_bar_id UUID;
BEGIN
  -- Get item IDs
  SELECT id INTO cash_stack_id FROM the_life_items WHERE name = 'Cash Stack';
  SELECT id INTO drug_package_id FROM the_life_items WHERE name = 'Drug Package';
  SELECT id INTO luxury_watch_id FROM the_life_items WHERE name = 'Luxury Watch';
  SELECT id INTO gold_bar_id FROM the_life_items WHERE name = 'Gold Bar';

  -- Update businesses with item rewards
  UPDATE the_life_businesses 
  SET reward_item_id = cash_stack_id,
      reward_item_quantity = 2
  WHERE min_level_required = 1;

  UPDATE the_life_businesses 
  SET reward_item_id = drug_package_id,
      reward_item_quantity = 1
  WHERE min_level_required = 5;

  UPDATE the_life_businesses 
  SET reward_item_id = luxury_watch_id,
      reward_item_quantity = 1
  WHERE min_level_required >= 10 AND min_level_required < 20;

  UPDATE the_life_businesses 
  SET reward_item_id = gold_bar_id,
      reward_item_quantity = 1
  WHERE min_level_required >= 20;
END $$;
