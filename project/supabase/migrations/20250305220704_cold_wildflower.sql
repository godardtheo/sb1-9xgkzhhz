/*
  # Initial Schema Setup for SetLog

  1. New Tables
    - users
      - id (uuid, primary key)
      - username (text, unique)
      - email (text, unique)
      - full_name (text)
      - avatar_url (text)
      - height (numeric)
      - weight (numeric)
      - created_at (timestamp)
      - updated_at (timestamp)
    
    - workouts
      - id (uuid, primary key)
      - user_id (uuid, foreign key)
      - name (text)
      - date (timestamp)
      - duration (interval)
      - notes (text)
      - created_at (timestamp)
      - updated_at (timestamp)
    
    - exercises
      - id (uuid, primary key)
      - name (text)
      - description (text)
      - muscle_group (text)
      - equipment (text)
      - video_url (text)
      - created_at (timestamp)
    
    - workout_exercises
      - id (uuid, primary key)
      - workout_id (uuid, foreign key)
      - exercise_id (uuid, foreign key)
      - sets (integer)
      - reps (integer)
      - weight (numeric)
      - rest_time (interval)
      - order (integer)
      - created_at (timestamp)
    
    - weight_logs
      - id (uuid, primary key)
      - user_id (uuid, foreign key)
      - weight (numeric)
      - date (timestamp)
      - notes (text)
      - created_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  height numeric,
  weight numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create workouts table
CREATE TABLE workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  date timestamptz DEFAULT now(),
  duration interval,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create exercises table
CREATE TABLE exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  muscle_group text,
  equipment text,
  video_url text,
  created_at timestamptz DEFAULT now()
);

-- Create workout_exercises table
CREATE TABLE workout_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercises(id) ON DELETE CASCADE,
  sets integer DEFAULT 3,
  reps integer DEFAULT 10,
  weight numeric DEFAULT 0,
  rest_time interval DEFAULT '2 minutes'::interval,
  "order" integer,
  created_at timestamptz DEFAULT now()
);

-- Create weight_logs table
CREATE TABLE weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  weight numeric NOT NULL,
  date timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can read own workouts"
  ON workouts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workouts"
  ON workouts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workouts"
  ON workouts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workouts"
  ON workouts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Everyone can read exercises"
  ON exercises
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can read own workout exercises"
  ON workout_exercises
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workouts
    WHERE workouts.id = workout_exercises.workout_id
    AND workouts.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own workout exercises"
  ON workout_exercises
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM workouts
    WHERE workouts.id = workout_exercises.workout_id
    AND workouts.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own workout exercises"
  ON workout_exercises
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workouts
    WHERE workouts.id = workout_exercises.workout_id
    AND workouts.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own workout exercises"
  ON workout_exercises
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workouts
    WHERE workouts.id = workout_exercises.workout_id
    AND workouts.user_id = auth.uid()
  ));

CREATE POLICY "Users can read own weight logs"
  ON weight_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight logs"
  ON weight_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weight logs"
  ON weight_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weight logs"
  ON weight_logs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);