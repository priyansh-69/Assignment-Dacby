import { Order, IOrder, PaymentStatus, OrderStatus } from '../models/Order';
import { OrderStatusHistory } from '../models/OrderStatusHistory';
import { ClientSession } from 'mongoose';

export interface CreateOrderInput {
  customerName: string;
  phoneNumber: string;
  productName: string;
  amount: number;
  paymentStatus?: PaymentStatus;
  idempotencyKey: string;
}

export interface GetOrdersFilter {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class OrderService {
  /**
   * Helper to generate a unique readable Order ID.
   * Format: ORD-YYYYMMDD-RANDOM
   */
  private static generateOrderId(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(100000 + Math.random() * 900000); // 6-digit random number
    return `ORD-${dateStr}-${rand}`;
  }

  /**
   * Creates a new order. Enforces idempotency by returning the existing order
   * if the idempotencyKey already exists in the database.
   */
  public static async createOrder(input: CreateOrderInput): Promise<IOrder> {
    // 1. Check if the idempotencyKey is already used
    const existingOrder = await Order.findOne({ idempotencyKey: input.idempotencyKey });
    if (existingOrder) {
      console.log(`Duplicate order detected for idempotencyKey: ${input.idempotencyKey}. Returning existing order.`);
      return existingOrder;
    }

    // 2. Generate unique order ID
    const orderId = this.generateOrderId();

    // 3. Create the order
    const order = new Order({
      orderId,
      customerName: input.customerName,
      phoneNumber: input.phoneNumber,
      productName: input.productName,
      amount: input.amount,
      paymentStatus: input.paymentStatus || 'PENDING',
      orderStatus: 'PLACED',
      idempotencyKey: input.idempotencyKey,
    });

    const savedOrder = await order.save();

    // 4. Record initial status history
    await OrderStatusHistory.create({
      orderId: savedOrder._id,
      fromStatus: null,
      toStatus: 'PLACED',
      changedBy: 'api',
      changedAt: savedOrder.createdAt,
    });

    return savedOrder;
  }

  /**
   * Fetches orders with status filter, search, and pagination.
   */
  public static async getOrders(filter: GetOrdersFilter): Promise<{ orders: IOrder[]; total: number; page: number; pages: number }> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.max(1, Math.min(100, filter.limit || 10));
    const skip = (page - 1) * limit;

    const query: any = {};

    // Filter by status
    if (filter.status && filter.status !== 'ALL') {
      query.orderStatus = filter.status;
    }

    // Search by orderId or customerName (case-insensitive)
    if (filter.search) {
      const searchRegex = new RegExp(filter.search.trim(), 'i');
      query.$or = [
        { orderId: searchRegex },
        { customerName: searchRegex },
        { productName: searchRegex },
      ];
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return {
      orders,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves specific order details and its status transition history.
   */
  public static async getOrderDetails(idOrOrderId: string): Promise<{ order: IOrder; history: any[] } | null> {
    // Attempt to query by DB ID or custom orderId string
    const query = idOrOrderId.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: idOrOrderId }
      : { orderId: idOrOrderId };

    const order = await Order.findOne(query);
    if (!order) return null;

    const history = await OrderStatusHistory.find({ orderId: order._id }).sort({ changedAt: 1 });
 
     return {
       order,
       history,
     };
   }
 
   /**
    * Retrieves order count statistics for dashboard cards.
    */
   public static async getOrderStats(): Promise<{
     total: number;
     placed: number;
     processing: number;
     readyToShip: number;
   }> {
     const [total, placed, processing, readyToShip] = await Promise.all([
       Order.countDocuments({}),
       Order.countDocuments({ orderStatus: 'PLACED' }),
       Order.countDocuments({ orderStatus: 'PROCESSING' }),
       Order.countDocuments({ orderStatus: 'READY_TO_SHIP' }),
     ]);
 
     return {
       total,
       placed,
       processing,
       readyToShip,
     };
   }
 }
