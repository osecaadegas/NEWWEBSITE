-- Add default image URLs to existing crimes
-- Run this after add_image_urls_to_game_tables.sql

UPDATE the_life_robberies 
SET image_url = 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400'
WHERE name = 'Pickpocket' AND (image_url IS NULL OR image_url = '');

UPDATE the_life_robberies 
SET image_url = 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400'
WHERE name = 'Car Theft' AND (image_url IS NULL OR image_url = '');

UPDATE the_life_robberies 
SET image_url = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400'
WHERE name = 'House Burglary' AND (image_url IS NULL OR image_url = '');

UPDATE the_life_robberies 
SET image_url = 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400'
WHERE name = 'Convenience Store' AND (image_url IS NULL OR image_url = '');

UPDATE the_life_robberies 
SET image_url = 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=400'
WHERE name = 'Bank Heist' AND (image_url IS NULL OR image_url = '');

UPDATE the_life_robberies 
SET image_url = 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=400'
WHERE name = 'Casino Vault' AND (image_url IS NULL OR image_url = '');

-- Verify the updates
SELECT name, image_url FROM the_life_robberies ORDER BY min_level_required;
