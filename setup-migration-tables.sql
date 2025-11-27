-- Migration Setup Tables
-- Run this in Supabase SQL Editor before running the migration script

-- Table to track migration progress and errors
CREATE TABLE IF NOT EXISTS migration_log (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'user', 'post', 'product', 'follow', etc.
  status TEXT NOT NULL, -- 'success', 'failed', 'skipped'
  old_id TEXT, -- ID from old Sngine database
  new_id UUID, -- ID in new Supabase database
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to map old IDs to new IDs for maintaining relationships
CREATE TABLE IF NOT EXISTS migration_id_map (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'user', 'post', 'product', etc.
  old_id TEXT NOT NULL, -- ID from old Sngine database
  new_id UUID NOT NULL, -- ID in new Supabase database
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(entity_type, old_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_migration_log_entity_type ON migration_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_migration_log_status ON migration_log(status);
CREATE INDEX IF NOT EXISTS idx_migration_id_map_entity_old ON migration_id_map(entity_type, old_id);
CREATE INDEX IF NOT EXISTS idx_migration_id_map_entity_new ON migration_id_map(entity_type, new_id);

-- Add video, feeling, and location columns to posts table (if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'post_type'
  ) THEN
    ALTER TABLE posts ADD COLUMN post_type TEXT DEFAULT 'text';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'video_url'
  ) THEN
    ALTER TABLE posts ADD COLUMN video_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'feeling'
  ) THEN
    ALTER TABLE posts ADD COLUMN feeling TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'location'
  ) THEN
    ALTER TABLE posts ADD COLUMN location TEXT;
  END IF;
END $$;

-- Grant necessary permissions
GRANT ALL ON migration_log TO authenticated;
GRANT ALL ON migration_id_map TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE migration_log_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE migration_id_map_id_seq TO authenticated;
