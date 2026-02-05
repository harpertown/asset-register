-- Add version_id as unique identifier for each version row
-- Add asset_guid as persistent identifier that stays same across versions
ALTER TABLE assets ADD COLUMN version_id TEXT;
ALTER TABLE assets ADD COLUMN asset_guid TEXT;

-- For existing assets, set version_id = id and asset_guid = id 
-- (first versions have matching values, id is their asset identity)
UPDATE assets SET version_id = id, asset_guid = id WHERE version_id IS NULL;

-- Create index for efficient lookups by asset_guid
CREATE INDEX IF NOT EXISTS idx_assets_asset_guid ON assets(asset_guid);
CREATE INDEX IF NOT EXISTS idx_assets_version_id ON assets(version_id);
