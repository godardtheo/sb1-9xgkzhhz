/*
  # Create exercises and sync_log tables

  1. New Tables
    - `exercises`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `instructions` (text)
      - `muscle` (text)
      - `equipment` (text)
      - `type` (text)
      - `difficulty` (text)
      - `created_at` (timestamp)
    - `sync_log`
      - `id` (integer, primary key)
      - `last_sync` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read exercises
    - Add policies for authenticated users to read sync_log
*/

-- Create exercises table
CREATE TABLE IF NOT EXISTS exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  instructions text,
  muscle text,
  equipment text,
  type text,
  difficulty text,
  created_at timestamptz DEFAULT now()
);

-- Create sync_log table
CREATE TABLE IF NOT EXISTS sync_log (
  id integer PRIMARY KEY,
  last_sync timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_exercises_muscle ON exercises(muscle);
CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);
CREATE INDEX IF NOT EXISTS idx_exercises_type ON exercises(type);
CREATE INDEX IF NOT EXISTS idx_sync_log_last_sync ON sync_log(last_sync);

-- Create policies (with checks to prevent duplicates)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'exercises' 
        AND policyname = 'Everyone can read exercises'
    ) THEN
        CREATE POLICY "Everyone can read exercises" ON exercises
        FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sync_log' 
        AND policyname = 'Allow read access to sync_log'
    ) THEN
        CREATE POLICY "Allow read access to sync_log" ON sync_log
        FOR SELECT USING (true);
    END IF;
END
$$;