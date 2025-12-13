# Quick Fix Guide - API Failures

## Issues Fixed

1. ✅ **Frontend pointing to Supabase Functions** → Changed to local backend
2. ✅ **Profile missing** → Need to run database migration
3. ✅ **Backend not running** → Need to start backend server

## Steps to Fix

### 1. Update Frontend .env (DONE)
The `.env` file has been updated to use the local backend:
```
VITE_API_URL=http://localhost:3001
```

### 2. Start Backend Server

Open a terminal and run:
```bash
cd backend
npm run dev
```

You should see:
```
Server running on port 3001
Environment: development
```

### 3. Run Database Migration

Go to your Supabase dashboard:
1. Visit: https://app.supabase.com/project/yerlswwcicicojlvwaei/sql/new
2. Open `supabase/migrations/000_APPLY_ALL_MIGRATIONS.sql`
3. Copy and paste the entire file into the SQL Editor
4. Click "Run"
5. Wait for success message

This will:
- Create all required tables
- Set up triggers for auto-creating profiles
- Create your profile if it doesn't exist
- Set up all security policies

### 4. Restart Frontend

After updating `.env`, restart your frontend dev server:
```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### 5. Verify Everything Works

1. **Check backend is running**: Visit http://localhost:3001/health
   - Should return: `{"status":"ok","timestamp":"..."}`

2. **Check frontend**: Visit http://localhost:5173
   - Should load without errors
   - Profile should be created automatically
   - Models should load from backend

3. **Check browser console**: Should see no 404 errors

## Troubleshooting

### Backend won't start?
- Check `backend/.env` exists and has correct Supabase credentials
- Make sure port 3001 is not in use
- Check backend logs for errors

### Still getting 404 for profile?
- Run the database migration (step 3)
- Check Supabase dashboard → Table Editor → profiles
- Your profile should exist there

### Still getting CORS errors?
- Make sure backend is running on port 3001
- Check `backend/.env` has `CORS_ORIGIN=http://localhost:5173`
- Restart backend after changing .env

### Models not loading?
- Make sure backend is running
- Check backend logs for errors
- Verify `ollama_endpoints` table has the default endpoint

## What Changed

**Before:**
- Frontend was calling: `https://yerlswwcicicojlvwaei.supabase.co/functions/v1/conversations` ❌
- These functions don't exist → 404 errors

**After:**
- Frontend now calls: `http://localhost:3001/api/conversations` ✅
- Uses your local backend server

## Next Steps

Once everything is working:
1. Create a new conversation
2. Select a model
3. Start chatting!

