-- Add exemption note for versioned asset changes
ALTER TABLE assets ADD COLUMN exemption_note TEXT;
