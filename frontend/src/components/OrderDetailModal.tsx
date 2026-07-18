import React, { useState, useEffect } from 'react';
import { ApiClient } from '../utils/api';
import type { OrderDetailsResponse } from '../utils/api';
import { X, ClipboardList, CheckCircle2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface OrderDetailModalProps {
  orderId: string;
  onClose: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ orderId, onClose }) => {
  const [details, setDetails] = useState<OrderDetailsResponse['data'] | null>(null);
  const [history, setHistory] = useState<OrderDetailsResponse['history']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDetails();
  }, [orderId]);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ApiClient.getOrderDetails(orderId);
      if (response.success) {
        setDetails(response.data);
        setHistory(response.history);
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to retrieve order details.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClipboardList size={20} style={{ color: 'var(--primary)' }} />
            Order Audit Detail
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="state-container" style={{ padding: '2rem 0' }}>
            <div className="spinner"></div>
            <div>Fetching details...</div>
          </div>
        ) : error || !details ? (
          <div style={{ color: '#f87171', padding: '1rem', textAlign: 'center' }}>
            {error || 'Failed to load details.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Grid details */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '1.25rem',
                borderRadius: '10px',
                border: '1px solid var(--border-glass)',
              }}
            >
              <div>
                <span className="form-label" style={{ fontSize: '0.7rem' }}>Order ID</span>
                <span className="order-id-cell" style={{ fontSize: '1rem' }}>{details.orderId}</span>
              </div>
              <div>
                <span className="form-label" style={{ fontSize: '0.7rem' }}>Status</span>
                <StatusBadge status={details.orderStatus} />
              </div>
              <div>
                <span className="form-label" style={{ fontSize: '0.7rem' }}>Customer</span>
                <span style={{ fontWeight: 600 }}>{details.customerName}</span>
              </div>
              <div>
                <span className="form-label" style={{ fontSize: '0.7rem' }}>Phone</span>
                <span>{details.phoneNumber}</span>
              </div>
              <div>
                <span className="form-label" style={{ fontSize: '0.7rem' }}>Product</span>
                <span>{details.productName}</span>
              </div>
              <div>
                <span className="form-label" style={{ fontSize: '0.7rem' }}>Amount</span>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                  {formatCurrency(details.amount)}
                </span>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span className="form-label" style={{ fontSize: '0.7rem' }}>Payment Status</span>
                <span className="dot-indicator">
                  <span className={`dot dot-${details.paymentStatus.toLowerCase()}`} />
                  {details.paymentStatus}
                </span>
              </div>
            </div>

            {/* Audit History timeline */}
            <div>
              <span className="form-label" style={{ marginBottom: '0.75rem' }}>Status History Trail</span>
              {history.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No history records.</div>
              ) : (
                <div className="timeline">
                  {history.map((hist, idx) => (
                    <div key={idx} className="timeline-item">
                      <div className={`timeline-marker ${idx === history.length - 1 ? 'active' : ''}`}>
                        <CheckCircle2 size={12} style={{ color: '#fff' }} />
                      </div>
                      <div className="timeline-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="timeline-status" style={{ fontSize: '0.85rem' }}>
                            {hist.toStatus.replace(/_/g, ' ')}
                          </span>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              padding: '0.1rem 0.35rem',
                              borderRadius: '4px',
                              background: hist.changedBy === 'system_scheduler' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                              color: hist.changedBy === 'system_scheduler' ? 'var(--primary)' : 'var(--text-secondary)',
                              fontWeight: 600,
                            }}
                          >
                            {hist.changedBy === 'system_scheduler' ? 'SCHEDULER' : 'API'}
                          </span>
                        </div>
                        <div className="timeline-meta" style={{ marginTop: '0.2rem' }}>
                          <span>{formatDate(hist.changedAt)}</span>
                          {hist.fromStatus && (
                            <span>(from {hist.fromStatus.replace(/_/g, ' ')})</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
