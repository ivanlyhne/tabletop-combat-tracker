-- Rename monsters table to enemies
ALTER TABLE monsters RENAME TO enemies;

-- Rename the campaign FK index
DROP INDEX IF EXISTS idx_monsters_campaign_id;
CREATE INDEX idx_enemies_campaign_id ON enemies(campaign_id);

-- Rename monster_id FK column in combatants to enemy_id
ALTER TABLE combatants RENAME COLUMN monster_id TO enemy_id;

-- Update existing source_type values from 'MONSTER' to 'ENEMY'
UPDATE combatants SET source_type = 'ENEMY' WHERE source_type = 'MONSTER';
