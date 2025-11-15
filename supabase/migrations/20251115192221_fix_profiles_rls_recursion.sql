/*
  # Fix Profiles RLS Infinite Recursion

  1. Problem
    - "Admins can view all profiles" policy causes infinite recursion
    - Policy checks profiles.role which requires checking profiles again
  
  2. Solution
    - Remove the recursive admin policy
    - Keep simple user-can-view-own policy
    - Admins can use service role key for admin operations
  
  3. Changes
    - Drop problematic admin policy
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Keep only the simple policies that don't cause recursion
-- Users can view own profile (already exists)
-- Users can update own profile (already exists)
