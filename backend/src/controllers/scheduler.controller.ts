import { Request, Response, NextFunction } from 'express';
import { SchedulerService } from '../services/scheduler.service';

export class SchedulerController {
  /**
   * Endpoint to run the scheduler task.
   * Typically targeted by external cron engines, or triggered from the dashboard.
   */
  public static async runScheduler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('Scheduler execution manually/API triggered...');
      const summary = await SchedulerService.runScheduler();
      
      const statusCode = summary.status === 'SUCCESS' ? 200 : 500;
      res.status(statusCode).json({
        success: summary.status === 'SUCCESS',
        summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint to retrieve scheduler logs for display.
   */
  public static async getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const logs = await SchedulerService.getLogs(limit);
      
      res.status(200).json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }
}
