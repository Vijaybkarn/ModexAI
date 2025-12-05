# Backend Setup Guide

## Environment Variables Setup

The backend requires environment variables to be configured in a `.env` file in the `backend` directory.

### Quick Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` and add your Supabase credentials:**
   - Get your credentials from: https://app.supabase.com/project/_/settings/api
   - Replace the placeholder values:
     - `SUPABASE_URL` - Your Supabase project URL
     - `SUPABASE_ANON_KEY` - Your Supabase anonymous key
     - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (keep this secret!)

### Required Variables

- `SUPABASE_URL` - Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for backend operations
- `SUPABASE_ANON_KEY` - Anonymous key (optional, but recommended)

### Optional Variables (with defaults)

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (default: development)
- `CORS_ORIGIN` - CORS origin (default: http://localhost:5173)
- `JWT_SECRET` - JWT secret for token signing
- `ENCRYPTION_KEY` - 32-character encryption key
- `RATE_LIMIT_WINDOW_MS` - Rate limit window (default: 900000)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 100)
- `OLLAMA_API_URL` - Ollama API URL (default: https://llm-api.gosetle.com)
- `OLLAMA_LOCAL_URL` - Local Ollama URL (default: http://localhost:11434)
- `LOG_LEVEL` - Logging level (default: info)

### Getting Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the following:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

### Troubleshooting

If you see the error: "Missing Supabase environment variables"
- Make sure `.env` file exists in the `backend` directory
- Verify all required variables are set (no empty values)
- Check that the file is named exactly `.env` (not `.env.txt` or similar)

### Security Notes

- Never commit `.env` file to version control
- The `.env.example` file is safe to commit (it contains no secrets)
- Keep your `SUPABASE_SERVICE_ROLE_KEY` secret - it has admin access to your database

