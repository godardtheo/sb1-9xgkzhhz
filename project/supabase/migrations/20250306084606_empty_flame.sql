/*
  # Update exercises table to match API data

  1. Changes to exercises table
    - Add new columns for API data:
      - `type` (text) - Exercise type (e.g., strength, cardio)
      - `difficulty` (text) - Exercise difficulty level
    - Rename existing columns for clarity:
      - `description` -> `instructions`
      - `muscle_group` -> `muscle`

  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS type text,
ADD COLUMN IF NOT EXISTS difficulty text;

-- Update column names (one at a time)
ALTER TABLE exercises 
RENAME COLUMN description TO instructions;

ALTER TABLE exercises 
RENAME COLUMN muscle_group TO muscle;

-- Create indexes for improved search performance
CREATE INDEX IF NOT EXISTS idx_exercises_type ON exercises(type);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle ON exercises(muscle);
CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);