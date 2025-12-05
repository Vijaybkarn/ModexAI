/*
  # Add Local Ollama Endpoint
  
  This migration adds a local Ollama endpoint if it doesn't exist.
  Run this after the main migration to set up local Ollama support.
*/

-- Add local Ollama endpoint (if not exists)
INSERT INTO ollama_endpoints (name, base_url, is_local, is_enabled, health_status, last_health_check)
VALUES (
  'Local Ollama',
  'http://localhost:11434',
  true,
  true,
  'healthy',
  now()
)
ON CONFLICT (base_url) DO UPDATE
SET 
  is_enabled = true,
  health_status = 'healthy',
  last_health_check = now();

-- Note: Models will need to be synced separately using:
-- 1. The sync script: node backend/sync-local-ollama.js
-- 2. Or the API: POST /api/models/sync/{endpoint_id}
-- 3. Or SQL (see LOCAL_OLLAMA_SETUP.md)

