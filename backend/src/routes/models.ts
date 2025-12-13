import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import logger from '../config/logger.js';
import { ollamaService } from '../services/ollama.js';

const router = express.Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    logger.info('📥 Models API: Request received');
    logger.info(`📥 Models API: User ID: ${req.user?.id}, Email: ${req.user?.email}`);

    const { data: models, error } = await supabase
      .from('models')
      .select(`
        *,
        ollama_endpoints (
          id,
          name,
          base_url,
          is_local
        )
      `)
      .eq('is_enabled', true)
      .order('name');

    if (error) {
      logger.error('❌ Models API: Database error:', error);
      throw error;
    }

    logger.info(`✅ Models API: Found ${models?.length || 0} enabled model(s)`);
    if (models && models.length > 0) {
      models.forEach((m, i) => {
        logger.info(`   ${i + 1}. ${m.name} (${m.model_id}) - Endpoint: ${m.ollama_endpoints?.name || 'Unknown'}`);
      });
    } else {
      logger.warn('⚠️  Models API: No enabled models found in database');
      logger.warn('   Possible causes:');
      logger.warn('   1. Models haven\'t been synced yet');
      logger.warn('   2. All models are disabled (is_enabled = false)');
      logger.warn('   3. No endpoint is configured');
    }

    res.json(models || []);
  } catch (error) {
    logger.error('❌ Models API: Error fetching models:', error);
    logger.error('   Error details:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data: model, error } = await supabase
      .from('models')
      .select(`
        *,
        ollama_endpoints (
          id,
          name,
          base_url,
          is_local
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!model) return res.status(404).json({ error: 'Model not found' });

    res.json(model);
  } catch (error) {
    logger.error('Error fetching model:', error);
    res.status(500).json({ error: 'Failed to fetch model' });
  }
});

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { endpoint_id, name, model_id, parameters } = req.body;

    const { data: model, error } = await supabase
      .from('models')
      .insert({
        endpoint_id,
        name,
        model_id,
        parameters: parameters || {},
        is_enabled: true
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id: req.user!.id,
      action: 'model_created',
      resource_type: 'model',
      resource_id: model.id,
      details: { name, model_id }
    });

    res.status(201).json(model);
  } catch (error) {
    logger.error('Error creating model:', error);
    res.status(500).json({ error: 'Failed to create model' });
  }
});

router.patch('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const updates = req.body;

    const { data: model, error } = await supabase
      .from('models')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id: req.user!.id,
      action: 'model_updated',
      resource_type: 'model',
      resource_id: req.params.id,
      details: updates
    });

    res.json(model);
  } catch (error) {
    logger.error('Error updating model:', error);
    res.status(500).json({ error: 'Failed to update model' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { error } = await supabase
      .from('models')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id: req.user!.id,
      action: 'model_deleted',
      resource_type: 'model',
      resource_id: req.params.id
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting model:', error);
    res.status(500).json({ error: 'Failed to delete model' });
  }
});

router.post('/sync/:endpointId', authenticate, requireAdmin, async (req: AuthRequest, res) => {
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

    const ollamaModels = await ollamaService.fetchModels(endpoint.base_url);

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

    if (syncError) throw syncError;

    // Disable models that no longer exist in Ollama (for this endpoint)
    const ollamaModelIds = new Set(ollamaModels.map(m => m.model || m.name));
    const { data: dbModels } = await supabase
      .from('models')
      .select('id, name, model_id')
      .eq('endpoint_id', endpointId);

    if (dbModels) {
      const staleModels = dbModels.filter(m => !ollamaModelIds.has(m.model_id));
      if (staleModels.length > 0) {
        const staleModelIds = staleModels.map(m => m.id);
        await supabase
          .from('models')
          .update({ is_enabled: false })
          .in('id', staleModelIds);
        logger.info(`Disabled ${staleModels.length} stale model(s) for endpoint ${endpointId}`);
      }
    }

    await supabase.from('audit_logs').insert({
      user_id: req.user!.id,
      action: 'models_synced',
      resource_type: 'endpoint',
      resource_id: endpointId,
      details: { count: syncedModels?.length || 0 }
    });

    res.json({ message: 'Models synced successfully', models: syncedModels });
  } catch (error) {
    logger.error('Error syncing models:', error);
    res.status(500).json({ error: 'Failed to sync models' });
  }
});

export default router;
