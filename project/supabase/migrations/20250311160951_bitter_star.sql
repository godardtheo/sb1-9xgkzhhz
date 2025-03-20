/*
  # Optimize Program and Template Structure

  1. Changes
    - Add program_template table to replace redundant program/template structure
    - Add linking table for program instances
    - Add workout scheduling improvements

  2. New Tables
    - `program_templates`
      - Combines features of programs and workout templates
      - Adds scheduling and progression features
    
    - `program_instances`
      - Links users to program templates
      - Tracks progress and customization

  3. Security
    - Enable RLS on new tables
    - Add policies for template sharing and instance management
*/

-- Create program templates table
CREATE TABLE IF NOT EXISTS program_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  duration_weeks integer NOT NULL,
  workouts_per_week integer NOT NULL,
  difficulty text,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_duration CHECK (duration_weeks > 0),
  CONSTRAINT valid_workouts_per_week CHECK (workouts_per_week BETWEEN 1 AND 7)
);

-- Create program instances table
CREATE TABLE IF NOT EXISTS program_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  template_id uuid REFERENCES program_templates(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date,
  current_week integer DEFAULT 1,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_week CHECK (current_week > 0)
);

-- Enable RLS
ALTER TABLE program_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_instances ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for program templates
CREATE POLICY "Users can view public templates"
  ON program_templates
  FOR SELECT
  TO authenticated
  USING (is_public OR auth.uid() = user_id);

CREATE POLICY "Users can create templates"
  ON program_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON program_templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON program_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add RLS policies for program instances
CREATE POLICY "Users can view own program instances"
  ON program_instances
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create program instances"
  ON program_instances
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own program instances"
  ON program_instances
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own program instances"
  ON program_instances
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_program_templates_updated_at
  BEFORE UPDATE ON program_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_program_instances_updated_at
  BEFORE UPDATE ON program_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();