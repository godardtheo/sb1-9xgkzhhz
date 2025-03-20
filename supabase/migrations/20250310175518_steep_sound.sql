/*
  # Add ENUM types for muscles and equipment

  1. Changes
    - Create ENUM types for muscles and equipment
    - Modify exercises table to use these ENUMs
    - Migrate existing data to match new ENUMs
    - Add constraints to ensure valid values

  2. New ENUM Types
    - muscle_group: Predefined list of muscle groups
    - equipment_type: Predefined list of exercise equipment

  3. Table Changes
    - exercises.muscle: Changed from text to muscle_group
    - exercises.equipment: Changed from text to equipment_type

  4. Data Migration
    - Existing data is mapped to new ENUM values
    - Invalid data is set to default values
*/

-- Create ENUM types
DO $$ BEGIN
  CREATE TYPE muscle_group AS ENUM (
    'chest',
    'back',
    'shoulders',
    'legs',
    'arms',
    'core',
    'biceps',
    'triceps',
    'forearms',
    'abs',
    'obliques',
    'quads',
    'hamstrings',
    'calves',
    'glutes',
    'full_body'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE equipment_type AS ENUM (
    'barbell',
    'dumbbell',
    'kettlebell',
    'machine',
    'cable',
    'bodyweight',
    'resistance_band',
    'smith_machine',
    'plate',
    'medicine_ball',
    'foam_roller',
    'bench',
    'pull_up_bar',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add temporary columns
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS muscle_enum muscle_group;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS equipment_enum equipment_type;

-- Migrate existing data with CASE statements for precise mapping
UPDATE exercises SET
  muscle_enum = CASE LOWER(muscle)
    WHEN 'chest' THEN 'chest'::muscle_group
    WHEN 'back' THEN 'back'::muscle_group
    WHEN 'shoulders' THEN 'shoulders'::muscle_group
    WHEN 'legs' THEN 'legs'::muscle_group
    WHEN 'arms' THEN 'arms'::muscle_group
    WHEN 'core' THEN 'core'::muscle_group
    WHEN 'biceps' THEN 'biceps'::muscle_group
    WHEN 'triceps' THEN 'triceps'::muscle_group
    WHEN 'forearms' THEN 'forearms'::muscle_group
    WHEN 'abs' THEN 'abs'::muscle_group
    WHEN 'obliques' THEN 'obliques'::muscle_group
    WHEN 'quads' THEN 'quads'::muscle_group
    WHEN 'hamstrings' THEN 'hamstrings'::muscle_group
    WHEN 'calves' THEN 'calves'::muscle_group
    WHEN 'glutes' THEN 'glutes'::muscle_group
    ELSE 'full_body'::muscle_group
  END,
  equipment_enum = CASE LOWER(equipment)
    WHEN 'barbell' THEN 'barbell'::equipment_type
    WHEN 'dumbbell' THEN 'dumbbell'::equipment_type
    WHEN 'kettlebell' THEN 'kettlebell'::equipment_type
    WHEN 'machine' THEN 'machine'::equipment_type
    WHEN 'cable' THEN 'cable'::equipment_type
    WHEN 'bodyweight' THEN 'bodyweight'::equipment_type
    WHEN 'resistance band' THEN 'resistance_band'::equipment_type
    WHEN 'smith machine' THEN 'smith_machine'::equipment_type
    WHEN 'plate' THEN 'plate'::equipment_type
    WHEN 'medicine ball' THEN 'medicine_ball'::equipment_type
    WHEN 'foam roller' THEN 'foam_roller'::equipment_type
    WHEN 'bench' THEN 'bench'::equipment_type
    WHEN 'pull up bar' THEN 'pull_up_bar'::equipment_type
    ELSE 'other'::equipment_type
  END;

-- Set NOT NULL constraints on new columns
ALTER TABLE exercises ALTER COLUMN muscle_enum SET NOT NULL;
ALTER TABLE exercises ALTER COLUMN equipment_enum SET NOT NULL;

-- Drop old columns
ALTER TABLE exercises DROP COLUMN muscle;
ALTER TABLE exercises DROP COLUMN equipment;

-- Rename new columns
ALTER TABLE exercises RENAME COLUMN muscle_enum TO muscle;
ALTER TABLE exercises RENAME COLUMN equipment_enum TO equipment;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_enum ON exercises (muscle);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment_enum ON exercises (equipment);

-- Update RLS policies to work with new types
DROP POLICY IF EXISTS "Everyone can read exercises" ON exercises;
DROP POLICY IF EXISTS "Exercises are viewable by everyone" ON exercises;

CREATE POLICY "Exercises are viewable by everyone"
  ON exercises
  FOR SELECT
  TO public
  USING (true);