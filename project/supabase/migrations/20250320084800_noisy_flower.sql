/*
  # Program Workouts Schema Optimization

  1. Changes
    - Add workout_template_id to program_workouts
    - Standardize duration fields to interval type
    - Add proper foreign key constraints
    - Update indexes for performance

  2. Security
    - Maintain existing RLS policies
    - Add new constraints for data integrity

  3. Data Migration
    - Safe migration of existing data
    - Preserve all relationships
*/

-- Add workout_template_id to program_workouts
ALTER TABLE program_workouts 
ADD COLUMN IF NOT EXISTS workout_template_id uuid REFERENCES workout_templates(id) ON DELETE SET NULL;

-- Standardize duration fields
ALTER TABLE workout_templates 
ALTER COLUMN estimated_duration TYPE interval USING estimated_duration::interval;

ALTER TABLE program_workouts
ALTER COLUMN estimated_duration TYPE interval USING estimated_duration::interval;

-- Create index for better join performance
CREATE INDEX IF NOT EXISTS idx_program_workouts_template_id 
ON program_workouts(workout_template_id);

-- Update existing program workouts to link with templates
UPDATE program_workouts pw
SET workout_template_id = wt.id
FROM workout_templates wt
WHERE pw.name = wt.name 
AND pw.workout_template_id IS NULL;

-- Add cascade delete for template relationships
ALTER TABLE template_exercise_sets
DROP CONSTRAINT IF EXISTS template_exercise_sets_template_exercise_id_fkey,
ADD CONSTRAINT template_exercise_sets_template_exercise_id_fkey
  FOREIGN KEY (template_exercise_id)
  REFERENCES template_exercises(id)
  ON DELETE CASCADE;

ALTER TABLE template_exercises
DROP CONSTRAINT IF EXISTS template_exercises_template_id_fkey,
ADD CONSTRAINT template_exercises_template_id_fkey
  FOREIGN KEY (template_id)
  REFERENCES workout_templates(id)
  ON DELETE CASCADE;

-- Add comment for documentation
COMMENT ON COLUMN program_workouts.workout_template_id IS 'Reference to the original workout template';