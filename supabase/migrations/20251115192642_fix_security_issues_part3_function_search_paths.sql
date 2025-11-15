/*
  # Fix Security Issues - Part 3: Fix Function Search Paths

  1. Problem
    - Functions have role mutable search_path which is a security risk
    - Allows potential SQL injection through search_path manipulation
  
  2. Solution
    - Set search_path explicitly in function definition
    - Use SECURITY DEFINER with stable search_path
  
  3. Changes
    - Update update_updated_at_column() with explicit search_path
    - Update handle_new_user() with explicit search_path
*/

-- Recreate update_updated_at_column with stable search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate handle_new_user with stable search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
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
$$;
