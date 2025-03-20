/*
  # Template Exercise Sets Structure

  1. Changes
    - Create template_exercise_sets table for storing individual set data
    - Add foreign key relationships and cascading deletes
    - Add appropriate indexes and constraints
    - Add RLS policies for security

  2. Security
    - Enable RLS on new table
    - Add policies for authenticated users to manage their sets
    - Ensure proper access control through template ownership

  3. Data Migration
    - Preserve existing set data during migration
    - Handle the transition smoothly without data loss
*/

-- Create template_exercise_sets table
CREATE TABLE IF NOT EXISTS template_exercise_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_exercise_id uuid REFERENCES template_exercises(id) ON DELETE CASCADE,
  min_reps integer NOT NULL,
  max_reps integer NOT NULL,
  "order" integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_reps_range CHECK (min_reps > 0 AND max_reps >= min_reps)
);

-- Enable RLS
ALTER TABLE template_exercise_sets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view sets from their templates"
  ON template_exercise_sets
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM template_exercises te
    JOIN workout_templates wt ON wt.id = te.template_id
    WHERE te.id = template_exercise_sets.template_exercise_id
    AND wt.user_id = auth.uid()
  ));

CREATE POLICY "Users can create sets for their templates"
  ON template_exercise_sets
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM template_exercises te
    JOIN workout_templates wt ON wt.id = te.template_id
    WHERE te.id = template_exercise_sets.template_exercise_id
    AND wt.user_id = auth.uid()
  ));

CREATE POLICY "Users can update sets from their templates"
  ON template_exercise_sets
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM template_exercises te
    JOIN workout_templates wt ON wt.id = te.template_id
    WHERE te.id = template_exercise_sets.template_exercise_id
    AND wt.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete sets from their templates"
  ON template_exercise_sets
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM template_exercises te
    JOIN workout_templates wt ON wt.id = te.template_id
    WHERE te.id = template_exercise_sets.template_exercise_id
    AND wt.user_id = auth.uid()
  ));

-- Create indexes
CREATE INDEX idx_template_exercise_sets_template_exercise_id 
  ON template_exercise_sets(template_exercise_id);
CREATE INDEX idx_template_exercise_sets_order 
  ON template_exercise_sets("order");

-- Add updated_at trigger
CREATE TRIGGER update_template_exercise_sets_updated_at
  BEFORE UPDATE ON template_exercise_sets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing data
INSERT INTO template_exercise_sets (
  template_exercise_id,
  min_reps,
  max_reps,
  "order"
)
SELECT 
  id as template_exercise_id,
  min_reps,
  max_reps,
  0 as "order"
FROM template_exercises
WHERE min_reps IS NOT NULL AND max_reps IS NOT NULL;

-- Remove old columns from template_exercises
ALTER TABLE template_exercises
  DROP COLUMN IF EXISTS min_reps,
  DROP COLUMN IF EXISTS max_reps;