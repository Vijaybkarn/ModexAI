/*
  # Add INSERT Policy for Profiles

  1. Problem
    - Profiles table missing INSERT policy
    - handle_new_user() trigger fails with "new row violates row-level security policy"
  
  2. Solution
    - Add INSERT policy allowing users to create their own profile
    - Needed for trigger to work when new users sign up
  
  3. Changes
    - Add "Users can insert own profile" policy
*/

-- Allow users to insert their own profile (needed for trigger)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));
