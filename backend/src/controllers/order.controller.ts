import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';
import crypto from 'crypto';

export class OrderController {
  /**
   * Create order handler.
   */
  public static async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { customerName, phoneNumber, productName, amount, paymentStatus, idempotencyKey } = req.body;

      // 1. Validation
      if (!customerName || typeof customerName !== 'string' || customerName.trim() === '') {
        res.status(400).json({ success: false, error: 'Customer name is required and must be a valid string.' });
        return;
      }

      if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim() === '') {
        res.status(400).json({ success: false, error: 'Phone number is required.' });
        return;
      }

      if (!productName || typeof productName !== 'string' || productName.trim() === '') {
        res.status(400).json({ success: false, error: 'Product name is required.' });
        return;
      }

      if (amount === undefined || typeof amount !== 'number' || amount < 0) {
        res.status(400).json({ success: false, error: 'Amount is required and must be a positive number.' });
        return;
      }

      // Generate a fallback idempotency key if not sent by client (server-side deduplication)
      // Any identical order submitted within the same 1-minute bucket will generate the same key
      const timeBucket = Math.floor(Date.now() / (60 * 1000));
      const finalIdempotencyKey =
        idempotencyKey && typeof idempotencyKey === 'string' && idempotencyKey.trim() !== ''
          ? idempotencyKey
          : crypto
              .createHash('md5')
              .update(`${customerName.trim()}-${phoneNumber.trim()}-${productName.trim()}-${amount}-${timeBucket}`)
              .digest('hex');


      // 2. Business Logic Execution
      const order = await OrderService.createOrder({
        customerName: customerName.trim(),
        phoneNumber: phoneNumber.trim(),
        productName: productName.trim(),
        amount,
        paymentStatus,
        idempotencyKey: finalIdempotencyKey,
      });

      res.status(201).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List/Filter orders handler.
   */
  public static async getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      const result = await OrderService.getOrders({
        status,
        search,
        page,
        limit,
      });

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get order count metrics/statistics.
   */
  public static async getOrderStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await OrderService.getOrderStats();
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get specific order details with history logs.
   */
  public static async getOrderDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const result = await OrderService.getOrderDetails(id);
      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Order not found.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result.order,
        history: result.history,
      });
    } catch (error) {
      next(error);
    }
  }
}
