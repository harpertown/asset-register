-- Add record_date and effective_date columns to assets table
-- Migration: 0002_add_asset_fields.sql

ALTER TABLE assets ADD COLUMN record_date TEXT;
ALTER TABLE assets ADD COLUMN effective_date TEXT;

-- Migrate existing purchase_date to record_date
UPDATE assets SET record_date = purchase_date WHERE record_date IS NULL AND purchase_date IS NOT NULL;
