/*
  # Auto-create profiles on user signup

  1. Purpose
    - Ensure every auth user has a corresponding profile record
    - Prevents authentication loop when profile is missing
    - Fixes issue where new users couldn't access the app

  2. Changes
    - Create function to auto-create profiles when auth users are created
    - Add trigger to run function on auth.users INSERT events
    - Backfill existing users without profiles

  3. Security
    - Function runs as postgres role (internal trigger)
    - Maintains existing RLS policies
    - Sets default role='user' for new profiles
*/

-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'user',
    true
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to run function when new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users without profiles
INSERT INTO public.profiles (id, email, full_name, role, is_active)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  'user',
  true
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
