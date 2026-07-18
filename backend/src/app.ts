import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { env } from './config/env';
import { connectDB } from './config/db';
import apiRoutes from './routes/api.routes';
import { errorHandler } from './middlewares/errorHandler';
import { SchedulerService } from './services/scheduler.service';

const app = express();

// 1. Establish Database Connection
connectDB();

// 2. Middlewares
app.use(cors());
app.use(express.json());

// 3. API Routes
app.use('/api/v1', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// 4. Global Error Handling Middleware
app.use(errorHandler);

// 5. Initialize Server
const server = app.listen(env.PORT, () => {
  console.log(`Server is running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  console.log(`Scheduler endpoint secured: /api/v1/scheduler/run`);
});

// 6. Local Node-Cron Scheduler Simulation (Run every 5 minutes)
// We use a configurable cron expression. For local testing, one could change it to run more frequently.
const CRON_INTERVAL = process.env.SCHEDULER_CRON_INTERVAL || '*/5 * * * *'; // default: every 5 minutes
console.log(`Local scheduler cron scheduled with expression: '${CRON_INTERVAL}'`);

cron.schedule(CRON_INTERVAL, async () => {
  console.log(`[Cron Scheduler] Execution tick triggered at ${new Date().toISOString()}`);
  try {
    const summary = await SchedulerService.runScheduler();
    console.log(`[Cron Scheduler] Completed. Processed: ${summary.processedCount}, Updated: ${summary.updatedOrdersCount}, Status: ${summary.status}`);
  } catch (error) {
    console.error(`[Cron Scheduler] Error running scheduled tick: ${(error as Error).message}`);
  }
});

export default app;
