/*
  # Update Exercise Table RLS Policies

  1. Changes
    - Add policy to allow authenticated users to insert exercises during sync
    - Maintain existing read-only policy for authenticated users
  
  2. Security
    - Maintains row-level security
    - Adds controlled insert capabilities for authenticated users
*/

-- Enable RLS if not already enabled
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Service role can insert exercises" ON exercises;

-- Create new insert policy for authenticated users
CREATE POLICY "Allow authenticated users to insert exercises"
  ON exercises
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Maintain existing read policy
DROP POLICY IF EXISTS "Everyone can read exercises" ON exercises;
CREATE POLICY "Everyone can read exercises"
  ON exercises
  FOR SELECT
  TO authenticated
  USING (true);