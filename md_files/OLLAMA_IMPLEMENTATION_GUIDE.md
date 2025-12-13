# Ollama Model Selection Implementation Guide

## Overview

This document provides a complete guide for the Ollama model selection feature integrated into the AI Chat Platform. The implementation connects to **https://llm-api.gosetle.com/api/generate** and provides a full-featured model selection interface.

## ✅ Completed Implementation

### 1. Environment Configuration

**Frontend (`.env`):**
```bash
VITE_SUPABASE_URL=https://uohfnovafbtnnnztrbmv.supabase.co
VITE_SUPABASE_ANON_KEY=<your-key>
VITE_API_URL=http://localhost:3001
VITE_OLLAMA_API_URL=https://llm-api.gosetle.com
```

**Backend (`backend/.env`):**
```bash
PORT=3001
NODE_ENV=development

SUPABASE_URL=https://uohfnovafbtnnnztrbmv.supabase.co
SUPABASE_ANON_KEY=<your-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

JWT_SECRET=super-secret-jwt-key-change-in-production
ENCRYPTION_KEY=32-char-encryption-key-required

CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Ollama Configuration
OLLAMA_API_URL=https://llm-api.gosetle.com
OLLAMA_LOCAL_URL=http://localhost:11434
```

### 2. Database Schema

The following tables were created with full Row Level Security (RLS):

#### `ollama_endpoints`
Stores API endpoints for Ollama services.

```sql
- id (uuid)
- name (text) - "Gosetle AI"
- base_url (text) - "https://llm-api.gosetle.com"
- is_local (boolean)
- api_key (text, nullable)
- is_enabled (boolean)
- health_status (text)
- last_health_check (timestamptz)
- created_at, updated_at (timestamptz)
```

**Default Endpoint:** Pre-configured "Gosetle AI" endpoint at https://llm-api.gosetle.com

#### `models`
Stores available Ollama models fetched from the API.

```sql
- id (uuid)
- endpoint_id (uuid) - FK to ollama_endpoints
- name (text) - Display name (e.g., "qwen2.5:0.5b")
- model_id (text) - Ollama model identifier
- size (bigint) - Model size in bytes
- digest (text) - Model version digest
- modified_at (timestamptz)
- parameters (jsonb) - Temperature, max_tokens, etc.
- is_enabled (boolean)
- created_at, updated_at (timestamptz)
```

**Pre-loaded Models:**
- qwen2.5:0.5b (398MB)
- llava:7b (4.7GB)

### 3. Backend API Implementation

#### File: `backend/src/services/ollama.ts`

**OllamaService** class provides:

- `fetchModels(endpointUrl)` - Fetch available models from /api/tags
  - 5-minute cache to reduce API calls
  - Error handling with timeout (10s)
  - Returns array of OllamaModel objects

- `generate(request, endpointUrl)` - Non-streaming generation
  - POST to /api/generate
  - 120s timeout for long responses
  - Returns complete response

- `generateStream(request, endpointUrl)` - Streaming generation
  - Async generator for token-by-token streaming
  - Server-Sent Events (SSE) compatible
  - Handles connection cleanup

- `healthCheck(endpointUrl)` - Check endpoint availability
  - GET /api/version
  - 5s timeout
  - Returns boolean status

**Usage Example:**
```typescript
import { ollamaService } from './services/ollama.js';

// Fetch models
const models = await ollamaService.fetchModels('https://llm-api.gosetle.com');

// Generate response
const response = await ollamaService.generate({
  model: 'qwen2.5:0.5b',
  prompt: 'Hello, how are you?',
  stream: false
});
```

#### File: `backend/src/routes/models.ts`

**API Endpoints:**

1. `GET /api/models` - List all enabled models (authenticated)
   - Returns models with endpoint info
   - Requires: JWT auth token

2. `GET /api/models/:id` - Get specific model details

3. `POST /api/models/sync/:endpointId` - Sync models from Ollama API (admin only)
   - Fetches models from endpoint
   - Upserts into database
   - Creates audit log

4. `POST /api/models` - Create model manually (admin)

5. `PATCH /api/models/:id` - Update model configuration (admin)

6. `DELETE /api/models/:id` - Delete model (admin)

#### File: `backend/src/routes/chat.ts`

