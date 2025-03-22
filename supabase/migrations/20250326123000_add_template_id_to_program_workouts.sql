/*
  # Add template_id to program_workouts table

  1. Changes
    - Add template_id column to program_workouts table
    - Add foreign key constraint with ON DELETE CASCADE
    - Create index for improved performance

  2. Problem being fixed
    - The table was missing the template_id column used for referencing workout templates
*/

-- Add the template_id column if it doesn't exist
ALTER TABLE program_workouts 
ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES workout_templates(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_program_workouts_template_id 
ON program_workouts(template_id);