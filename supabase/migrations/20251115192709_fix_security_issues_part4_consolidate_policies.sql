/*
  # Fix Security Issues - Part 4: Consolidate Multiple Permissive Policies

  1. Problem
    - Multiple permissive SELECT policies cause confusion and performance issues
    - Tables affected: models, ollama_endpoints, usage_logs
  
  2. Solution
    - Combine multiple permissive policies into single restrictive policies
    - Use OR conditions to handle multiple cases
  
  3. Changes
    - Consolidate models SELECT policies
    - Consolidate ollama_endpoints SELECT policies
    - Consolidate usage_logs SELECT policies
*/

-- Models: Combine "Anyone can view enabled models" and "Admins can manage models" (SELECT)
DROP POLICY IF EXISTS "Anyone can view enabled models" ON models;
DROP POLICY IF EXISTS "Admins can manage models" ON models;

-- Single SELECT policy for models
CREATE POLICY "View models policy"
  ON models FOR SELECT
  TO authenticated
  USING (
    -- Either the model is enabled (anyone can see)
    is_enabled = true
    OR
    -- Or user is admin (can see all)
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.role = 'admin'
    )
  );

-- Separate policies for admin modifications
CREATE POLICY "Admins can insert models"
  ON models FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update models"
  ON models FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete models"
  ON models FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.role = 'admin'
    )
  );

-- Ollama endpoints: Combine "Anyone can view enabled endpoints" and "Admins can manage endpoints" (SELECT)
DROP POLICY IF EXISTS "Anyone can view enabled endpoints" ON ollama_endpoints;
DROP POLICY IF EXISTS "Admins can manage endpoints" ON ollama_endpoints;

-- Single SELECT policy for ollama_endpoints
CREATE POLICY "View endpoints policy"
  ON ollama_endpoints FOR SELECT
  TO authenticated
  USING (
    -- Either the endpoint is enabled (anyone can see)
    is_enabled = true
    OR
    -- Or user is admin (can see all)
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.role = 'admin'
    )
  );

-- Separate policies for admin modifications
CREATE POLICY "Admins can insert endpoints"
  ON ollama_endpoints FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update endpoints"
  ON ollama_endpoints FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete endpoints"
  ON ollama_endpoints FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.role = 'admin'
    )
  );

-- Usage logs: Combine "Users can view own usage logs" and "Admins can view all usage logs"
DROP POLICY IF EXISTS "Users can view own usage logs" ON usage_logs;
DROP POLICY IF EXISTS "Admins can view all usage logs" ON usage_logs;

-- Single SELECT policy for usage_logs
CREATE POLICY "View usage logs policy"
  ON usage_logs FOR SELECT
  TO authenticated
  USING (
    -- Either viewing own logs
    user_id = (SELECT auth.uid())
    OR
    -- Or user is admin (can see all)
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.role = 'admin'
    )
  );
