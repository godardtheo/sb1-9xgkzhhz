/*
  # Exercise Table Cleanup and Unique Constraint

  1. Changes
    - Add unique constraint on exercise name
    - Remove duplicate exercises while preserving relationships
    - Update foreign key references to point to the retained exercise records

  2. Security
    - No changes to RLS policies required
    - Existing permissions remain intact

  3. Notes
    - Preserves all workout and template relationships
    - Maintains data integrity during deduplication
*/

-- Create a temporary table to store the canonical exercise IDs
CREATE TEMP TABLE exercise_mapping AS
WITH ranked_exercises AS (
  SELECT 
    id,
    name,
    ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC) as rn
  FROM exercises
)
SELECT 
  id as canonical_id,
  name
FROM ranked_exercises
WHERE rn = 1;

-- Create a temporary table for duplicate IDs
CREATE TEMP TABLE duplicate_exercises AS
SELECT e.id
FROM exercises e
LEFT JOIN exercise_mapping em ON e.name = em.name
WHERE e.id != em.canonical_id;

-- Update workout_exercises foreign keys to point to canonical exercise IDs
UPDATE workout_exercises we
SET exercise_id = em.canonical_id
FROM exercise_mapping em
JOIN exercises e ON e.name = em.name
WHERE we.exercise_id = e.id
AND e.id != em.canonical_id;

-- Update template_exercises foreign keys to point to canonical exercise IDs
UPDATE template_exercises te
SET exercise_id = em.canonical_id
FROM exercise_mapping em
JOIN exercises e ON e.name = em.name
WHERE te.exercise_id = e.id
AND e.id != em.canonical_id;

-- Delete duplicate exercises
DELETE FROM exercises e
WHERE e.id IN (SELECT id FROM duplicate_exercises);

-- Add unique constraint on name
ALTER TABLE exercises ADD CONSTRAINT exercises_name_key UNIQUE (name);

-- Drop temporary tables
DROP TABLE exercise_mapping;
DROP TABLE duplicate_exercises;

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises (name);