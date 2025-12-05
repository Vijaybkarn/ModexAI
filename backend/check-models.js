import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkModels() {
  try {
    console.log('🔍 Checking models in database...\n');

    // Check endpoints
    const { data: endpoints, error: endpointsError } = await supabase
      .from('ollama_endpoints')
      .select('*')
      .order('name');

    if (endpointsError) {
      throw new Error(`Failed to fetch endpoints: ${endpointsError.message}`);
    }

    console.log(`📡 Found ${endpoints?.length || 0} endpoint(s):`);
    endpoints?.forEach(e => {
      console.log(`   ${e.is_enabled ? '✅' : '❌'} ${e.name} (${e.base_url}) - ${e.health_status}`);
    });
    console.log('');

    // Check models
    const { data: allModels, error: modelsError } = await supabase
      .from('models')
      .select('*, ollama_endpoints(name, base_url)')
      .order('name');

    if (modelsError) {
      throw new Error(`Failed to fetch models: ${modelsError.message}`);
    }

    const enabledModels = allModels?.filter(m => m.is_enabled) || [];
    const disabledModels = allModels?.filter(m => !m.is_enabled) || [];

    console.log(`🤖 Found ${allModels?.length || 0} model(s) total:`);
    console.log(`   ✅ ${enabledModels.length} enabled`);
    console.log(`   ❌ ${disabledModels.length} disabled\n`);

    if (enabledModels.length > 0) {
      console.log('Enabled models:');
      enabledModels.forEach(m => {
        const endpoint = m.ollama_endpoints;
        console.log(`   ✓ ${m.name} (${m.model_id}) - ${endpoint?.name || 'Unknown endpoint'}`);
      });
    } else {
      console.log('⚠️  No enabled models found!');
      console.log('\nPossible issues:');
      console.log('   1. Models haven\'t been synced yet');
      console.log('   2. All models are disabled (is_enabled = false)');
      console.log('   3. No endpoint is configured');
      console.log('\nSolutions:');
      console.log('   - Run: npm run sync-ollama');
      console.log('   - Or add models manually via SQL');
    }

    if (disabledModels.length > 0) {
      console.log('\nDisabled models:');
      disabledModels.forEach(m => {
        console.log(`   ✗ ${m.name} (${m.model_id})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkModels();

