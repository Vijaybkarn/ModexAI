# AI Chat Platform

A secure, production-ready generative-AI chat platform with Node.js backend and React frontend. Support multiple Ollama model endpoints (local and hosted), streaming responses, light/dark theme UI, Google OAuth login, and admin panel for endpoint management.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend (React + Vite)                   │
│  - Google OAuth login                                       │
│  - Multi-model chat interface with streaming               │
│  - Light/dark theme support                                │
│  - Admin panel for endpoint management                      │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS/REST
┌────────────────────▼────────────────────────────────────────┐
│                 Backend (Node.js/Express)                  │
│  - JWT authentication + rate limiting                      │
│  - Ollama connector (local & hosted endpoints)            │
│  - Streaming SSE for token delivery                       │
│  - Model caching & health checks                          │
│  - Usage metrics & audit logs                             │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
   ┌────▼──┐   ┌────▼──┐   ┌────▼──────┐
   │Supabase│   │Ollama │   │Ollama    │
   │ Postgres│   │Local  │   │Hosted    │
   └─────────┘   └───────┘   └──────────┘
```

## Features

### MVP Features
- ✅ Google OAuth authentication (OIDC)
- ✅ Chat with multiple Ollama model endpoints
- ✅ Streaming token responses (SSE)
- ✅ Conversation history persistence
- ✅ Model selection with metadata display
- ✅ Light/dark theme toggle
- ✅ Rate limiting & security headers

### Admin Features
- ✅ Register local and hosted Ollama endpoints
- ✅ Health checks for endpoint monitoring
- ✅ Model metadata management
- ✅ Enable/disable endpoints and models
- ✅ Usage analytics dashboard
- ✅ Audit log tracking

### Backend
- ✅ Express.js API server
- ✅ Supabase PostgreSQL integration
- ✅ JWT authentication middleware
- ✅ Rate limiting (express-rate-limit)
- ✅ Request/response validation (zod)
- ✅ Encrypted API key storage
- ✅ Comprehensive logging (winston)
- ✅ CORS security
- ✅ Helmet.js security headers

## Project Structure

```
project/
├── backend/                    # Node.js/Express server
│   ├── src/
│   │   ├── index.ts           # Main server entry
│   │   ├── config/            # Configuration (Supabase, logger)
│   │   ├── middleware/        # Auth, validation, CORS
│   │   ├── routes/            # API endpoints (chat, models, endpoints)
│   │   ├── services/          # Business logic (Ollama connector)
│   │   ├── utils/             # Encryption, helpers
│   │   └── types/             # TypeScript interfaces
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
└── src/                        # React frontend (Vite)
    ├── components/
    │   ├── auth/              # Login page
    │   ├── chat/              # Chat UI components
    │   ├── layout/            # Header, sidebar
    │   ├── admin/             # Admin panel (optional)
    │   └── common/            # Protected route, etc.
    ├── contexts/              # Auth, Theme providers
    ├── hooks/                 # useApi, useAuth, etc.
    ├── lib/                   # Supabase client
    ├── pages/                 # Page components
    ├── types/                 # Shared types
    ├── App.tsx               # Router setup
    └── main.tsx              # Entry point
```

## Database Schema

### Core Tables
- `profiles` - User profiles linked to auth.users
- `ollama_endpoints` - Registered Ollama endpoints (local/hosted)
- `models` - Available models on each endpoint
- `conversations` - User chat sessions
- `messages` - Individual messages in conversations
- `usage_logs` - Request metrics and usage tracking
- `audit_logs` - Security audit trail

All tables have:
- Row Level Security (RLS) enabled
- Automatic `updated_at` timestamps
- Appropriate indexes for performance
- Foreign key constraints

## Setup & Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase project (database already configured)
- Ollama instance(s) running locally or hosted

### Environment Configuration

1. **Frontend** (`.env`)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001
```

2. **Backend** (`backend/.env`)
```bash
PORT=3001
NODE_ENV=development

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

JWT_SECRET=your-jwt-secret-change-this
ENCRYPTION_KEY=your-32-char-encryption-key-here

CORS_ORIGIN=http://localhost:5173

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Installation & Running

1. **Install dependencies**
```bash
npm install
cd backend && npm install && cd ..
```

2. **Run frontend (development)**
```bash
npm run dev
```
Frontend will be available at `http://localhost:5173`

3. **Run backend (development)**
```bash
cd backend && npm run dev
```
Backend will be available at `http://localhost:3001`

### Building for Production

1. **Frontend build**
```bash
npm run build
```
Output: `dist/` directory

2. **Backend build**
```bash
cd backend && npm run build
```
Output: `backend/dist/` directory

## API Endpoints

### Chat Routes
- `POST /api/chat/conversations` - Create conversation
- `GET /api/chat/conversations` - List user conversations
- `GET /api/chat/conversations/:id` - Get conversation
- `GET /api/chat/conversations/:id/messages` - Get messages
- `POST /api/chat` - Send message with streaming response

