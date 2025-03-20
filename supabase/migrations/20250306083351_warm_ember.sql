/*
  # Add sync log table for exercise database

  1. New Tables
    - `sync_log` table for tracking API synchronization
      - `id` (integer, primary key)
      - `last_sync` (timestamp with time zone)
      - `created_at` (timestamp with time zone)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS sync_log (
    id integer PRIMARY KEY,
    last_sync timestamptz NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access to sync_log"
    ON sync_log
    FOR SELECT
    TO authenticated
    USING (true);

-- Create index
CREATE INDEX IF NOT EXISTS idx_sync_log_last_sync ON sync_log(last_sync);