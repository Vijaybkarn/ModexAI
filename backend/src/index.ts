import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import logger from './config/logger.js';
import chatRoutes from './routes/chat.js';
import conversationRoutes from './routes/conversations.js';
import endpointRoutes from './routes/endpoints.js';
import modelRoutes from './routes/models.js';
import metricsRoutes from './routes/metrics.js';
import syncRoutes from './routes/sync.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
logger.info('🔗 Registering API routes...');
app.use('/api/chat', chatRoutes); // Chat streaming endpoint (GET /api/chat for SSE)
logger.info('   ✅ /api/chat - Chat routes');
app.use('/api/conversations', conversationRoutes); // Conversations CRUD
logger.info('   ✅ /api/conversations - Conversation routes');
app.use('/api/endpoints', endpointRoutes);
logger.info('   ✅ /api/endpoints - Endpoint routes');
app.use('/api/models', modelRoutes);
logger.info('   ✅ /api/models - Model routes');
app.use('/api/metrics', metricsRoutes);
logger.info('   ✅ /api/metrics - Metrics routes');
app.use('/api/admin', syncRoutes);
logger.info('   ✅ /api/admin - Admin routes');
logger.info('✅ All routes registered');

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
