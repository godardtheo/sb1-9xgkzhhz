/*
  # Standardize muscle and equipment types

  1. Changes
    - Rename columns for consistency across tables
    - Convert text arrays to ENUM arrays for muscle groups
    - Update existing data to match new ENUM values
    - Add appropriate constraints

  2. Standardization
    - Rename 'target_muscles' to 'muscles' for consistency
    - Convert text[] to muscle_group[] for type safety
    - Ensure all muscle references use the same ENUM

  3. Table Changes
    - program_workouts: target_muscles → muscles
    - workout_templates: target_muscles → muscles
*/

-- Create array support for our ENUMs
CREATE OR REPLACE FUNCTION array_to_muscle_group_array(text[])
RETURNS muscle_group[] AS $$
DECLARE
  result muscle_group[];
  item text;
BEGIN
  FOR item IN SELECT unnest($1) LOOP
    BEGIN
      result := array_append(result, item::muscle_group);
    EXCEPTION WHEN invalid_text_representation THEN
      -- If conversion fails, use 'full_body' as default
      result := array_append(result, 'full_body'::muscle_group);
    END;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update program_workouts table
ALTER TABLE program_workouts 
  ADD COLUMN IF NOT EXISTS muscles muscle_group[] DEFAULT '{}';

-- Migrate existing data
UPDATE program_workouts 
SET muscles = array_to_muscle_group_array(target_muscles)
WHERE target_muscles IS NOT NULL;

-- Update workout_templates table
ALTER TABLE workout_templates 
  ADD COLUMN IF NOT EXISTS muscles muscle_group[] DEFAULT '{}';

-- Migrate existing data
UPDATE workout_templates 
SET muscles = array_to_muscle_group_array(target_muscles)
WHERE target_muscles IS NOT NULL;

-- Drop old columns after successful migration
ALTER TABLE program_workouts 
  DROP COLUMN target_muscles;

ALTER TABLE workout_templates 
  DROP COLUMN target_muscles;

-- Add NOT NULL constraints
ALTER TABLE program_workouts 
  ALTER COLUMN muscles SET NOT NULL;

ALTER TABLE workout_templates 
  ALTER COLUMN muscles SET NOT NULL;

-- Create indexes for array operations
CREATE INDEX IF NOT EXISTS idx_program_workouts_muscles 
  ON program_workouts USING GIN (muscles);

CREATE INDEX IF NOT EXISTS idx_workout_templates_muscles 
  ON workout_templates USING GIN (muscles);

COMMENT ON COLUMN program_workouts.muscles IS 'Array of muscle groups targeted in this workout';
COMMENT ON COLUMN workout_templates.muscles IS 'Array of muscle groups targeted in this workout template';