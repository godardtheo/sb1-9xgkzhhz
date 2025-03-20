/*
  # Update RLS policies for workout templates

  1. Security Changes
    - Enable RLS on workout_templates table if not already enabled
    - Add or update policies for CRUD operations
    - Ensure users can only access their own workout templates

  2. Changes
    - Enable RLS (if not enabled)
    - Add or update policies for:
      - Creating templates (authenticated users only)
      - Reading own templates
      - Updating own templates
      - Deleting own templates
*/

-- Enable RLS if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'workout_templates' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist and recreate them
DO $$ 
BEGIN
  -- Create policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workout_templates' 
    AND policyname = 'Users can create their own templates'
  ) THEN
    CREATE POLICY "Users can create their own templates"
    ON workout_templates
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;

  -- View policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workout_templates' 
    AND policyname = 'Users can view their own templates'
  ) THEN
    CREATE POLICY "Users can view their own templates"
    ON workout_templates
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;

  -- Update policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workout_templates' 
    AND policyname = 'Users can update their own templates'
  ) THEN
    CREATE POLICY "Users can update their own templates"
    ON workout_templates
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Delete policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workout_templates' 
    AND policyname = 'Users can delete their own templates'
  ) THEN
    CREATE POLICY "Users can delete their own templates"
    ON workout_templates
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;