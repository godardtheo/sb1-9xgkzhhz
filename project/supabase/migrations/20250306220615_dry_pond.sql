/*
  # Update exercises table RLS policies

  1. Changes
    - Modify RLS policies for exercises table to allow:
      - Everyone to read exercises
      - Service role to insert exercises
      - No updates or deletes (exercises are read-only once inserted)

  2. Security
    - Enable RLS on exercises table
    - Add policy for authenticated users to read exercises
    - Add policy for service role to insert exercises
    - Exercises are treated as reference data
*/

-- Enable RLS
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Everyone can read exercises" ON exercises;
DROP POLICY IF EXISTS "Service role can insert exercises" ON exercises;

-- Create read policy for authenticated users
CREATE POLICY "Everyone can read exercises"
  ON exercises
  FOR SELECT
  TO authenticated
  USING (true);

-- Create insert policy for service role
CREATE POLICY "Service role can insert exercises"
  ON exercises
  FOR INSERT
  TO service_role
  WITH CHECK (true);