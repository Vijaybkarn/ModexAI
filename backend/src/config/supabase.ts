import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

// Load .env file from the backend directory
// Try multiple possible locations to handle both dev and production builds
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Possible .env file locations (relative to this file)
const possibleEnvPaths = [
  join(__dirname, '../../.env'),           // From dist/config/ or src/config/
  join(process.cwd(), '.env'),             // From backend/ directory
  join(process.cwd(), 'backend/.env'),     // From project root
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}

// Fallback to default dotenv behavior if no .env file found
if (!envLoaded) {
  dotenv.config();
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  const missingVars = [];
  if (!supabaseUrl) missingVars.push('SUPABASE_URL');
  if (!supabaseServiceKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
  
  throw new Error(
    `Missing Supabase environment variables: ${missingVars.join(', ')}\n` +
    `Please create a .env file in the backend directory with the required variables.\n` +
    `See backend/.env.example for a template.\n` +
    `You can get these values from your Supabase project dashboard: https://app.supabase.com/project/_/settings/api`
  );
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);
