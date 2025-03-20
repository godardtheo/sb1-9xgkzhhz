/*
  # Add Exercise Categories and Variations

  1. New Tables
    - `exercise_categories`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text)
      - `created_at` (timestamp)
    
    - `exercise_variations`
      - `id` (uuid, primary key)
      - `exercise_id` (uuid, references exercises)
      - `variation_id` (uuid, references exercises)
      - `description` (text)
      - `created_at` (timestamp)

  2. Changes
    - Add category_id to exercises table
    - Add is_variation to exercises table

  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Create exercise categories table
CREATE TABLE IF NOT EXISTS exercise_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Add categories to exercises
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES exercise_categories(id);
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS is_variation boolean DEFAULT false;

-- Create exercise variations table
CREATE TABLE IF NOT EXISTS exercise_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid REFERENCES exercises(id) ON DELETE CASCADE,
  variation_id uuid REFERENCES exercises(id) ON DELETE CASCADE,
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(exercise_id, variation_id)
);

-- Enable RLS
ALTER TABLE exercise_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_variations ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Exercise categories are viewable by everyone" 
  ON exercise_categories
  FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Exercise variations are viewable by everyone" 
  ON exercise_variations
  FOR SELECT 
  TO public 
  USING (true);