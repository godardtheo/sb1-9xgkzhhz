/*
  # Update template exercises repetition range

  1. Changes
    - Add min_reps and max_reps columns
    - Add constraint to ensure min_reps <= max_reps
    - Migrate existing data
    - Remove old reps column

  2. Data Migration
    - Convert existing reps to a range (reps-2 to reps+2)
    - Ensure data integrity during migration
*/

-- Add new columns with temporary nullable constraint
ALTER TABLE template_exercises 
ADD COLUMN min_reps integer,
ADD COLUMN max_reps integer;

-- Migrate existing data
DO $$ 
BEGIN
  UPDATE template_exercises
  SET 
    min_reps = GREATEST(reps - 2, 1),
    max_reps = reps + 2
  WHERE reps IS NOT NULL;

  -- Set default values for null entries
  UPDATE template_exercises
  SET 
    min_reps = 6,
    max_reps = 12
  WHERE min_reps IS NULL OR max_reps IS NULL;
END $$;

-- Make columns not null now that they have data
ALTER TABLE template_exercises 
ALTER COLUMN min_reps SET NOT NULL,
ALTER COLUMN max_reps SET NOT NULL;

-- Add constraint to ensure min_reps <= max_reps
ALTER TABLE template_exercises 
ADD CONSTRAINT check_reps_range 
CHECK (min_reps <= max_reps AND min_reps > 0);

-- Remove old column
ALTER TABLE template_exercises 
DROP COLUMN reps,
DROP COLUMN weight;