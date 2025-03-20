/*
  # Add ON DELETE CASCADE to Program Workouts

  1. Changes
    - Add ON DELETE CASCADE to program_workouts.workout_template_id
    - Ensures program workouts are automatically removed when their template is deleted
    - Maintains data integrity and prevents orphaned records

  2. Security
    - Maintains existing RLS policies
    - No changes to access control required
*/

-- Add ON DELETE CASCADE to program_workouts.workout_template_id
ALTER TABLE program_workouts 
DROP CONSTRAINT IF EXISTS program_workouts_workout_template_id_fkey,
ADD CONSTRAINT program_workouts_workout_template_id_fkey 
  FOREIGN KEY (workout_template_id) 
  REFERENCES workout_templates(id) 
  ON DELETE CASCADE;