# Quick Setup: Local Ollama Models

## 🚀 Fastest Way (3 Steps)

### Step 1: Make sure Ollama is running
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not running, start it:
ollama serve
```

### Step 2: Add local endpoint to database

Go to Supabase SQL Editor and run:
```sql
INSERT INTO ollama_endpoints (name, base_url, is_local, is_enabled, health_status)
VALUES ('Local Ollama', 'http://localhost:11434', true, true, 'healthy')
ON CONFLICT (base_url) DO UPDATE
SET is_enabled = true, health_status = 'healthy';
```

### Step 3: Sync models

Run the sync script:
```bash
cd backend
npm run sync-ollama
```

That's it! Refresh your browser and models should appear.

---

## Alternative: Using SQL Only

If you prefer SQL, you can also add models directly:

1. **Get your models from Ollama:**
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. **Get the endpoint ID:**
   ```sql
   SELECT id FROM ollama_endpoints WHERE base_url = 'http://localhost:11434';
   ```

3. **Insert models (replace ENDPOINT_ID and model details):**
   ```sql
   INSERT INTO models (endpoint_id, name, model_id, is_enabled)
   VALUES 
     ('ENDPOINT_ID', 'llama2', 'llama2', true),
     ('ENDPOINT_ID', 'mistral', 'mistral', true)
   ON CONFLICT (endpoint_id, model_id) DO NOTHING;
   ```

---

## Troubleshooting

**"Cannot connect to Ollama"**
- Make sure Ollama is running: `ollama serve`
- Check it's on port 11434: `curl http://localhost:11434/api/version`

**"No models found"**
- Install a model: `ollama pull llama2`
- Or: `ollama pull mistral`

**Models not showing in frontend**
- Refresh the browser
- Check browser console for errors
- Verify models exist: `SELECT * FROM models WHERE is_enabled = true;`