**Chat API with Streaming:**

`POST /api/chat` - Send message and get AI response

**Request Body:**
```json
{
  "conversation_id": "uuid",
  "model_id": "uuid",
  "message": "Your message here",
  "stream": true
}
```

**Streaming Response (SSE):**
```
data: {"content":"Hello","done":false}
data: {"content":" there","done":false}
data: {"content":"!","done":true}
data: [DONE]
```

**Features:**
- Real-time token streaming via SSE
- Automatic message storage in database
- Usage logging (tokens, response time)
- Error handling with graceful fallback

### 4. Frontend Implementation

#### File: `src/components/chat/ModelSelector.tsx`

**ModelSelector Component:**

Features:
- Dropdown interface with model selection
- Automatic model fetching on mount
- Loading states while fetching
- Error handling with user feedback
- Auto-selects first model if none selected
- Displays model metadata:
  - Model name
  - Endpoint name
  - Model size in GB
  - Model digest (version)

**Props:**
```typescript
interface ModelSelectorProps {
  selectedModelId?: string;
  onModelSelect: (modelId: string) => void;
  disabled?: boolean;
}
```

**Usage:**
```tsx
import { ModelSelector } from './components/chat/ModelSelector';

function ChatPage() {
  const [selectedModel, setSelectedModel] = useState<string>();

  return (
    <ModelSelector
      selectedModelId={selectedModel}
      onModelSelect={setSelectedModel}
      disabled={false}
    />
  );
}
```

#### File: `src/hooks/useApi.ts`

API hook for authenticated requests:

```typescript
const { apiRequest } = useApi();

// Fetch models
const models = await apiRequest<Model[]>('/api/models');

// Send chat message
const response = await apiRequest('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ conversation_id, model_id, message })
});
```

Features:
- Automatic JWT token inclusion
- Error handling
- TypeScript generic support

#### File: `src/types/index.ts`

Updated **Model** interface:

```typescript
export interface Model {
  id: string;
  endpoint_id: string;
  name: string;
  model_id: string;
  size?: number;
  digest?: string;
  modified_at?: string;
  parameters?: Record<string, unknown>;
  is_enabled: boolean;
  ollama_endpoints?: {
    id: string;
    name: string;
    base_url: string;
    is_local: boolean;
  };
}
```

## 🚀 Running the Application

### Prerequisites
- Node.js 18+
- npm
- Supabase account

### Development Setup

1. **Install Dependencies:**
```bash
# Frontend
npm install

# Backend
cd backend && npm install
```

2. **Start Backend Server:**
```bash
cd backend
npm run dev
```
Server runs on: http://localhost:3001

3. **Start Frontend (separate terminal):**
```bash
npm run dev
```
Frontend runs on: http://localhost:5173

### Production Build

```bash
# Build frontend
npm run build

# Build backend
cd backend && npm run build
```

## 📡 API Integration Details

### Ollama API Endpoints

**Base URL:** https://llm-api.gosetle.com

1. **GET /api/tags** - List available models
   ```json
   {
     "models": [
       {
         "name": "qwen2.5:0.5b",
         "model": "qwen2.5:0.5b",
         "modified_at": "2025-11-02T06:37:33.800845666Z",
         "size": 397821319,
         "digest": "a8b0c515..."
       }
     ]
   }
   ```

2. **POST /api/generate** - Generate completion
   ```json
   {
     "model": "qwen2.5:0.5b",
     "prompt": "Hello",
     "stream": true,
     "options": {
       "temperature": 0.7,
       "top_p": 0.9
     }
   }
   ```

3. **GET /api/version** - Health check endpoint

### Error Handling

The implementation includes comprehensive error handling:

1. **Network Errors** - 10s timeout for /api/tags, 120s for /api/generate
2. **API Errors** - Graceful fallback with user-friendly messages
3. **Authentication Errors** - 401/403 handled with redirect to login
4. **Model Not Found** - 404 with error message
5. **Streaming Errors** - Connection cleanup and error notification

### Caching Strategy

- **Model List Cache:** 5 minutes
  - Reduces API calls to Ollama
  - Per-endpoint caching
  - Manual cache clearing available

- **Health Check Cache:** None (real-time)

## 🔒 Security Features

