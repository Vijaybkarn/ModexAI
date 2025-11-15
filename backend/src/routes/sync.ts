import express from 'express';
import { supabase } from '../config/supabase.js';
import logger from '../config/logger.js';
import { ollamaService } from '../services/ollama.js';

const router = express.Router();

router.post('/sync-models/:endpointId', async (req, res) => {
  try {
    const { endpointId } = req.params;

    const { data: endpoint, error: endpointError } = await supabase
      .from('ollama_endpoints')
      .select('*')
      .eq('id', endpointId)
      .single();

    if (endpointError || !endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    logger.info(`Syncing models from ${endpoint.base_url}`);

    const ollamaModels = await ollamaService.fetchModels(endpoint.base_url);

    logger.info(`Found ${ollamaModels.length} models from Ollama API`);

    const modelsToInsert = ollamaModels.map(m => ({
      endpoint_id: endpointId,
      name: m.name,
      model_id: m.model || m.name,
      size: m.size,
      digest: m.digest,
      modified_at: m.modified_at,
      is_enabled: true
    }));

    const { data: syncedModels, error: syncError } = await supabase
      .from('models')
      .upsert(modelsToInsert, {
        onConflict: 'endpoint_id,model_id',
        ignoreDuplicates: false
      })
      .select();

    if (syncError) {
      logger.error('Sync error:', syncError);
      throw syncError;
    }

    logger.info(`Successfully synced ${syncedModels?.length || 0} models`);

    res.json({
      message: 'Models synced successfully',
      count: syncedModels?.length || 0,
      models: syncedModels
    });
  } catch (error) {
    logger.error('Error syncing models:', error);
    res.status(500).json({
      error: 'Failed to sync models',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
