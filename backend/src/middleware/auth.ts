import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase.js';
import logger from '../config/logger.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn('Authentication failed:', error?.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, role, is_active')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.is_active) {
      return res.status(403).json({ error: 'Account inactive or not found' });
    }

    req.user = {
      id: user.id,
      email: user.email || '',
      role: profile.role
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
