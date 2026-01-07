
CREATE TABLE IF NOT EXISTS pending_participants (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    suggested_group TEXT,
    suggested_gender TEXT,
    suggested_category TEXT,
    status TEXT DEFAULT 'pending',
    attendance_ref_ids UUID[],
    birth_place TEXT,
    birth_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- If table already exists, add columns if they are missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pending_participants' AND column_name = 'birth_place') THEN
        ALTER TABLE pending_participants ADD COLUMN birth_place TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pending_participants' AND column_name = 'birth_date') THEN
        ALTER TABLE pending_participants ADD COLUMN birth_date DATE;
    END IF;
END $$;
