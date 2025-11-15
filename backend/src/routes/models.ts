import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
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

    if (error) throw error;

    res.json(models || []);
  } catch (error) {
    logger.error('Error fetching models:', error);
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

export default router;
