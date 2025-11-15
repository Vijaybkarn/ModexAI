/*
  # Fix Security Issues - Part 1: Add Missing Indexes

  1. Problem
    - Foreign keys without covering indexes cause suboptimal query performance
    - conversations.model_id, usage_logs.endpoint_id, usage_logs.model_id need indexes
  
  2. Solution
    - Add indexes for all foreign key columns
    - Improves JOIN performance and foreign key constraint checks
  
  3. Changes
    - Add index on conversations(model_id)
    - Add index on usage_logs(endpoint_id)
    - Add index on usage_logs(model_id)
*/

-- Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_conversations_model_id 
ON conversations(model_id);

CREATE INDEX IF NOT EXISTS idx_usage_logs_endpoint_id 
ON usage_logs(endpoint_id);

CREATE INDEX IF NOT EXISTS idx_usage_logs_model_id 
ON usage_logs(model_id);
