-- Add versioning columns to assets table
ALTER TABLE assets ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE assets ADD COLUMN parent_asset_id TEXT;
ALTER TABLE assets ADD COLUMN effective_from TEXT;

-- Create index for efficient version lookups
CREATE INDEX IF NOT EXISTS idx_assets_parent_asset_id ON assets(parent_asset_id);
