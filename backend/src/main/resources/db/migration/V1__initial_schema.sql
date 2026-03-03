-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    ruleset VARCHAR(100) NOT NULL DEFAULT 'DND_5E',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    character_type VARCHAR(50) NOT NULL DEFAULT 'PC',
    ruleset VARCHAR(100) NOT NULL DEFAULT 'DND_5E',
    initiative_modifier INT NOT NULL DEFAULT 0,
    armor_class INT NOT NULL DEFAULT 10,
    max_hp INT NOT NULL,
    current_hp INT NOT NULL,
    temp_hp INT NOT NULL DEFAULT 0,
    speed INT NOT NULL DEFAULT 30,
    passive_perception INT,
    notes TEXT,
    external_id VARCHAR(255),
    extra_attributes JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE monsters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    ruleset VARCHAR(100) NOT NULL DEFAULT 'DND_5E',
    challenge_rating DECIMAL(5,3),
    xp_value INT,
    armor_class INT NOT NULL DEFAULT 10,
    hp_formula VARCHAR(50),
    hp_average INT NOT NULL,
    speed JSONB NOT NULL DEFAULT '{"walk": 30}',
    saving_throws JSONB NOT NULL DEFAULT '{}',
    skills JSONB NOT NULL DEFAULT '{}',
    damage_resistances TEXT[] NOT NULL DEFAULT '{}',
    damage_immunities TEXT[] NOT NULL DEFAULT '{}',
    damage_vulnerabilities TEXT[] NOT NULL DEFAULT '{}',
    condition_immunities TEXT[] NOT NULL DEFAULT '{}',
    traits JSONB NOT NULL DEFAULT '[]',
    actions JSONB NOT NULL DEFAULT '[]',
    environment_tags TEXT[] NOT NULL DEFAULT '{}',
    external_id VARCHAR(255),
    extra_attributes JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE maps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    background_image_url TEXT,
    width_cells INT NOT NULL DEFAULT 20,
    height_cells INT NOT NULL DEFAULT 20,
    cell_size_px INT NOT NULL DEFAULT 60,
    cell_size_ft INT NOT NULL DEFAULT 5,
    grid_type VARCHAR(20) NOT NULL DEFAULT 'SQUARE',
    grid_color VARCHAR(20) NOT NULL DEFAULT '#cccccc80',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    map_id UUID REFERENCES maps(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    objectives TEXT,
    terrain_notes TEXT,
    loot_notes TEXT,
    ruleset VARCHAR(100) NOT NULL DEFAULT 'DND_5E',
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    current_round INT NOT NULL DEFAULT 0,
    active_combatant_index INT NOT NULL DEFAULT -1,
    initiative_order JSONB NOT NULL DEFAULT '[]',
    environment_tag VARCHAR(100),
    difficulty_target VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE combatants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
    monster_id UUID REFERENCES monsters(id) ON DELETE SET NULL,
    display_name VARCHAR(255) NOT NULL,
    initiative_value INT,
    initiative_modifier INT NOT NULL DEFAULT 0,
    current_hp INT NOT NULL,
    max_hp INT NOT NULL,
    temp_hp INT NOT NULL DEFAULT 0,
    armor_class INT NOT NULL DEFAULT 10,
    is_player_character BOOLEAN NOT NULL DEFAULT FALSE,
    is_visible_to_players BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(50) NOT NULL DEFAULT 'ALIVE',
    conditions JSONB NOT NULL DEFAULT '[]',
    position_x INT,
    position_y INT,
    token_color VARCHAR(20) DEFAULT '#4a90e2',
    token_image_url TEXT,
    stats_override JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    annotation_type VARCHAR(50) NOT NULL,
    label TEXT,
    position JSONB NOT NULL,
    color VARCHAR(20) DEFAULT '#ff6b35',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ai_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'NONE',
    encrypted_api_key TEXT,
    model_name VARCHAR(255),
    max_tokens INT NOT NULL DEFAULT 4096,
    temperature DECIMAL(3,2) NOT NULL DEFAULT 0.70,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_characters_campaign_id ON characters(campaign_id);
CREATE INDEX idx_monsters_campaign_id ON monsters(campaign_id);
CREATE INDEX idx_encounters_campaign_id ON encounters(campaign_id);
CREATE INDEX idx_combatants_encounter_id ON combatants(encounter_id);
CREATE INDEX idx_annotations_encounter_id ON annotations(encounter_id);
