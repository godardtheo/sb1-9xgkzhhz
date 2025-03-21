/*
  # Cleanup Program Workouts Schema

  1. Standardize Template Reference Columns
    - Handle case where both template_id and workout_template_id exist
    - Consolidate references into template_id column
    - Add proper foreign key constraints

  2. Fix Exercise References
    - Cleanup orphaned exercise references
    - Ensure proper constraints and indexes
*/

-- Start a transaction to ensure all changes happen together or not at all
BEGIN;

-- 1. Diagnostic queries to see the current state
DO $$ 
BEGIN
  RAISE NOTICE 'Checking program_workouts table structure and data...';
END $$;

-- 2. Check template_id and workout_template_id columns
DO $$ 
DECLARE
  template_id_count INTEGER := 0;
  workout_template_id_count INTEGER := 0;
  template_id_exists BOOLEAN;
  workout_template_id_exists BOOLEAN;
BEGIN
  -- Check if columns exist
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'program_workouts' AND column_name = 'template_id'
  ) INTO template_id_exists;
  
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'program_workouts' AND column_name = 'workout_template_id'
  ) INTO workout_template_id_exists;
  
  RAISE NOTICE 'template_id exists: %', template_id_exists;
  RAISE NOTICE 'workout_template_id exists: %', workout_template_id_exists;
  
  -- If both columns exist, consolidate data into template_id
  IF template_id_exists AND workout_template_id_exists THEN
    -- Count non-null values in each column
    SELECT COUNT(*) INTO template_id_count FROM program_workouts WHERE template_id IS NOT NULL;
    SELECT COUNT(*) INTO workout_template_id_count FROM program_workouts WHERE workout_template_id IS NOT NULL;
    
    RAISE NOTICE 'template_id non-null count: %', template_id_count;
    RAISE NOTICE 'workout_template_id non-null count: %', workout_template_id_count;
    
    -- Copy data from workout_template_id to template_id where template_id is null
    UPDATE program_workouts 
    SET template_id = workout_template_id 
    WHERE template_id IS NULL AND workout_template_id IS NOT NULL;
    
    RAISE NOTICE 'Consolidated data from workout_template_id to template_id';
    
    -- Now it's safe to drop the workout_template_id column (we'll do this at the end)
  ELSIF workout_template_id_exists THEN
    -- Only workout_template_id exists, rename it to template_id
    ALTER TABLE program_workouts RENAME COLUMN workout_template_id TO template_id;
    RAISE NOTICE 'Only workout_template_id exists, renamed to template_id';
  ELSIF NOT template_id_exists THEN
    -- Neither column exists, create template_id
    ALTER TABLE program_workouts ADD COLUMN template_id UUID;
    RAISE NOTICE 'Neither column exists, created template_id';
  END IF;
END $$;

-- 3. Clean up orphaned references in program_workouts
DO $$ 
BEGIN
  RAISE NOTICE 'Cleaning up orphaned references in program_workouts...';
END $$;

DELETE FROM program_workouts
WHERE template_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM workout_templates 
    WHERE workout_templates.id = program_workouts.template_id
  );

-- 4. Ensure proper foreign key constraint on template_id
DO $$ 
DECLARE
  constraint_name text;
BEGIN
  -- Identify existing constraint if any
  SELECT conname INTO constraint_name
  FROM pg_constraint 
  WHERE conrelid = 'program_workouts'::regclass 
  AND conname LIKE '%template_id%';

  -- Drop existing constraint if it exists
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE program_workouts DROP CONSTRAINT ' || constraint_name;
    RAISE NOTICE 'Dropped existing constraint: %', constraint_name;
  END IF;
  
  -- Add proper foreign key constraint with ON DELETE CASCADE
  ALTER TABLE program_workouts 
  ADD CONSTRAINT program_workouts_template_id_fkey 
  FOREIGN KEY (template_id) 
  REFERENCES workout_templates(id) 
  ON DELETE CASCADE;
  
  RAISE NOTICE 'Added proper foreign key constraint with ON DELETE CASCADE';
END $$;

-- 5. Clean up orphaned exercise references
DO $$ 
BEGIN
  RAISE NOTICE 'Cleaning up orphaned exercise references...';
END $$;

DELETE FROM template_exercises
WHERE template_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM workout_templates 
    WHERE workout_templates.id = template_exercises.template_id
  );

-- 6. Ensure proper indexes
DO $$ 
BEGIN
  RAISE NOTICE 'Creating necessary indexes...';
END $$;

CREATE INDEX IF NOT EXISTS idx_program_workouts_template_id 
  ON program_workouts(template_id);
CREATE INDEX IF NOT EXISTS idx_program_workouts_program_id_order 
  ON program_workouts(program_id, "order");
CREATE INDEX IF NOT EXISTS idx_template_exercises_template_id 
  ON template_exercises(template_id);

-- 7. Finally, drop the workout_template_id column if it exists
DO $$ 
DECLARE
  workout_template_id_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'program_workouts' AND column_name = 'workout_template_id'
  ) INTO workout_template_id_exists;
  
  IF workout_template_id_exists THEN
    ALTER TABLE program_workouts DROP COLUMN workout_template_id;
    RAISE NOTICE 'Dropped redundant workout_template_id column';
  END IF;
END $$;

-- Commit the transaction
COMMIT;

-- Analyze tables to update statistics for query planner
ANALYZE program_workouts;
ANALYZE template_exercises;
ANALYZE workout_templates;