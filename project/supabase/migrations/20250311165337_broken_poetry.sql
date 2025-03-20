/*
  # Update RLS policies for template exercises

  1. Security Changes
    - Enable RLS on template_exercises table if not already enabled
    - Add or update policies for CRUD operations
    - Ensure users can only access exercises from their own templates

  2. Changes
    - Enable RLS (if not enabled)
    - Add or update policies for:
      - Creating exercises (authenticated users only)
      - Reading exercises from own templates
      - Updating exercises in own templates
      - Deleting exercises from own templates
*/

-- Enable RLS if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'template_exercises' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE template_exercises ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist and recreate them
DO $$ 
BEGIN
  -- Create policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'template_exercises' 
    AND policyname = 'Users can create exercises for their templates'
  ) THEN
    CREATE POLICY "Users can create exercises for their templates"
    ON template_exercises
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM workout_templates
        WHERE id = template_exercises.template_id
        AND user_id = auth.uid()
      )
    );
  END IF;

  -- View policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'template_exercises' 
    AND policyname = 'Users can view exercises from their templates'
  ) THEN
    CREATE POLICY "Users can view exercises from their templates"
    ON template_exercises
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM workout_templates
        WHERE id = template_exercises.template_id
        AND user_id = auth.uid()
      )
    );
  END IF;

  -- Update policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'template_exercises' 
    AND policyname = 'Users can update exercises from their templates'
  ) THEN
    CREATE POLICY "Users can update exercises from their templates"
    ON template_exercises
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM workout_templates
        WHERE id = template_exercises.template_id
        AND user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM workout_templates
        WHERE id = template_exercises.template_id
        AND user_id = auth.uid()
      )
    );
  END IF;

  -- Delete policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'template_exercises' 
    AND policyname = 'Users can delete exercises from their templates'
  ) THEN
    CREATE POLICY "Users can delete exercises from their templates"
    ON template_exercises
    FOR DELETE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM workout_templates
        WHERE id = template_exercises.template_id
        AND user_id = auth.uid()
      )
    );
  END IF;
END $$;