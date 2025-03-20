/*
  # Update exercises table policies

  1. Changes
    - Add new RLS policies for exercises table
    - Enable service role bypass for admin operations
    - Add policy for authenticated users to read exercises

  2. Security
    - Enable RLS on exercises table
    - Add policy for public read access
    - Add policy for service role insert access
*/

-- Enable RLS on exercises table
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Allow public read access to exercises
CREATE POLICY "Exercises are viewable by everyone"
  ON exercises
  FOR SELECT
  TO public
  USING (true);

-- Allow service role to insert exercises
CREATE POLICY "Service role can insert exercises"
  ON exercises
  FOR INSERT
  TO service_role
  WITH CHECK (true);