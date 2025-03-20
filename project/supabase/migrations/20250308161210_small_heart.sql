/*
  # Training Programs Schema

  1. New Tables
    - `programs`
      - `id` (uuid, primary key): Unique identifier for the program
      - `user_id` (uuid): Reference to the user who created the program
      - `name` (text): Program name
      - `description` (text): Program description
      - `weekly_workouts` (integer): Number of workouts per week (1-7)
      - `is_active` (boolean): Whether the program is currently active
      - `created_at` (timestamptz): Creation timestamp
      - `updated_at` (timestamptz): Last modification timestamp

    - `program_workouts`
      - `id` (uuid, primary key): Unique identifier for the program workout
      - `program_id` (uuid): Reference to the program
      - `name` (text): Template name
      - `description` (text): Template description
      - `target_muscles` (text[]): Array of target muscle groups
      - `estimated_duration` (interval): Estimated workout duration
      - `week_day` (integer): Day of the week (1-7)
      - `order` (integer): Order in the program
      - `created_at` (timestamptz): Creation timestamp
      - `updated_at` (timestamptz): Last modification timestamp

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own programs
    - Add policies for authenticated users to manage their program workouts

  3. Constraints
    - Foreign key constraints to ensure referential integrity
    - Check constraints for valid weekly_workouts range
    - Check constraints for valid week_day range
*/

-- Create programs table
CREATE TABLE IF NOT EXISTS programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  weekly_workouts integer NOT NULL CHECK (weekly_workouts BETWEEN 1 AND 7),
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create program_workouts table
CREATE TABLE IF NOT EXISTS program_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES programs(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  target_muscles text[] DEFAULT '{}',
  estimated_duration interval DEFAULT '01:00:00',
  week_day integer CHECK (week_day BETWEEN 1 AND 7),
  "order" integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_workouts ENABLE ROW LEVEL SECURITY;

-- Programs policies
CREATE POLICY "Users can create their own programs"
  ON programs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own programs"
  ON programs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own programs"
  ON programs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own programs"
  ON programs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Program workouts policies
CREATE POLICY "Users can create workouts for their programs"
  ON program_workouts
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM programs
    WHERE programs.id = program_workouts.program_id
    AND programs.user_id = auth.uid()
  ));

CREATE POLICY "Users can view workouts from their programs"
  ON program_workouts
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM programs
    WHERE programs.id = program_workouts.program_id
    AND programs.user_id = auth.uid()
  ));

CREATE POLICY "Users can update workouts from their programs"
  ON program_workouts
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM programs
    WHERE programs.id = program_workouts.program_id
    AND programs.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM programs
    WHERE programs.id = program_workouts.program_id
    AND programs.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete workouts from their programs"
  ON program_workouts
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM programs
    WHERE programs.id = program_workouts.program_id
    AND programs.user_id = auth.uid()
  ));

-- Create indexes for better query performance
CREATE INDEX idx_programs_user_id ON programs(user_id);
CREATE INDEX idx_program_workouts_program_id ON program_workouts(program_id);
CREATE INDEX idx_programs_is_active ON programs(is_active);

-- Add triggers to update the updated_at timestamp
CREATE TRIGGER update_programs_updated_at
  BEFORE UPDATE ON programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_program_workouts_updated_at
  BEFORE UPDATE ON program_workouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();