### Models Routes
- `GET /api/models` - List enabled models
- `GET /api/models/:id` - Get model details
- `POST /api/models` - Create model (admin)
- `PATCH /api/models/:id` - Update model (admin)
- `DELETE /api/models/:id` - Delete model (admin)

### Endpoints Routes
- `GET /api/endpoints` - List enabled endpoints
- `GET /api/endpoints/:id` - Get endpoint details
- `POST /api/endpoints` - Register endpoint (admin)
- `PATCH /api/endpoints/:id` - Update endpoint (admin)
- `DELETE /api/endpoints/:id` - Delete endpoint (admin)
- `POST /api/endpoints/:id/health` - Health check (admin)
- `GET /api/endpoints/:id/models` - List available models on endpoint (admin)

### Metrics Routes
- `GET /api/metrics/usage/user` - User usage stats
- `GET /api/metrics/usage/all` - All usage stats (admin)
- `GET /api/metrics/usage/by-model` - Usage by model (admin)
- `GET /api/metrics/usage/by-user` - Usage by user (admin)

## Authentication Flow

1. User clicks "Sign in with Google"
2. Redirected to Supabase OAuth provider
3. Google OIDC authentication
4. Redirected back to app with session
5. Frontend stores JWT token in secure session
6. All API requests include `Authorization: Bearer <token>`
7. Backend verifies token with Supabase admin client

## Security Considerations

### Implemented
- ✅ Row Level Security (RLS) on all tables
- ✅ JWT token-based authentication
- ✅ Rate limiting (100 requests per 15 minutes per IP)
- ✅ CORS protection
- ✅ Helmet.js security headers
- ✅ Input validation (zod)
- ✅ Encrypted API key storage (AES-256-GCM)
- ✅ Audit logging for all admin actions
- ✅ HTTPS-only environment in production
- ✅ SQL injection protection (parameterized queries)

### Recommended for Production
- Use environment-based secrets (AWS Secrets Manager, HashiCorp Vault)
- Enable Supabase multi-factor authentication
- Set up WAF (CloudFlare, AWS WAF)
- Enable database backups
- Monitor with Sentry or similar APM
- Use managed authentication (Supabase Auth is good, consider additional layers)

## Deployment

### Docker Build

1. **Create `Dockerfile` for backend:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

2. **Create `Dockerfile` for frontend:**
```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Deployment Options

#### VPS (DigitalOcean, Linode, AWS EC2)
1. Install Docker & Docker Compose
2. Create `docker-compose.yml`
3. Deploy using `docker-compose up -d`
4. Use Nginx as reverse proxy
5. Set up SSL with Let's Encrypt

#### Kubernetes
1. Create Helm chart for both services
2. Deploy backend and frontend as separate services
3. Use Ingress for routing
4. Configure horizontal pod autoscaling
5. Use secrets for environment variables

#### Vercel (Frontend)
```bash
vercel deploy
```

#### Railway/Render (Backend)
Connect GitHub repo and deploy from dashboard

## Development Roadmap

### Phase 1 ✅ (Complete)
- Database schema with RLS
- Google OAuth authentication
- Backend API server with rate limiting
- Ollama connector and streaming
- React frontend with chat UI
- Light/dark theme

### Phase 2 (Optional)
- Admin panel UI improvements
- Conversation export (PDF, markdown)
- System prompt templates
- Model parameter presets
- Search conversations

### Phase 3 (Optional)
- Retrieval-Augmented Generation (RAG)
- Document upload and embedding
- Vector search over conversations
- User analytics dashboard
- Per-model usage limits

### Phase 4 (Optional)
- WebSocket support for real-time features
- Collaborative chat sessions
- Model fine-tuning via API
- Plugin system for extensions
- Webhook notifications

## Testing

### Unit Tests (Backend)
```bash
cd backend && npm test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests (Frontend)
```bash
npm run test:e2e
```

## Troubleshooting

### Ollama Connection Issues
- Verify Ollama is running: `curl http://localhost:11434/api/tags`
- Check firewall rules for hosted Ollama
- Ensure API key is correct if using hosted Ollama
- Verify endpoint URL is accessible from backend

### Authentication Issues
- Clear browser cookies and localStorage
- Check Supabase provider config for Google OAuth
- Verify redirect URI matches in Supabase settings
- Check browser console for error details

### Streaming Issues
- Ensure SSE is not blocked by proxies or firewalls
- Check that model is responding (test with curl)
- Verify browser supports EventSource API
- Check backend logs for streaming errors

## Support & Contributing

For issues, feature requests, or contributions, please:
1. Check existing issues
2. Provide clear description and reproduction steps
3. Include logs and environment details
4. Submit pull request with tests

## License

MIT License - feel free to use for personal and commercial projects.

## References

- [Supabase Documentation](https://supabase.com/docs)
- [Ollama API](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Express.js](https://expressjs.com/)
- [React Router](https://reactrouter.com/)
- [Tailwind CSS](https://tailwindcss.com/)
