-- Registers table
CREATE TABLE IF NOT EXISTS registers (
    id TEXT PRIMARY KEY,
    address TEXT NOT NULL,
    site_plan TEXT,
    owns_land INTEGER DEFAULT 0,
    owns_buildings INTEGER DEFAULT 0,
    wizard_completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Asset groups (rooms) table
CREATE TABLE IF NOT EXISTS asset_groups (
    id TEXT PRIMARY KEY,
    register_id TEXT NOT NULL,
    name TEXT NOT NULL,
    tool TEXT,
    color TEXT,
    start_x REAL,
    start_y REAL,
    end_x REAL,
    end_y REAL,
    path TEXT,
    is_whole_site INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (register_id) REFERENCES registers(id) ON DELETE CASCADE
);

-- Assets table
CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    asset_group_id TEXT NOT NULL,
    asset_id TEXT,
    item_type TEXT,
    name TEXT NOT NULL,
    serial_number TEXT,
    purchase_price REAL DEFAULT 0,
    purchase_date TEXT,
    photo TEXT,
    incomplete INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (asset_group_id) REFERENCES asset_groups(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_asset_groups_register_id ON asset_groups(register_id);
CREATE INDEX IF NOT EXISTS idx_assets_asset_group_id ON assets(asset_group_id);
CREATE INDEX IF NOT EXISTS idx_assets_incomplete ON assets(incomplete);
