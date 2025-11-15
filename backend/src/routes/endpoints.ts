import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data: endpoints, error } = await supabase
      .from('ollama_endpoints')
      .select('*')
      .eq('is_enabled', true)
      .order('name');

    if (error) throw error;

    res.json(endpoints || []);
  } catch (error) {
    logger.error('Error fetching endpoints:', error);
    res.status(500).json({ error: 'Failed to fetch endpoints' });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data: endpoint, error } = await supabase
      .from('ollama_endpoints')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!endpoint) return res.status(404).json({ error: 'Endpoint not found' });

    res.json(endpoint);
  } catch (error) {
    logger.error('Error fetching endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch endpoint' });
  }
});

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, base_url, is_local, api_key } = req.body;

    const { data: endpoint, error } = await supabase
      .from('ollama_endpoints')
      .insert({
        name,
        base_url,
        is_local: is_local || false,
        api_key,
        is_enabled: true,
        health_status: 'unknown'
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id: req.user!.id,
      action: 'endpoint_created',
      resource_type: 'endpoint',
      resource_id: endpoint.id,
      details: { name, base_url }
    });

    res.status(201).json(endpoint);
  } catch (error) {
    logger.error('Error creating endpoint:', error);
    res.status(500).json({ error: 'Failed to create endpoint' });
  }
});

router.patch('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const updates = req.body;

    const { data: endpoint, error } = await supabase
      .from('ollama_endpoints')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id: req.user!.id,
      action: 'endpoint_updated',
      resource_type: 'endpoint',
      resource_id: req.params.id,
      details: updates
    });

    res.json(endpoint);
  } catch (error) {
    logger.error('Error updating endpoint:', error);
    res.status(500).json({ error: 'Failed to update endpoint' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { error } = await supabase
      .from('ollama_endpoints')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id: req.user!.id,
      action: 'endpoint_deleted',
      resource_type: 'endpoint',
      resource_id: req.params.id
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting endpoint:', error);
    res.status(500).json({ error: 'Failed to delete endpoint' });
  }
});

export default router;
