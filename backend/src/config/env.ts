import dotenv from 'dotenv';
import path from 'path';

// Load keys.env or .env from the project root directory
dotenv.config({ path: path.resolve(__dirname, '../../../keys.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
// Also load local .env if present in backend directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });


export const env = {
  PORT: parseInt(process.env.PORT || '5001', 10),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/order_management',
  SCHEDULER_SECRET_KEY: process.env.SCHEDULER_SECRET_KEY || 'super_secret_scheduler_key_12345',
  NODE_ENV: process.env.NODE_ENV || 'development',
  ORDER_PLACED_TIMEOUT_MS: parseInt(process.env.ORDER_PLACED_TIMEOUT_MS || '600000', 10),
  ORDER_PROCESSING_TIMEOUT_MS: parseInt(process.env.ORDER_PROCESSING_TIMEOUT_MS || '1200000', 10),
};
