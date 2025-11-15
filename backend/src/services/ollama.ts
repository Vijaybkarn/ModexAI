import logger from '../config/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'https://llm-api.gosetle.com';
const OLLAMA_LOCAL_URL = process.env.OLLAMA_LOCAL_URL || 'http://localhost:11434';

export interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaService {
  private baseUrl: string;
  private modelsCache: Map<string, { models: OllamaModel[]; timestamp: number }> = new Map();
  private cacheTTL: number = 5 * 60 * 1000;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || OLLAMA_API_URL;
  }

  async fetchModels(endpointUrl?: string): Promise<OllamaModel[]> {
    const url = endpointUrl || this.baseUrl;
    const cacheKey = url;

    const cached = this.modelsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      logger.info(`Using cached models for ${url}`);
      return cached.models;
    }

    try {
      logger.info(`Fetching models from ${url}/api/tags`);

      const response = await fetch(`${url}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json() as { models: OllamaModel[] };
      const models = data.models || [];

      this.modelsCache.set(cacheKey, { models, timestamp: Date.now() });

      logger.info(`Successfully fetched ${models.length} models from ${url}`);
      return models;
    } catch (error) {
      logger.error(`Error fetching models from ${url}:`, error);
      throw new Error(`Failed to fetch models: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generate(request: OllamaGenerateRequest, endpointUrl?: string): Promise<OllamaGenerateResponse> {
    const url = endpointUrl || this.baseUrl;

    try {
      logger.info(`Generating response from ${url}/api/generate with model ${request.model}`);

      const response = await fetch(`${url}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(120000),
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.statusText}`);
      }

      const data = await response.json() as OllamaGenerateResponse;
      return data;
    } catch (error) {
      logger.error(`Error generating response from ${url}:`, error);
      throw new Error(`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async *generateStream(
    request: OllamaGenerateRequest,
    endpointUrl?: string
  ): AsyncGenerator<OllamaGenerateResponse, void, unknown> {
    const url = endpointUrl || this.baseUrl;

    try {
      logger.info(`Starting stream generation from ${url}/api/generate with model ${request.model}`);

      const response = await fetch(`${url}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...request, stream: true }),
        signal: AbortSignal.timeout(120000),
      });

      if (!response.ok) {
        throw new Error(`Stream generation failed: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body for streaming');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line) as OllamaGenerateResponse;
                yield data;

                if (data.done) {
                  return;
                }
              } catch (parseError) {
                logger.warn('Failed to parse streaming line:', line);
              }
            }
          }
        }

        if (buffer.trim()) {
          try {
            const data = JSON.parse(buffer) as OllamaGenerateResponse;
            yield data;
          } catch (parseError) {
            logger.warn('Failed to parse final buffer:', buffer);
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      logger.error(`Error in stream generation from ${url}:`, error);
      throw new Error(`Stream generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async healthCheck(endpointUrl?: string): Promise<boolean> {
    const url = endpointUrl || this.baseUrl;

    try {
      const response = await fetch(`${url}/api/version`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      return response.ok;
    } catch (error) {
      logger.warn(`Health check failed for ${url}:`, error);
      return false;
    }
  }

  clearCache(endpointUrl?: string) {
    if (endpointUrl) {
      this.modelsCache.delete(endpointUrl);
    } else {
      this.modelsCache.clear();
    }
  }
}

export const ollamaService = new OllamaService();
