import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { initDatabase } from './database.js';
import userRoutes from './routes/users.js';
import simulationRoutes from './routes/simulation.js';
import webhookRoutes from './routes/webhooks.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Initialize Database & Run Server
const startServer = async () => {
  try {
    console.log('🔄 Initializing SQLite databases...');
    await initDatabase();
    console.log('✅ SQLite database schema set up.');

    // Register routes
    app.use('/api/users', userRoutes);
    app.use('/api/simulation', simulationRoutes);
    app.use('/webhooks', webhookRoutes);

    // Root info healthcheck
    app.get('/', (req, res) => {
      res.json({
        status: "online",
        app: config.appName,
        mode: config.useMockApis ? "Simulation" : "Live Integration",
        database: "SQLite"
      });
    });

    app.listen(config.port, () => {
      console.log(`🚀 server running at http://localhost:${config.port}`);
      console.log(`📡 CORS enabled for all origins.`);
    });
  } catch (err) {
    console.error('❌ Failed to start integration server:', err.message);
    process.exit(1);
  }
};

startServer();
