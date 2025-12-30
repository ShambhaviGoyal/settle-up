import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import groupRoutes from './routes/groupRoutes';
import expenseRoutes from './routes/expenseRoutes'; // Add this
import ocrRoutes from './routes/ocrRoutes';
import insightsRoutes from './routes/insightsRoutes';
import recurringRoutes from './routes/recurringRoutes';
import { processRecurring } from './controllers/recurringController';
import cron from 'node-cron';
import budgetRoutes from './routes/budgetRoutes';

dotenv.config();

const app: Express = express();
const port = parseInt(process.env.PORT || '3000');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes); // Add this
app.use('/api/ocr', ocrRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/budgets', budgetRoutes);

// Test route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Expense Splitter API is running!' });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server - listen on all network interfaces
app.listen(port, '0.0.0.0', () => {
  console.log(`⚡️ Server is running on http://localhost:${port}`);
  console.log(`📱 Mobile access: http://192.168.29.52:${port}`);
});

// Run recurring processor daily at midnight
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    processRecurring();
  }
}, 60000); // Check every minute

// Run daily at midnight
cron.schedule('0 0 * * *', () => {
  console.log('Running recurring expense processor...');
  processRecurring();
});

export default app;