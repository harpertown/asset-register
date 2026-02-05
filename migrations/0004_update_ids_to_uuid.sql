-- Migration to update existing IDs to proper UUIDs
-- Uses table recreation approach to avoid foreign key constraint issues

-- Step 1: Create new tables with same schema
CREATE TABLE registers_new (
    id TEXT PRIMARY KEY,
    address TEXT NOT NULL,
    site_plan TEXT,
    owns_land INTEGER DEFAULT 0,
    owns_buildings INTEGER DEFAULT 0,
    wizard_completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE asset_groups_new (
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
    FOREIGN KEY (register_id) REFERENCES registers_new(id) ON DELETE CASCADE
);

CREATE TABLE assets_new (
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
    depn_method_acc TEXT,
    depn_rate_acc TEXT,
    depn_method_tax TEXT,
    depn_rate_tax TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (asset_group_id) REFERENCES asset_groups_new(id) ON DELETE CASCADE
);

-- Step 2: Create ID mapping tables
CREATE TABLE _reg_map (old_id TEXT PRIMARY KEY, new_id TEXT);
CREATE TABLE _grp_map (old_id TEXT PRIMARY KEY, new_id TEXT);
CREATE TABLE _ast_map (old_id TEXT PRIMARY KEY, new_id TEXT);

-- Step 3: Generate mappings - use existing ID if already UUID format, otherwise generate new
INSERT INTO _reg_map (old_id, new_id)
SELECT id, 
    CASE WHEN id GLOB '????????-????-????-????-????????????' AND length(id) = 36 
    THEN id 
    ELSE lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))
    END
FROM registers;

INSERT INTO _grp_map (old_id, new_id)
SELECT id,
    CASE WHEN id GLOB '????????-????-????-????-????????????' AND length(id) = 36
    THEN id
    ELSE lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))
    END
FROM asset_groups;

INSERT INTO _ast_map (old_id, new_id)
SELECT id,
    CASE WHEN id GLOB '????????-????-????-????-????????????' AND length(id) = 36
    THEN id
    ELSE lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))
    END
FROM assets;

-- Step 4: Copy data with new IDs
INSERT INTO registers_new (id, address, site_plan, owns_land, owns_buildings, wizard_completed, created_at, updated_at)
SELECT m.new_id, r.address, r.site_plan, r.owns_land, r.owns_buildings, r.wizard_completed, r.created_at, r.updated_at
FROM registers r
JOIN _reg_map m ON r.id = m.old_id;

INSERT INTO asset_groups_new (id, register_id, name, tool, color, start_x, start_y, end_x, end_y, path, is_whole_site, created_at, updated_at)
SELECT gm.new_id, rm.new_id, g.name, g.tool, g.color, g.start_x, g.start_y, g.end_x, g.end_y, g.path, g.is_whole_site, g.created_at, g.updated_at
FROM asset_groups g
JOIN _grp_map gm ON g.id = gm.old_id
JOIN _reg_map rm ON g.register_id = rm.old_id;

INSERT INTO assets_new (id, asset_group_id, asset_id, item_type, name, serial_number, purchase_price, purchase_date, photo, incomplete, depn_method_acc, depn_rate_acc, depn_method_tax, depn_rate_tax, created_at, updated_at)
SELECT am.new_id, gm.new_id, a.asset_id, a.item_type, a.name, a.serial_number, a.purchase_price, a.purchase_date, a.photo, a.incomplete, a.depn_method_acc, a.depn_rate_acc, a.depn_method_tax, a.depn_rate_tax, a.created_at, a.updated_at
FROM assets a
JOIN _ast_map am ON a.id = am.old_id
JOIN _grp_map gm ON a.asset_group_id = gm.old_id;

-- Step 5: Drop old tables
DROP TABLE assets;
DROP TABLE asset_groups;
DROP TABLE registers;

-- Step 6: Rename new tables
ALTER TABLE registers_new RENAME TO registers;
ALTER TABLE asset_groups_new RENAME TO asset_groups;
ALTER TABLE assets_new RENAME TO assets;

-- Step 7: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_asset_groups_register_id ON asset_groups(register_id);
CREATE INDEX IF NOT EXISTS idx_assets_asset_group_id ON assets(asset_group_id);
CREATE INDEX IF NOT EXISTS idx_assets_incomplete ON assets(incomplete);

-- Step 8: Cleanup mapping tables
DROP TABLE _reg_map;
DROP TABLE _grp_map;
DROP TABLE _ast_map;
