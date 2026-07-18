import React, { useState, useEffect } from 'react';
import { ApiClient } from '../utils/api';
import { X, Sparkles } from 'lucide-react';

interface CreateOrderModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ onClose, onSuccess }) => {
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [productName, setProductName] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('PENDING');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate a unique idempotency key when the modal is mounted
  useEffect(() => {
    const randomHex = () => Math.random().toString(16).substring(2);
    const key = `client-key-${randomHex()}-${randomHex()}`;
    setIdempotencyKey(key);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // Prevent double clicks

    setError(null);
    setSubmitting(true);

    // Validation
    if (!customerName.trim()) {
      setError('Customer name is required.');
      setSubmitting(false);
      return;
    }
    if (!phoneNumber.trim()) {
      setError('Phone number is required.');
      setSubmitting(false);
      return;
    }
    if (!productName.trim()) {
      setError('Product name is required.');
      setSubmitting(false);
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be a valid positive number.');
      setSubmitting(false);
      return;
    }

    try {
      const response = await ApiClient.createOrder({
        customerName: customerName.trim(),
        phoneNumber: phoneNumber.trim(),
        productName: productName.trim(),
        amount: parsedAmount,
        paymentStatus,
        idempotencyKey,
      });

      if (response.success) {
        onSuccess();
        onClose();
      } else {
        setError('Failed to create order. Please try again.');
      }
    } catch (err) {
      setError((err as Error).message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel">
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} style={{ color: 'var(--primary)' }} />
            Create New Order
          </div>
          <button className="modal-close-btn" onClick={onClose} disabled={submitting}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div 
            style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              color: '#f87171', 
              padding: '0.75rem', 
              borderRadius: '8px', 
              marginBottom: '1rem',
              fontSize: '0.85rem',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Customer Name</label>
            <input
              type="text"
              className="form-input"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. John Doe"
              disabled={submitting}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              type="tel"
              className="form-input"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. +91 9876543210"
              disabled={submitting}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Product Name</label>
            <input
              type="text"
              className="form-input"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. MacBook Pro M3"
              disabled={submitting}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Amount (INR)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 199900"
              disabled={submitting}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Payment Status</label>
            <select
              className="select-field"
              style={{ width: '100%', padding: '0.75rem' }}
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              disabled={submitting}
            >
              <option value="PENDING">PENDING</option>
              <option value="PAID">PAID</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
