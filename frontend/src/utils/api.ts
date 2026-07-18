const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';

export interface Order {
  _id: string;
  orderId: string;
  customerName: string;
  phoneNumber: string;
  productName: string;
  amount: number;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  orderStatus: 'PLACED' | 'PROCESSING' | 'READY_TO_SHIP' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export interface OrdersResponse {
  success: boolean;
  orders: Order[];
  total: number;
  page: number;
  pages: number;
  error?: string;
}

export interface OrderDetailsResponse {
  success: boolean;
  data: Order;
  history: Array<{
    fromStatus: string | null;
    toStatus: string;
    changedBy: string;
    changedAt: string;
  }>;
}

export interface SchedulerLogItem {
  _id: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  status: 'SUCCESS' | 'FAILED';
  processedCount: number;
  updatedOrders: Array<{
    orderId: string;
    customOrderId: string;
    fromStatus: string;
    toStatus: string;
  }>;
  errorMessage?: string;
}

export interface SchedulerLogsResponse {
  success: boolean;
  data: SchedulerLogItem[];
}

export interface SchedulerRunResponse {
  success: boolean;
  summary: {
    startTime: string;
    endTime: string;
    durationMs: number;
    status: 'SUCCESS' | 'FAILED';
    processedCount: number;
    updatedOrdersCount: number;
    errorMessage?: string;
  };
}

export class ApiClient {
  /**
   * Helper to execute fetch with timeout
   */
  private static async request<T>(url: string, options?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(id);
      if ((error as Error).name === 'AbortError') {
        throw new Error('Request timed out. Please check your network connection.');
      }
      throw error;
    }
  }

  /**
   * Fetches list of orders with filters
   */
  public static async getOrders(status = 'ALL', search = '', page = 1, limit = 10): Promise<OrdersResponse> {
    const params = new URLSearchParams({
      status,
      search,
      page: page.toString(),
      limit: limit.toString(),
    });
    return this.request<OrdersResponse>(`${API_BASE}/orders?${params.toString()}`);
  }

  /**
   * Fetch specific order details & transition history
   */
  public static async getOrderDetails(idOrOrderId: string): Promise<OrderDetailsResponse> {
    return this.request<OrderDetailsResponse>(`${API_BASE}/orders/${idOrOrderId}`);
  }

  /**
   * Creates a new order
   */
  public static async createOrder(orderData: {
    customerName: string;
    phoneNumber: string;
    productName: string;
    amount: number;
    paymentStatus?: string;
    idempotencyKey?: string;
  }): Promise<{ success: boolean; data: Order }> {
    return this.request<{ success: boolean; data: Order }>(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });
  }

  /**
   * Fetches scheduler run history logs
   */
  public static async getSchedulerLogs(limit = 15): Promise<SchedulerLogsResponse> {
    return this.request<SchedulerLogsResponse>(`${API_BASE}/scheduler/logs?limit=${limit}`);
  }

  /**
   * Triggers the scheduler run API
   */
  public static async triggerScheduler(secretKey: string): Promise<SchedulerRunResponse> {
    return this.request<SchedulerRunResponse>(`${API_BASE}/scheduler/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-scheduler-key': secretKey,
      },
    });
  }
}
