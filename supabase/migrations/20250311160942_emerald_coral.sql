/*
  # Add Progress Tracking Features

  1. New Tables
    - `personal_records`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `exercise_id` (uuid, references exercises)
      - `weight` (numeric)
      - `reps` (integer)
      - `achieved_at` (timestamp)
      - `notes` (text)
      - `created_at` (timestamp)

    - `exercise_goals`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `exercise_id` (uuid, references exercises)
      - `target_weight` (numeric)
      - `target_reps` (integer)
      - `target_date` (date)
      - `achieved` (boolean)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on new tables
    - Add policies for authenticated users to manage their records and goals
*/

-- Create personal records table
CREATE TABLE IF NOT EXISTS personal_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercises(id) ON DELETE CASCADE,
  weight numeric NOT NULL,
  reps integer NOT NULL,
  achieved_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create exercise goals table
CREATE TABLE IF NOT EXISTS exercise_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercises(id) ON DELETE CASCADE,
  target_weight numeric NOT NULL,
  target_reps integer NOT NULL,
  target_date date NOT NULL,
  achieved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_goals ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for personal records
CREATE POLICY "Users can view their own records"
  ON personal_records
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own records"
  ON personal_records
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own records"
  ON personal_records
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own records"
  ON personal_records
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add RLS policies for exercise goals
CREATE POLICY "Users can view their own goals"
  ON exercise_goals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
  ON exercise_goals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON exercise_goals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON exercise_goals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);