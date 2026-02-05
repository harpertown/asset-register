-- Add exemption type column to track the reason for each version
ALTER TABLE assets ADD COLUMN exemption_type TEXT;

-- Create index for efficient lookups by exemption type
CREATE INDEX IF NOT EXISTS idx_assets_exemption_type ON assets(exemption_type);
