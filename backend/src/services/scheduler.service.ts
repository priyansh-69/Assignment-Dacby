import { Order, IOrder, OrderStatus } from '../models/Order';
import { OrderStatusHistory } from '../models/OrderStatusHistory';
import { SchedulerLog, ISchedulerLog } from '../models/SchedulerLog';
import { Types } from 'mongoose';

export interface SchedulerRunResult {
  startTime: Date;
  endTime: Date;
  durationMs: number;
  status: 'SUCCESS' | 'FAILED';
  processedCount: number;
  updatedOrdersCount: number;
  updatedOrders: Array<{
    orderId: string;
    customOrderId: string;
    fromStatus: string;
    toStatus: string;
  }>;
  errorMessage?: string;
}

export class SchedulerService {
  /**
   * Main scheduler execution logic.
   * Runs the status transition check and records execution logs.
   */
  public static async runScheduler(): Promise<SchedulerRunResult> {
    const startTime = new Date();
    const updatedOrdersList: Array<{
      orderId: Types.ObjectId;
      customOrderId: string;
      fromStatus: string;
      toStatus: string;
    }> = [];

    let processedCount = 0;

    try {
      const now = new Date();
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
      const twentyMinutesAgo = new Date(now.getTime() - 20 * 60 * 1000);

      // 1. Fetch candidate orders
      // - Status is PLACED and updatedAt is older than 10 mins
      // - Status is PROCESSING and updatedAt is older than 20 mins
      const candidateOrders = await Order.find({
        $or: [
          { orderStatus: 'PLACED', updatedAt: { $lte: tenMinutesAgo } },
          { orderStatus: 'PROCESSING', updatedAt: { $lte: twentyMinutesAgo } },
        ],
      });

      processedCount = candidateOrders.length;

      // 2. Process each candidate order using findOneAndUpdate to prevent race conditions
      for (const order of candidateOrders) {
        const currentStatus = order.orderStatus;
        let nextStatus: OrderStatus;

        if (currentStatus === 'PLACED') {
          nextStatus = 'PROCESSING';
        } else if (currentStatus === 'PROCESSING') {
          nextStatus = 'READY_TO_SHIP';
        } else {
          continue; // Should not happen given our query, but safe guard
        }

        // Atomic update - only updates if current status matches what we found
        const updatedOrder = await Order.findOneAndUpdate(
          { _id: order._id, orderStatus: currentStatus },
          { $set: { orderStatus: nextStatus } },
          { new: true }
        );

        if (updatedOrder) {
          // Record state transition history
          await OrderStatusHistory.create({
            orderId: order._id,
            fromStatus: currentStatus,
            toStatus: nextStatus,
            changedBy: 'system_scheduler',
            changedAt: new Date(),
          });

          updatedOrdersList.push({
            orderId: order._id as Types.ObjectId,
            customOrderId: order.orderId,
            fromStatus: currentStatus,
            toStatus: nextStatus,
          });

          console.log(`Scheduler: Updated Order ${order.orderId} from ${currentStatus} to ${nextStatus}`);
        } else {
          console.warn(`Scheduler: Race condition avoided or order status already updated for ${order.orderId}`);
        }
      }

      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();

      // 3. Save Scheduler Execution Log
      const log = new SchedulerLog({
        startTime,
        endTime,
        durationMs,
        status: 'SUCCESS',
        processedCount,
        updatedOrders: updatedOrdersList,
      });
      await log.save();

      return {
        startTime,
        endTime,
        durationMs,
        status: 'SUCCESS',
        processedCount,
        updatedOrdersCount: updatedOrdersList.length,
        updatedOrders: updatedOrdersList.map(item => ({
          orderId: item.orderId.toString(),
          customOrderId: item.customOrderId,
          fromStatus: item.fromStatus,
          toStatus: item.toStatus,
        })),
      };
    } catch (error) {
      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();
      const errMsg = (error as Error).message || 'Unknown error occurred in scheduler';

      console.error(`Scheduler Error: ${errMsg}`);

      try {
        // Record failed run log
        const log = new SchedulerLog({
          startTime,
          endTime,
          durationMs,
          status: 'FAILED',
          processedCount,
          updatedOrders: updatedOrdersList,
          errorMessage: errMsg,
        });
        await log.save();
      } catch (logDbError) {
        console.error(`Failed to write failed scheduler run log to DB: ${(logDbError as Error).message}`);
      }

      return {
        startTime,
        endTime,
        durationMs,
        status: 'FAILED',
        processedCount,
        updatedOrdersCount: updatedOrdersList.length,
        updatedOrders: updatedOrdersList.map(item => ({
          orderId: item.orderId.toString(),
          customOrderId: item.customOrderId,
          fromStatus: item.fromStatus,
          toStatus: item.toStatus,
        })),
        errorMessage: errMsg,
      };
    }
  }

  /**
   * Retrieves scheduler execution logs.
   */
  public static async getLogs(limit: number = 20): Promise<ISchedulerLog[]> {
    return SchedulerLog.find()
      .sort({ startTime: -1 })
      .limit(limit);
  }
}
