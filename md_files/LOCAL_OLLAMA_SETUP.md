# Local Ollama Setup Guide

## Quick Setup for Local Ollama (localhost:11434)

### Option 1: Using SQL (Easiest - No Admin Required)

1. **Go to Supabase SQL Editor:**
   - Visit: https://app.supabase.com/project/yerlswwcicicojlvwaei/sql/new

2. **Run this SQL to add local Ollama endpoint:**
   ```sql
   -- Add local Ollama endpoint
   INSERT INTO ollama_endpoints (name, base_url, is_local, is_enabled, health_status)
   VALUES ('Local Ollama', 'http://localhost:11434', true, true, 'healthy')
   ON CONFLICT (base_url) DO UPDATE
   SET is_enabled = true, health_status = 'healthy';
   ```

3. **Get the endpoint ID:**
   ```sql
   SELECT id, name, base_url FROM ollama_endpoints WHERE base_url = 'http://localhost:11434';
   ```
   Copy the `id` (UUID) - you'll need it for the next step.

4. **Sync models from your local Ollama:**
   
   You can either:
   
   **A. Use the backend API** (if you're an admin):
   ```bash
   # Replace ENDPOINT_ID with the UUID from step 3
   curl -X POST http://localhost:3001/api/models/sync/ENDPOINT_ID \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
   
   **B. Or use this Node.js script** (see below)

### Option 2: Using Backend API (Requires Admin)

1. **Make yourself an admin** (if not already):
   ```sql
   UPDATE profiles 
   SET role = 'admin' 
   WHERE email = 'your-email@example.com';
   ```

2. **Add endpoint via API:**
   ```bash
   curl -X POST http://localhost:3001/api/endpoints \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "name": "Local Ollama",
       "base_url": "http://localhost:11434",
       "is_local": true
     }'
   ```

3. **Sync models:**
   ```bash
   # Replace ENDPOINT_ID with the ID from step 2
   curl -X POST http://localhost:3001/api/models/sync/ENDPOINT_ID \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

### Option 3: Using Node.js Script

Create a file `sync-local-ollama.js` in the backend directory:

```javascript
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const OLLAMA_URL = 'http://localhost:11434';

async function syncLocalOllama() {
  try {
    // 1. Add or get local endpoint
    const { data: endpoint, error: endpointError } = await supabase
      .from('ollama_endpoints')
      .upsert({
        name: 'Local Ollama',
        base_url: OLLAMA_URL,
        is_local: true,
        is_enabled: true,
        health_status: 'healthy'
      }, {
        onConflict: 'base_url',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (endpointError) throw endpointError;
    console.log('✅ Endpoint created/updated:', endpoint.id);

    // 2. Fetch models from Ollama
    console.log(`📥 Fetching models from ${OLLAMA_URL}...`);
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();
    const models = data.models || [];
    console.log(`📦 Found ${models.length} models`);

    // 3. Insert models into database
    const modelsToInsert = models.map(m => ({
      endpoint_id: endpoint.id,
      name: m.name,
      model_id: m.model || m.name,
      size: m.size,
      digest: m.digest,
      modified_at: m.modified_at,
      is_enabled: true
    }));

    const { data: syncedModels, error: syncError } = await supabase
      .from('models')
      .upsert(modelsToInsert, {
        onConflict: 'endpoint_id,model_id',
        ignoreDuplicates: false
      })
      .select();

    if (syncError) throw syncError;

    console.log(`✅ Successfully synced ${syncedModels?.length || 0} models:`);
    syncedModels?.forEach(m => {
      console.log(`   - ${m.name} (${m.model_id})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

syncLocalOllama();
```

Run it:
```bash
cd backend
node sync-local-ollama.js
```

## Verify Setup

1. **Check endpoint exists:**
   ```sql
   SELECT * FROM ollama_endpoints WHERE base_url = 'http://localhost:11434';
   ```

2. **Check models are synced:**
   ```sql
   SELECT m.name, m.model_id, e.name as endpoint_name 
   FROM models m
   JOIN ollama_endpoints e ON m.endpoint_id = e.id
   WHERE e.base_url = 'http://localhost:11434';
   ```

3. **Refresh frontend:**
   - Models should now appear in the dropdown
   - You should be able to select a model and start chatting

## Troubleshooting

### "Failed to fetch models" error
- Make sure Ollama is running: `ollama serve` or check if it's running as a service
- Test manually: `curl http://localhost:11434/api/tags`
- Check firewall isn't blocking port 11434

### Models not showing in frontend
- Make sure models are synced (check database)
- Make sure `is_enabled = true` for both endpoint and models
- Refresh the frontend page
- Check browser console for errors

### "Endpoint not found" error
- Make sure you ran the SQL to create the endpoint
- Check the endpoint ID is correct
- Verify the endpoint exists in the database

## Quick Test

Test if Ollama is accessible:
```bash
curl http://localhost:11434/api/tags
```

You should see a JSON response with your installed models.

