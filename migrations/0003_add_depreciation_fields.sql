-- Add depreciation method and rate columns for accounting and tax purposes
-- Migration: 0003_add_depreciation_fields.sql

ALTER TABLE assets ADD COLUMN depn_method_acc TEXT;
ALTER TABLE assets ADD COLUMN depn_rate_acc TEXT;
ALTER TABLE assets ADD COLUMN depn_method_tax TEXT;
ALTER TABLE assets ADD COLUMN depn_rate_tax TEXT;
