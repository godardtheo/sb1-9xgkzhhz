/*
  # Template Exercise Sets Migration

  1. New Table
    - `template_exercise_sets`
      - Stores individual set data for template exercises
      - Tracks rep ranges and order
      - Links to template_exercises table

  2. Security
    - Enable RLS
    - Add policies for authenticated users
    - Ensure proper access control

  3. Data Migration
    - Create new table for set data
    - Set up proper relationships and constraints
*/

-- Create template_exercise_sets table
CREATE TABLE IF NOT EXISTS template_exercise_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_exercise_id uuid REFERENCES template_exercises(id) ON DELETE CASCADE,
  min_reps integer NOT NULL DEFAULT 6,
  max_reps integer NOT NULL DEFAULT 12,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_reps_range CHECK (min_reps > 0 AND max_reps >= min_reps)
);

-- Enable RLS
ALTER TABLE template_exercise_sets ENABLE ROW LEVEL SECURITY;

-- Create policies with safety checks
DO $$ 
BEGIN
  -- View policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'template_exercise_sets' 
    AND policyname = 'Users can view sets from their templates'
  ) THEN
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
  END IF;

  -- Insert policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'template_exercise_sets' 
    AND policyname = 'Users can create sets for their templates'
  ) THEN
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
  END IF;

  -- Update policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'template_exercise_sets' 
    AND policyname = 'Users can update sets from their templates'
  ) THEN
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
  END IF;

  -- Delete policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'template_exercise_sets' 
    AND policyname = 'Users can delete sets from their templates'
  ) THEN
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
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_template_exercise_sets_template_exercise_id 
  ON template_exercise_sets(template_exercise_id);
CREATE INDEX IF NOT EXISTS idx_template_exercise_sets_order 
  ON template_exercise_sets("order");

-- Add updated_at trigger
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_template_exercise_sets_updated_at'
  ) THEN
    CREATE TRIGGER update_template_exercise_sets_updated_at
      BEFORE UPDATE ON template_exercise_sets
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create initial sets for existing template exercises
INSERT INTO template_exercise_sets (
  template_exercise_id,
  min_reps,
  max_reps,
  "order"
)
SELECT 
  id as template_exercise_id,
  6 as min_reps,
  12 as max_reps,
  0 as "order"
FROM template_exercises te
WHERE NOT EXISTS (
  SELECT 1 FROM template_exercise_sets tes 
  WHERE tes.template_exercise_id = te.id
);