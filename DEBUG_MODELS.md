# Debug: Models Not Showing

## Quick Diagnosis

Run this to check what's in your database:
```bash
cd backend
npm run check-models
```

This will show:
- ✅ How many endpoints exist
- ✅ How many models exist
- ✅ Which models are enabled/disabled
- ✅ What the issue might be

## Common Issues & Fixes

### Issue 1: No Models in Database

**Symptom:** `check-models` shows 0 models

**Fix:**
```bash
# Make sure Ollama is running
curl http://localhost:11434/api/tags

# Sync models
npm run sync-ollama
```

### Issue 2: Models Exist But Are Disabled

**Symptom:** `check-models` shows models but they're disabled

**Fix (SQL):**
```sql
-- Enable all models
UPDATE models SET is_enabled = true;

-- Or enable specific models
UPDATE models SET is_enabled = true WHERE name = 'llama2';
```

### Issue 3: Endpoint is Disabled

**Symptom:** Endpoint exists but `is_enabled = false`

**Fix (SQL):**
```sql
UPDATE ollama_endpoints 
SET is_enabled = true, health_status = 'healthy'
WHERE base_url = 'http://localhost:11434';
```

### Issue 4: No Endpoint Exists

**Symptom:** `check-models` shows 0 endpoints

**Fix (SQL):**
```sql
INSERT INTO ollama_endpoints (name, base_url, is_local, is_enabled, health_status)
VALUES ('Local Ollama', 'http://localhost:11434', true, true, 'healthy')
ON CONFLICT (base_url) DO UPDATE
SET is_enabled = true, health_status = 'healthy';
```

Then sync models:
```bash
npm run sync-ollama
```

### Issue 5: Authentication Error (401)

**Symptom:** Browser console shows 401 errors

**Fix:**
- Make sure you're logged in
- Check that your profile exists in the database
- Run the database migration if needed

## Step-by-Step Fix

1. **Check current state:**
   ```bash
   npm run check-models
   ```

2. **If no endpoint exists, add it:**
   ```sql
   INSERT INTO ollama_endpoints (name, base_url, is_local, is_enabled, health_status)
   VALUES ('Local Ollama', 'http://localhost:11434', true, true, 'healthy')
   ON CONFLICT (base_url) DO UPDATE
   SET is_enabled = true, health_status = 'healthy';
   ```

3. **Sync models:**
   ```bash
   npm run sync-ollama
   ```

4. **Verify models are enabled:**
   ```bash
   npm run check-models
   ```

5. **Refresh browser** - models should appear!

## Manual SQL Check

Check directly in Supabase:
```sql
-- Check endpoints
SELECT id, name, base_url, is_enabled, health_status 
FROM ollama_endpoints;

-- Check models
SELECT m.id, m.name, m.model_id, m.is_enabled, e.name as endpoint_name
FROM models m
LEFT JOIN ollama_endpoints e ON m.endpoint_id = e.id
ORDER BY m.is_enabled DESC, m.name;
```

## Still Not Working?

1. **Check backend logs** - Look for errors when fetching models
2. **Check browser console** - Look for API errors
3. **Verify backend is running** - `curl http://localhost:3001/health`
4. **Test API directly:**
   ```bash
   # Get your auth token from browser (Network tab)
   curl http://localhost:3001/api/models \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

