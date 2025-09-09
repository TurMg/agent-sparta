import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './routes/auth';
import documentRoutes from './routes/documents';
import aiRoutes from './routes/ai';
import productRoutes from './routes/products';
import whatsappRoutes from './routes/whatsapp';
import { initDatabase, closeConnection } from './database/init';
import { errorHandler } from './middleware/errorHandler';
import { startMCPServer } from './mcp/server';

// Load environment variables
dotenv.config({ path: '.env' });

// Debug environment variables
console.log('🔧 Environment check:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware with relaxed CSP for images
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers
      imgSrc: ["'self'", "data:", "blob:", "http://localhost:3001", "http://localhost:3000"], // Allow images from both origins
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'"],
      frameSrc: ["'self'"],
    },
  },
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files - serve from project root uploads directory  
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/products', productRoutes);
app.use('/api/whatsapp', whatsappRoutes);


// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    await initDatabase();
    console.log('✅ Database initialized');
    
    // Start MCP server in background
    startMCPServer();
    console.log('✅ MCP server started');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📝 API Documentation: http://localhost:${PORT}/api/health`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('📴 Shutting down gracefully...');
      await closeConnection();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('📴 Shutting down gracefully...');
      await closeConnection();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
