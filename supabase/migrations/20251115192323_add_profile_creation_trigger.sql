/*
  # Add Profile Auto-Creation Trigger

  1. Purpose
    - Automatically create a profile when a new user signs up
    - Prevents the need for manual profile creation
  
  2. Function
    - Creates a new profile record in profiles table
    - Copies email and name from auth.users
    - Sets default role to 'user'
  
  3. Trigger
    - Fires after INSERT on auth.users
    - Calls the profile creation function
*/

-- Create function to handle new user profile creation
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

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