1. **JWT Authentication** - All API endpoints require valid JWT token
2. **Row Level Security (RLS)** - Database-level access control
3. **Rate Limiting** - 100 requests per 15 minutes per IP
4. **CORS Protection** - Whitelisted origins only
5. **Input Validation** - Zod schema validation (planned)
6. **API Key Encryption** - AES-256-GCM for stored API keys
7. **Audit Logging** - All admin actions logged

## 📊 Usage Tracking

Every chat interaction is logged in `usage_logs`:
- User ID
- Model ID
- Endpoint ID
- Tokens used
- Response time (ms)
- Timestamp

Access via:
- `GET /api/metrics/usage/user` - Personal usage
- `GET /api/metrics/usage/all` - All usage (admin only)

## 🧪 Testing

### Test Model Fetching
```bash
curl http://localhost:3001/api/models \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Ollama API Directly
```bash
curl https://llm-api.gosetle.com/api/tags
```

### Test Chat Streaming
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "uuid",
    "model_id": "uuid",
    "message": "Hello",
    "stream": true
  }'
```

## 📝 Adding New Models

### Method 1: Automatic Sync (Recommended)

1. Ensure endpoint exists in database
2. Call sync endpoint (admin):
   ```bash
   POST /api/models/sync/:endpointId
   ```

### Method 2: Manual SQL Insert

```sql
INSERT INTO models (endpoint_id, name, model_id, size, digest, is_enabled)
VALUES (
  'endpoint-uuid',
  'model-name',
  'model-identifier',
  size_in_bytes,
  'digest-hash',
  true
);
```

### Method 3: Admin API (if you have admin access)

```bash
curl -X POST http://localhost:3001/api/models \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_id": "uuid",
    "name": "llama2:7b",
    "model_id": "llama2:7b",
    "parameters": {"temperature": 0.7}
  }'
```

## 🔧 Configuration Options

### Model Parameters

Customize model behavior in `parameters` JSONB field:

```json
{
  "temperature": 0.7,
  "top_p": 0.9,
  "top_k": 40,
  "num_predict": 128,
  "repeat_penalty": 1.1
}
```

### Local Development with Local Ollama

1. Install Ollama locally
2. Update `.env`:
   ```bash
   OLLAMA_API_URL=http://localhost:11434
   ```
3. Pull models:
   ```bash
   ollama pull qwen2.5:0.5b
   ```

## 🐛 Troubleshooting

### Models not appearing in dropdown

1. Check backend is running: `curl http://localhost:3001/health`
2. Verify database has models:
   ```sql
   SELECT * FROM models WHERE is_enabled = true;
   ```
3. Check browser console for errors
4. Verify JWT token is valid

### Streaming not working

1. Ensure SSE is not blocked by proxy
2. Check CORS headers in backend
3. Verify model exists and is enabled
4. Check backend logs for errors

### "Connection refused" errors

- Backend not running - start with `npm run dev` in backend directory
- Wrong API URL in frontend `.env`
- Firewall blocking port 3001

## 📚 API Reference

### Models Endpoint

```typescript
GET /api/models
Authorization: Bearer <jwt-token>

Response: Model[]
```

### Chat Endpoint

```typescript
POST /api/chat
Authorization: Bearer <jwt-token>
Content-Type: application/json

Body: {
  conversation_id: string;
  model_id: string;
  message: string;
  stream?: boolean;
}

Response (stream=true): text/event-stream
Response (stream=false): {
  userMessage: Message;
  assistantMessage: Message;
  response: string;
}
```

### Metrics Endpoint

```typescript
GET /api/metrics/usage/user
Authorization: Bearer <jwt-token>

Response: UsageLog[]
```

## 🎯 Next Steps

1. **Enable Admin Panel** - Implement UI for model management
2. **Add Model Discovery** - UI to sync models from Ollama
3. **Conversation Management** - List and manage chat history
4. **Usage Dashboard** - Visualize token usage and costs
5. **Model Testing** - Built-in model testing interface
6. **Webhook Integration** - Real-time model status updates

## 📄 License

MIT License - see LICENSE file for details

---

**Implementation Date:** November 15, 2025
**Ollama API:** https://llm-api.gosetle.com
**Status:** ✅ Fully Operational
