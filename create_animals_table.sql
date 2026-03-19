-- Create the animals table in Supabase
-- This schema matches the Animal interface in the application

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS animals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT DEFAULT 'INDIVIDUAL', -- INDIVIDUAL or GROUP
    parent_mob_id UUID, -- For groups/mobs
    census_count INTEGER, -- For groups
    name TEXT NOT NULL,
    species TEXT NOT NULL,
    latin_name TEXT,
    category TEXT NOT NULL, -- OWLS, RAPTORS, MAMMALS, etc.
    location TEXT NOT NULL,
    image_url TEXT,
    hazard_rating TEXT DEFAULT 'LOW', -- LOW, MEDIUM, HIGH
    is_venomous BOOLEAN DEFAULT FALSE,
    weight_unit TEXT DEFAULT 'g', -- g, oz, lbs_oz, kg
    dob DATE,
    is_dob_unknown BOOLEAN DEFAULT FALSE,
    sex TEXT, -- Male, Female, Unknown
    microchip_id TEXT,
    disposition_status TEXT DEFAULT 'Active', -- Active, Transferred, Deceased, Missing, Stolen
    origin_location TEXT,
    destination_location TEXT,
    transfer_date DATE,
    ring_number TEXT,
    has_no_id BOOLEAN DEFAULT FALSE,
    red_list_status TEXT, -- Conservation status (NE, DD, LC, etc.)
    description TEXT,
    special_requirements TEXT,
    critical_husbandry_notes JSONB DEFAULT '[]'::jsonb,
    target_day_temp_c NUMERIC,
    target_night_temp_c NUMERIC,
    target_humidity_min_percent NUMERIC,
    target_humidity_max_percent NUMERIC,
    misting_frequency TEXT,
    acquisition_date DATE,
    origin TEXT,
    sire_id UUID,
    dam_id UUID,
    flying_weight_g NUMERIC,
    winter_weight_g NUMERIC,
    display_order INTEGER,
    archived BOOLEAN DEFAULT FALSE,
    archive_reason TEXT,
    archived_at TIMESTAMPTZ,
    archive_type TEXT, -- Disposition, Death, Euthanasia, Missing, Stolen
    is_quarantine BOOLEAN DEFAULT FALSE,
    distribution_map_url TEXT,
    water_tipping_temp NUMERIC,
    acquisition_type TEXT, -- BORN, TRANSFERRED_IN, RESCUE, UNKNOWN
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the archived_animals table with the same structure
CREATE TABLE IF NOT EXISTS archived_animals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT DEFAULT 'INDIVIDUAL',
    parent_mob_id UUID,
    census_count INTEGER,
    name TEXT NOT NULL,
    species TEXT NOT NULL,
    latin_name TEXT,
    category TEXT NOT NULL,
    location TEXT NOT NULL,
    image_url TEXT,
    hazard_rating TEXT DEFAULT 'LOW',
    is_venomous BOOLEAN DEFAULT FALSE,
    weight_unit TEXT DEFAULT 'g',
    dob DATE,
    is_dob_unknown BOOLEAN DEFAULT FALSE,
    sex TEXT,
    microchip_id TEXT,
    disposition_status TEXT DEFAULT 'Active',
    origin_location TEXT,
    destination_location TEXT,
    transfer_date DATE,
    ring_number TEXT,
    has_no_id BOOLEAN DEFAULT FALSE,
    red_list_status TEXT,
    description TEXT,
    special_requirements TEXT,
    critical_husbandry_notes JSONB DEFAULT '[]'::jsonb,
    target_day_temp_c NUMERIC,
    target_night_temp_c NUMERIC,
    target_humidity_min_percent NUMERIC,
    target_humidity_max_percent NUMERIC,
    misting_frequency TEXT,
    acquisition_date DATE,
    origin TEXT,
    sire_id UUID,
    dam_id UUID,
    flying_weight_g NUMERIC,
    winter_weight_g NUMERIC,
    display_order INTEGER,
    archived BOOLEAN DEFAULT FALSE,
    archive_reason TEXT,
    archived_at TIMESTAMPTZ,
    archive_type TEXT,
    is_quarantine BOOLEAN DEFAULT FALSE,
    distribution_map_url TEXT,
    water_tipping_temp NUMERIC,
    acquisition_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_animals ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
-- Note: These are basic policies. You might want to restrict access based on roles in the future.
CREATE POLICY "Enable all access for authenticated users" ON animals FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON archived_animals FOR ALL TO authenticated USING (true);

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_animals_updated_at BEFORE UPDATE ON animals FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_archived_animals_updated_at BEFORE UPDATE ON archived_animals FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Optional: Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_animals_category ON animals(category);
CREATE INDEX IF NOT EXISTS idx_animals_location ON animals(location);
CREATE INDEX IF NOT EXISTS idx_animals_archived ON animals(archived);
CREATE INDEX IF NOT EXISTS idx_archived_animals_category ON archived_animals(category);
