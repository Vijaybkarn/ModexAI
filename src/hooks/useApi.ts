import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function useApi() {
  const { session } = useAuth();

  async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = session?.access_token;

    let url = `${API_BASE_URL}${endpoint}`;

    if (API_BASE_URL.includes('supabase.co/functions')) {
      url = endpoint.replace('/api/', `${API_BASE_URL}/`);
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (API_BASE_URL.includes('supabase.co') && SUPABASE_ANON_KEY) {
      headers['apikey'] = SUPABASE_ANON_KEY;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || 'API request failed');
    }

    return response.json();
  }

  return { apiRequest };
}
