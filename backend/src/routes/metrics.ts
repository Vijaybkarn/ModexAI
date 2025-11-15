import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

router.get('/usage/user', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data: usage, error } = await supabase
      .from('usage_logs')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    res.json(usage || []);
  } catch (error) {
    logger.error('Error fetching user usage:', error);
    res.status(500).json({ error: 'Failed to fetch usage data' });
  }
});

router.get('/usage/all', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { data: usage, error } = await supabase
      .from('usage_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;

    res.json(usage || []);
  } catch (error) {
    logger.error('Error fetching all usage:', error);
    res.status(500).json({ error: 'Failed to fetch usage data' });
  }
});

export default router;
