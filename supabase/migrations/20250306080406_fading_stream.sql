/*
  # Add sets table and user preferences

  1. Changes to Users Table
    - Add language preference (default 'en')
    - Add weight unit preference (default 'kg')

  2. New Tables
    - `sets` table for detailed set tracking
      - `id` (uuid, primary key)
      - `workout_exercise_id` (uuid, foreign key)
      - `rep_count` (integer)
      - `weight` (numeric)
      - `completed_at` (timestamp)
      - `set_order` (integer)
      - `notes` (text)
      - `previous_performance` (text)

  3. Security
    - Enable RLS on new table
    - Add policies for authenticated users
*/

-- Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';
ALTER TABLE users ADD COLUMN IF NOT EXISTS weight_unit text NOT NULL DEFAULT 'kg';

-- Create sets table
CREATE TABLE IF NOT EXISTS sets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_exercise_id uuid REFERENCES workout_exercises(id) ON DELETE CASCADE,
    rep_count integer NOT NULL,
    weight numeric NOT NULL,
    completed_at timestamptz DEFAULT now(),
    set_order integer NOT NULL,
    notes text,
    previous_performance text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;

-- Create policies for sets table
CREATE POLICY "Users can read own sets"
    ON sets
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workout_exercises we
            JOIN workouts w ON w.id = we.workout_id
            WHERE we.id = sets.workout_exercise_id
            AND w.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own sets"
    ON sets
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workout_exercises we
            JOIN workouts w ON w.id = we.workout_id
            WHERE we.id = workout_exercise_id
            AND w.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own sets"
    ON sets
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workout_exercises we
            JOIN workouts w ON w.id = we.workout_id
            WHERE we.id = sets.workout_exercise_id
            AND w.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workout_exercises we
            JOIN workouts w ON w.id = we.workout_id
            WHERE we.id = workout_exercise_id
            AND w.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own sets"
    ON sets
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workout_exercises we
            JOIN workouts w ON w.id = we.workout_id
            WHERE we.id = sets.workout_exercise_id
            AND w.user_id = auth.uid()
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for sets table
CREATE TRIGGER update_sets_updated_at
    BEFORE UPDATE ON sets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_sets_workout_exercise_id ON sets(workout_exercise_id);
CREATE INDEX IF NOT EXISTS idx_sets_completed_at ON sets(completed_at);