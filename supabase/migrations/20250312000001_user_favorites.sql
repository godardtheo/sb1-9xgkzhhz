/*
  # User Favorite Exercises Implementation

  1. Changes:
    - Remove global is_favorite column from exercises table
    - Create a new user_favorite_exercises junction table
    
  2. Security:
    - Enable RLS on the new table
    - Add policies for authenticated users to manage their favorites
*/

-- Remove the is_favorite column from exercises
ALTER TABLE exercises DROP COLUMN IF EXISTS is_favorite;

-- Create the user_favorite_exercises junction table
CREATE TABLE IF NOT EXISTS user_favorite_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  exercise_id uuid REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, exercise_id)
);

-- Enable RLS
ALTER TABLE user_favorite_exercises ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own favorite exercises"
  ON user_favorite_exercises
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create a function to check if an exercise is a favorite for a user
CREATE OR REPLACE FUNCTION is_exercise_favorite(exercise_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_favorite_exercises 
    WHERE exercise_id = $1 
    AND user_id = $2
  );
END;
$$; 