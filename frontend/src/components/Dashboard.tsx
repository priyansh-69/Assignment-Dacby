import React, { useState, useEffect } from 'react';
import { ApiClient } from '../utils/api';
import type { Order } from '../utils/api';
import { OrderTable } from './OrderTable';
import { CreateOrderModal } from './CreateOrderModal';
import { OrderDetailModal } from './OrderDetailModal';
import { SchedulerLogs } from './SchedulerLogs';
import { Plus, RefreshCw, Search, Layers, ClipboardCheck, ArrowUpDown, Truck } from 'lucide-react';

export const Dashboard: React.FC = () => {
  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Status Metrics
  const [metrics, setMetrics] = useState({
    total: 0,
    placed: 0,
    processing: 0,
    readyToShip: 0,
  });

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset page on search
    }, 400);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch orders when dependencies change
  useEffect(() => {
    fetchOrders();
  }, [statusFilter, debouncedSearch, page]);

  // Polling for Auto-Refresh (Every 10 seconds)
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (autoRefresh) {
      timer = setInterval(() => {
        fetchOrders(true); // silent fetch that doesn't trigger loading state spinner
      }, 10000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [autoRefresh, statusFilter, debouncedSearch, page]);

  const fetchOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await ApiClient.getOrders(statusFilter, debouncedSearch, page, 10);
      if (response.success) {
        setOrders(response.orders);
        setTotal(response.total);
        setPages(response.pages);
        setError(null);

        // Fetch metrics by querying stats on the loaded dataset or we can calculate from total API query if needed.
        // Let's call endpoint or retrieve metrics. To keep it simple, fast, and local, we can extract counts.
        // Wait! Since the backend doesn't have a special metrics endpoint, let's fetch all orders in one call
        // or compute from current view, but wait: retrieving all counts is best by querying backend status categories.
        // Let's compute statistics by fetching counts of main statuses.
        computeMetrics();
      } else {
        setError(response.error || 'Could not load orders.');
      }
    } catch (err) {
      setError((err as Error).message || 'Connection failure. Make sure the backend server is running.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const computeMetrics = async () => {
    try {
      // Run quick status counts by fetching status queries in parallel
      const [placedRes, procRes, readyRes, allRes] = await Promise.all([
        ApiClient.getOrders('PLACED', '', 1, 1),
        ApiClient.getOrders('PROCESSING', '', 1, 1),
        ApiClient.getOrders('READY_TO_SHIP', '', 1, 1),
        ApiClient.getOrders('ALL', '', 1, 1),
      ]);

      setMetrics({
        total: allRes.total,
        placed: placedRes.total,
        processing: procRes.total,
        readyToShip: readyRes.total,
      });
    } catch (e) {
      console.warn('Failed to calculate stats metrics:', e);
    }
  };

  const handleRefresh = () => {
    fetchOrders();
  };

  return (
    <div className="dashboard-container">
      {/* Header Section */}
      <header className="dashboard-header">
        <div className="header-title-section">
          <h1>LogiFlow Orders</h1>
          <p>Real-time Order Processing & Cron Status Dashboard</p>
        </div>

        <div className="header-actions">
          {/* Auto Refresh Toggle */}
          <div className="refresh-toggle-container">
            <span>Auto-Refresh</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          <button className="btn btn-secondary btn-icon" onClick={handleRefresh} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spinner' : ''} style={{ margin: 0, width: 18, height: 18 }} />
          </button>

          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />
            New Order
          </button>
        </div>
      </header>

      {/* Metrics Summary Grid */}
      <section className="metrics-grid">
        <div className="metric-card glass-panel">
          <div className="metric-header">
            <span>Total Orders</span>
            <Layers size={16} />
          </div>
          <div className="metric-value">{metrics.total}</div>
          <div className="metric-decorator">O</div>
        </div>

        <div className="metric-card glass-panel" style={{ borderLeft: '3px solid var(--status-placed)' }}>
          <div className="metric-header">
            <span>Placed</span>
            <ClipboardCheck size={16} style={{ color: 'var(--status-placed)' }} />
          </div>
          <div className="metric-value" style={{ color: 'var(--status-placed)' }}>
            {metrics.placed}
          </div>
          <div className="metric-decorator">P</div>
        </div>

        <div className="metric-card glass-panel" style={{ borderLeft: '3px solid var(--status-processing)' }}>
          <div className="metric-header">
            <span>Processing</span>
            <ArrowUpDown size={16} style={{ color: 'var(--status-processing)' }} />
          </div>
          <div className="metric-value" style={{ color: 'var(--status-processing)' }}>
            {metrics.processing}
          </div>
          <div className="metric-decorator">W</div>
        </div>

        <div className="metric-card glass-panel" style={{ borderLeft: '3px solid var(--status-ready)' }}>
          <div className="metric-header">
            <span>Ready to Ship</span>
            <Truck size={16} style={{ color: 'var(--status-ready)' }} />
          </div>
          <div className="metric-value" style={{ color: 'var(--status-ready)' }}>
            {metrics.readyToShip}
          </div>
          <div className="metric-decorator">R</div>
        </div>
      </section>

      {/* Main Workspace */}
      <main className="dashboard-workspace">
        {/* Left Side: Orders Table and Filters */}
        <section className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Controls Bar */}
          <div className="controls-bar">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={16} />
              <input
                type="text"
                className="input-field"
                placeholder="Search by Order ID, Customer, or Product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="filter-select-wrapper">
              <span className="form-label" style={{ margin: 0, textTransform: 'none', fontSize: '0.85rem' }}>Status:</span>
              <select
                className="select-field"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="PLACED">Placed</option>
                <option value="PROCESSING">Processing</option>
                <option value="READY_TO_SHIP">Ready to Ship</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Table list component */}
          <OrderTable
            orders={orders}
            loading={loading}
            error={error}
            page={page}
            pages={pages}
            total={total}
            onPageChange={setPage}
            onSelectOrder={(order) => setSelectedOrderId(order.orderId)}
            onRetry={handleRefresh}
          />
        </section>

        {/* Right Side: Scheduler panel */}
        <aside>
          <SchedulerLogs onSchedulerRunComplete={handleRefresh} />
        </aside>
      </main>

      {/* Create Order Modal */}
      {showCreateModal && (
        <CreateOrderModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            fetchOrders();
            // Show alert or confirmation if desired
          }}
        />
      )}

      {/* Order Audit Details Modal */}
      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  );
};
export default Dashboard;
