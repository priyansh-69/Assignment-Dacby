import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export const validateSchedulerKey = (req: Request, res: Response, next: NextFunction): void => {
  const incomingKey = req.headers['x-scheduler-key'] || req.headers['authorization'];
  
  const expectedKey = env.SCHEDULER_SECRET_KEY;

  // Handle Bearer prefix if the authorization header is used
  let key = incomingKey;
  if (typeof incomingKey === 'string' && incomingKey.startsWith('Bearer ')) {
    key = incomingKey.substring(7);
  }

  if (!key || key !== expectedKey) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized. Invalid or missing scheduler secret key.',
    });
    return;
  }

  next();
};
