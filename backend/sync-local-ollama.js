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
  console.error('❌ Missing Supabase credentials in backend/.env');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const OLLAMA_URL = 'http://localhost:11434';

async function syncLocalOllama() {
  try {
    console.log('🚀 Starting local Ollama sync...\n');

    // 1. Check if Ollama is running
    console.log(`📡 Checking Ollama at ${OLLAMA_URL}...`);
    try {
      const healthCheck = await fetch(`${OLLAMA_URL}/api/version`, {
        signal: AbortSignal.timeout(5000)
      });
      if (!healthCheck.ok) {
        throw new Error(`Ollama not responding: ${healthCheck.statusText}`);
      }
      console.log('✅ Ollama is running\n');
    } catch (error) {
      console.error('❌ Cannot connect to Ollama:', error.message);
      console.error('   Make sure Ollama is running: ollama serve');
      process.exit(1);
    }

    // 2. Add or get local endpoint
    console.log('📝 Adding/updating local Ollama endpoint...');
    const { data: endpoint, error: endpointError } = await supabase
      .from('ollama_endpoints')
      .upsert({
        name: 'Local Ollama',
        base_url: OLLAMA_URL,
        is_local: true,
        is_enabled: true,
        health_status: 'healthy',
        last_health_check: new Date().toISOString()
      }, {
        onConflict: 'base_url',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (endpointError) {
      throw new Error(`Failed to create endpoint: ${endpointError.message}`);
    }
    console.log(`✅ Endpoint ready: ${endpoint.name} (${endpoint.id})\n`);

    // 3. Fetch models from Ollama
    console.log(`📥 Fetching models from ${OLLAMA_URL}/api/tags...`);
    const response = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();
    const models = data.models || [];

    if (models.length === 0) {
      console.log('⚠️  No models found in Ollama');
      console.log('   Install a model: ollama pull llama2');
      process.exit(0);
    }

    console.log(`📦 Found ${models.length} model(s):`);
    models.forEach(m => console.log(`   - ${m.name}`));
    console.log('');

    // 4. Insert models into database
    console.log('💾 Syncing models to database...');
    console.log(`   Preparing ${models.length} model(s) for insertion...`);
    
    const modelsToInsert = models.map(m => {
      const modelData = {
        endpoint_id: endpoint.id,
        name: m.name,
        model_id: m.model || m.name,
        size: m.size,
        digest: m.digest,
        modified_at: m.modified_at,
        is_enabled: true
      };
      console.log(`   📦 Model: ${m.name} -> ${modelData.model_id}`);
      return modelData;
    });

    console.log(`   📤 Inserting/Upserting ${modelsToInsert.length} model(s)...`);
    const { data: syncedModels, error: syncError } = await supabase
      .from('models')
      .upsert(modelsToInsert, {
        onConflict: 'endpoint_id,model_id',
        ignoreDuplicates: false
      })
      .select();

    if (syncError) {
      console.error('❌ Sync error details:', syncError);
      throw new Error(`Failed to sync models: ${syncError.message}`);
    }

    console.log(`✅ Successfully synced ${syncedModels?.length || 0} model(s):`);
    if (syncedModels && syncedModels.length > 0) {
      syncedModels.forEach((m, i) => {
        const sizeMB = m.size ? (m.size / 1024 / 1024).toFixed(1) : '?';
        console.log(`   ${i + 1}. ✓ ${m.name} (${m.model_id}) - ${sizeMB} MB - Enabled: ${m.is_enabled}`);
      });
    } else {
      console.warn('⚠️  No models were returned from upsert operation');
    }

    // 5. Disable models that no longer exist in Ollama (for this endpoint)
    console.log('\n🧹 Cleaning up stale models...');
    const ollamaModelIds = new Set(models.map(m => m.model || m.name));
    
    // Get all models for this endpoint from database
    const { data: dbModels, error: dbModelsError } = await supabase
      .from('models')
      .select('id, name, model_id, is_enabled')
      .eq('endpoint_id', endpoint.id);

    if (dbModelsError) {
      console.warn('⚠️  Could not fetch database models for cleanup:', dbModelsError.message);
    } else if (dbModels && dbModels.length > 0) {
      const staleModels = dbModels.filter(m => !ollamaModelIds.has(m.model_id));
      
      if (staleModels.length > 0) {
        console.log(`   Found ${staleModels.length} stale model(s) to disable:`);
        staleModels.forEach(m => {
          console.log(`   - ${m.name} (${m.model_id})`);
        });

        const staleModelIds = staleModels.map(m => m.id);
        const { error: disableError } = await supabase
          .from('models')
          .update({ is_enabled: false })
          .in('id', staleModelIds);

        if (disableError) {
          console.warn('⚠️  Could not disable stale models:', disableError.message);
        } else {
          console.log(`✅ Disabled ${staleModels.length} stale model(s)`);
        }
      } else {
        console.log('   ✅ No stale models found');
      }
    }

    console.log('\n🎉 Done! Models should now appear in the frontend.');
    console.log('   Refresh your browser to see them.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.cause) {
      console.error('   Details:', error.cause);
    }
    process.exit(1);
  }
}

syncLocalOllama();

