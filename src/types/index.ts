export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: 'user' | 'admin';
  is_active: boolean;
}

export interface Model {
  id: string;
  endpoint_id: string;
  name: string;
  model_id: string;
  model_name?: string;
  model_alias?: string;
  description?: string;
  size?: number;
  size_gb?: number;
  digest?: string;
  modified_at?: string;
  parameters?: Record<string, unknown>;
  context_length?: number;
  default_temperature?: number;
  default_max_tokens?: number;
  estimated_cost_per_1k?: number;
  metadata?: Record<string, unknown>;
  is_enabled: boolean;
  created_at?: string;
  updated_at?: string;
  ollama_endpoints?: {
    id: string;
    name: string;
    base_url: string;
    is_local: boolean;
  };
}

export interface Conversation {
  id: string;
  user_id: string;
  title?: string;
  model_id?: string;
  system_prompt?: string;
  parameters?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  models?: Model;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  model_id?: string;
  tokens_used?: number;
  latency_ms?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface OllamaEndpoint {
  id: string;
  name: string;
  url: string;
  is_local: boolean;
  is_enabled: boolean;
  health_status: 'healthy' | 'unhealthy' | 'unknown';
  last_health_check?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export type Theme = 'light' | 'dark';
