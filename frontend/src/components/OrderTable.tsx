import React from 'react';
import type { Order } from '../utils/api';
import { StatusBadge } from './StatusBadge';
import { ChevronLeft, ChevronRight, Inbox, AlertTriangle } from 'lucide-react';

interface OrderTableProps {
  orders: Order[];
  loading: boolean;
  error: string | null;
  page: number;
  pages: number;
  total: number;
  onPageChange: (page: number) => void;
  onSelectOrder: (order: Order) => void;
  onRetry: () => void;
}

export const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  loading,
  error,
  page,
  pages,
  total,
  onPageChange,
  onSelectOrder,
  onRetry,
}) => {
  // 1. Error state handling
  if (error) {
    return (
      <div className="state-container state-error">
        <div className="state-icon-wrapper">
          <AlertTriangle size={48} />
        </div>
        <div className="state-title">Failed to Load Orders</div>
        <div className="state-description">{error}</div>
        <button className="btn btn-primary" onClick={onRetry}>
          Try Again
        </button>
      </div>
    );
  }

  // 2. Loading state handling
  if (loading) {
    return (
      <div className="state-container">
        <div className="spinner"></div>
        <div className="state-title">Retrieving Orders</div>
        <div className="state-description">Connecting to server and querying database...</div>
      </div>
    );
  }

  // 3. Empty state handling
  if (orders.length === 0) {
    return (
      <div className="state-container">
        <div className="state-icon-wrapper">
          <Inbox size={48} />
        </div>
        <div className="state-title">No Orders Found</div>
        <div className="state-description">
          We couldn't find any orders matching your search query or filter selection. Try adjusting filters or create a new order.
        </div>
      </div>
    );
  }

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(val);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="orders-panel">
      <div className="table-responsive">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Product</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order._id} onClick={() => onSelectOrder(order)}>
                <td className="order-id-cell">{order.orderId}</td>
                <td style={{ fontWeight: 600 }}>{order.customerName}</td>
                <td>{order.phoneNumber}</td>
                <td>{order.productName}</td>
                <td style={{ fontWeight: 700 }}>{formatCurrency(order.amount)}</td>
                <td>
                  <span className="dot-indicator">
                    <span className={`dot dot-${order.paymentStatus.toLowerCase()}`} />
                    {order.paymentStatus}
                  </span>
                </td>
                <td>
                  <StatusBadge status={order.orderStatus} />
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{formatDate(order.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {pages > 1 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Showing Page <strong>{page}</strong> of <strong>{pages}</strong> ({total} total orders)
          </div>
          <div className="pagination-buttons">
            <button
              className="btn btn-secondary pagination-btn"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="btn btn-secondary pagination-btn"
              disabled={page >= pages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
