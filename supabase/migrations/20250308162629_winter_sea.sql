/*
  # Workout Templates Schema

  1. New Tables
    - `workout_templates`
      - `id` (uuid, primary key): Unique identifier for the template
      - `user_id` (uuid): Reference to the user who created the template
      - `name` (text): Template name
      - `description` (text): Template description
      - `target_muscles` (text[]): Array of target muscle groups
      - `estimated_duration` (interval): Estimated workout duration
      - `created_at` (timestamptz): Creation timestamp
      - `updated_at` (timestamptz): Last modification timestamp

    - `template_exercises`
      - `id` (uuid, primary key): Unique identifier for the template exercise
      - `template_id` (uuid): Reference to the workout template
      - `exercise_id` (uuid): Reference to the exercise
      - `sets` (integer): Default number of sets
      - `reps` (integer): Default number of reps
      - `weight` (numeric): Default weight
      - `rest_time` (interval): Default rest time between sets
      - `order` (integer): Exercise order in the template
      - `created_at` (timestamptz): Creation timestamp

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own templates
    - Add policies for authenticated users to manage their template exercises

  3. Relationships
    - Link templates to users
    - Link template exercises to templates and exercises
*/

-- Create workout_templates table
CREATE TABLE IF NOT EXISTS workout_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  target_muscles text[] DEFAULT '{}',
  estimated_duration interval DEFAULT '01:00:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create template_exercises table
CREATE TABLE IF NOT EXISTS template_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercises(id) ON DELETE CASCADE,
  sets integer DEFAULT 3,
  reps integer DEFAULT 10,
  weight numeric DEFAULT 0,
  rest_time interval DEFAULT '00:02:00',
  "order" integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_exercises ENABLE ROW LEVEL SECURITY;

-- Workout templates policies
CREATE POLICY "Users can create their own templates"
  ON workout_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own templates"
  ON workout_templates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON workout_templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON workout_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Template exercises policies
CREATE POLICY "Users can create exercises for their templates"
  ON template_exercises
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM workout_templates
    WHERE workout_templates.id = template_exercises.template_id
    AND workout_templates.user_id = auth.uid()
  ));

CREATE POLICY "Users can view exercises from their templates"
  ON template_exercises
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workout_templates
    WHERE workout_templates.id = template_exercises.template_id
    AND workout_templates.user_id = auth.uid()
  ));

CREATE POLICY "Users can update exercises from their templates"
  ON template_exercises
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workout_templates
    WHERE workout_templates.id = template_exercises.template_id
    AND workout_templates.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM workout_templates
    WHERE workout_templates.id = template_exercises.template_id
    AND workout_templates.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete exercises from their templates"
  ON template_exercises
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workout_templates
    WHERE workout_templates.id = template_exercises.template_id
    AND workout_templates.user_id = auth.uid()
  ));

-- Create indexes for better query performance
CREATE INDEX idx_workout_templates_user_id ON workout_templates(user_id);
CREATE INDEX idx_template_exercises_template_id ON template_exercises(template_id);

-- Add trigger to update the updated_at timestamp
CREATE TRIGGER update_workout_templates_updated_at
  BEFORE UPDATE ON workout_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();