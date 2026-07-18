import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { SchedulerController } from '../controllers/scheduler.controller';
import { validateSchedulerKey } from '../middlewares/auth';

const router = Router();

// Order management routes
router.post('/orders', OrderController.createOrder);
router.get('/orders', OrderController.getOrders);
router.get('/orders/:id', OrderController.getOrderDetails);

// Scheduler routes (runScheduler is protected by x-scheduler-key header / bearer authorization)
router.post('/scheduler/run', validateSchedulerKey, SchedulerController.runScheduler);
router.get('/scheduler/logs', SchedulerController.getLogs);

export default router;
