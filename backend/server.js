import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { initDatabase } from './database.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import healthRoutes from './routes/health.js';
import analysisRoutes from './routes/analysis.js';

app.use("/health", healthRoutes);
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize database and start server
initDatabase()
  .then(() => {
    // Root route
    app.get('/', (req, res) => {
      res.json({ 
        status: 'ok', 
        message: 'Health Tracker API Server',
        version: '1.0.0',
        endpoints: {
          healthCheck: '/api/health-check',
          auth: '/api/auth',
          user: '/api/user',
          health: '/api/health',
          analysis: '/api/analysis'
        }
      });
    });

    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/user', userRoutes);
    app.use('/api/health', healthRoutes);
    app.use('/api/analysis', analysisRoutes);

    // Health check
    app.get('/api/health-check', (req, res) => {
      res.json({ status: 'ok', message: 'Server is running' });
    });

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

