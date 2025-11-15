# Quick Start Guide

Get the AI Chat Platform up and running in 5 minutes.

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (database already set up)
- Ollama running locally (http://localhost:11434) OR hosted Ollama endpoint

## 1. Environment Setup (2 minutes)

### Copy environment files:
```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

### Update `.env`:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_API_URL=http://localhost:3001
```

### Update `backend/.env`:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
JWT_SECRET=change-me-to-random-string
ENCRYPTION_KEY=generate-32-character-random-string
CORS_ORIGIN=http://localhost:5173
```

## 2. Install Dependencies (2 minutes)

```bash
npm install
cd backend && npm install && cd ..
```

## 3. Start Services (1 minute)

### Terminal 1 - Backend:
```bash
cd backend
npm run dev
```
✅ Backend running at http://localhost:3001

### Terminal 2 - Frontend:
```bash
npm run dev
```
✅ Frontend running at http://localhost:5173

## 4. First Login (30 seconds)

1. Open http://localhost:5173 in your browser
2. Click "Sign in with Google"
3. Use your Google account to authenticate
4. You'll be redirected to the chat interface

## 5. Add Ollama Endpoint (30 seconds)

Since you're the first user, you'll need to make yourself an admin:

```bash
# In backend terminal, or via Supabase dashboard:
# Go to Supabase > SQL Editor
# Run this query (replace with your user ID):
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

Then:

1. Click your profile menu (top right)
2. Click "Admin Panel"
3. Go to "Endpoints"
4. Click "Add Endpoint"
5. Fill in:
   - **Name:** "Local Ollama"
   - **URL:** "http://localhost:11434"
   - **Is Local:** Yes
   - Click "Save"

6. Click "Test Health" to verify connection
7. Go to "Models" tab
8. Click "Discover Models" to load available models

## 6. Start Chatting!

1. Go back to Chat (click logo)
2. Select a model from the dropdown
3. Type a message
4. Press Enter or click Send button
5. Watch tokens stream in real-time!

## Common Issues

### "Failed to connect to backend"
- Ensure backend is running: `cd backend && npm run dev`
- Check `VITE_API_URL` in `.env` is correct
- Verify `CORS_ORIGIN` in `backend/.env` matches frontend URL

### "Cannot find Ollama"
- Start Ollama: `ollama serve`
- Or pull a model: `ollama pull llama2`
- Check endpoint health in admin panel

### "Sign in not working"
- Verify Supabase credentials in `.env`
- Check Google OAuth is configured in Supabase dashboard
- Clear browser cookies and try again

### "Admin Panel not visible"
- Make sure your user role is 'admin' in database
- Use SQL from "Add Ollama Endpoint" section above

## Deploy to Production

### Using Docker Compose:

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

Access at: http://localhost (on your VPS)

### To a VPS:

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete instructions

## Next Steps

- 📚 Read [README.md](./README.md) for full documentation
- 🚀 Read [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
- 💻 Read [IMPLEMENTATION.md](./IMPLEMENTATION.md) for technical details

## Support

- Check logs in terminal windows
- Review error messages in browser console
- Consult README.md troubleshooting section
- Check Supabase dashboard for database issues

## That's It! 🎉

You now have:
- ✅ Secure Google OAuth authentication
- ✅ Multi-endpoint Ollama support
- ✅ Streaming token responses
- ✅ Light/dark theme
- ✅ Admin management panel
- ✅ Conversation history
- ✅ Usage metrics and analytics

Start chatting with your AI models!
