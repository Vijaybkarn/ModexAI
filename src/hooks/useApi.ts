import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function useApi() {
  const { session } = useAuth();

  const apiRequest = useCallback(async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const token = session?.access_token;

    let url: string;

    if (API_BASE_URL.includes('supabase.co/functions')) {
      const functionPath = endpoint.replace('/api/', '').split('/')[0];
      const remainingPath = endpoint.replace('/api/' + functionPath, '');
      url = `${API_BASE_URL}/${functionPath}${remainingPath || ''}`;
    } else {
      url = `${API_BASE_URL}${endpoint}`;
    }

    console.log(`🌐 useApi: Making ${options.method || 'GET'} request to: ${url}`);
    console.log(`🔑 useApi: Has token: ${token ? 'Yes' : 'No'}`);
    console.log(`🔑 useApi: API Base URL: ${API_BASE_URL}`);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log(`🔑 useApi: Added Authorization header (token length: ${token.length})`);
    } else {
      console.warn('⚠️  useApi: No token available - request may fail with 401');
    }

    if (API_BASE_URL.includes('supabase.co') && SUPABASE_ANON_KEY) {
      headers['apikey'] = SUPABASE_ANON_KEY;
      console.log('🔑 useApi: Added apikey header for Supabase');
    }

    try {
      console.log('📤 useApi: Sending request...');
      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log(`📥 useApi: Response received - Status: ${response.status} ${response.statusText}`);
      console.log(`📥 useApi: Response OK: ${response.ok}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ useApi: Request failed with status ${response.status}`);
        console.error(`❌ useApi: Error response:`, errorText);
        
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: response.statusText || errorText };
        }
        
        throw new Error(error.error || `API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ useApi: Request successful, received data:`, data);
      return data;
    } catch (error) {
      console.error('❌ useApi: Request exception:', error);
      if (error instanceof Error) {
        console.error('   Error message:', error.message);
        console.error('   Error stack:', error.stack);
      }
      throw error;
    }
  }, [session?.access_token]);

  return { apiRequest };
}
