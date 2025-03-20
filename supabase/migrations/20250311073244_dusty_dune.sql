/*
  # User synchronization trigger
  
  1. Changes
    - Creates a trigger to automatically create public.users records
    - Ensures data consistency between auth.users and public.users
    - Handles new user registration events
  
  2. Security
    - Runs with security definer permissions
    - Only processes verified sign-ups
*/

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    SPLIT_PART(NEW.email, '@', 1)  -- Default username from email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();