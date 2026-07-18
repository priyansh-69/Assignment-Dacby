import React, { useState, useEffect } from 'react';
import { ApiClient } from '../utils/api';
import type { SchedulerLogItem } from '../utils/api';
import { Cpu, Key, Play, RefreshCw, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface SchedulerLogsProps {
  onSchedulerRunComplete: () => void;
}

export const SchedulerLogs: React.FC<SchedulerLogsProps> = ({ onSchedulerRunComplete }) => {
  const [logs, setLogs] = useState<SchedulerLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [secretKey, setSecretKey] = useState('');
  const [runningScheduler, setRunningScheduler] = useState(false);
  const [triggerStatus, setTriggerStatus] = useState<{ success: boolean; message: string } | null>(null);
  
  // State to track which logs have expanded details
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Load saved secret key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('scheduler_secret_key');
    if (savedKey) {
      setSecretKey(savedKey);
    }
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await ApiClient.getSchedulerLogs(15);
      if (response.success) {
        setLogs(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch scheduler logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value;
    setSecretKey(key);
    localStorage.setItem('scheduler_secret_key', key);
  };

  const triggerScheduler = async () => {
    if (!secretKey.trim()) {
      setTriggerStatus({ success: false, message: 'Please enter a scheduler secret key.' });
      return;
    }

    setRunningScheduler(true);
    setTriggerStatus(null);

    try {
      const response = await ApiClient.triggerScheduler(secretKey.trim());
      if (response.success) {
        setTriggerStatus({
          success: true,
          message: `Scheduler ran successfully! Checked ${response.summary.processedCount} orders, updated ${response.summary.updatedOrdersCount}.`,
        });
        fetchLogs();
        onSchedulerRunComplete(); // Trigger parent page state updates
      } else {
        setTriggerStatus({
          success: false,
          message: response.summary.errorMessage || 'Scheduler execution failed.',
        });
      }
    } catch (err) {
      setTriggerStatus({
        success: false,
        message: (err as Error).message || 'API request failed.',
      });
    } finally {
      setRunningScheduler(false);
    }
  };

  const formatLogTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const toggleExpand = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  return (
    <div className="scheduler-panel">
      {/* Control Card */}
      <div className="scheduler-card glass-panel">
        <div className="scheduler-card-header">
          <Cpu size={18} style={{ color: 'var(--primary)' }} />
          Scheduler Control
        </div>
        <p className="scheduler-desc">
          Orders are automatically transitioned by local cron. You can also trigger a cron run on demand using the endpoint secret key.
        </p>

        <div className="secret-key-input-wrapper">
          <label className="form-label" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Key size={12} />
            Scheduler Secret Key
          </label>
          <input
            type="password"
            className="secret-key-input"
            value={secretKey}
            onChange={handleKeyChange}
            placeholder="Enter scheduler key..."
          />
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={triggerScheduler}
          disabled={runningScheduler}
        >
          {runningScheduler ? (
            <>
              <RefreshCw size={14} className="spinner" style={{ margin: 0, width: 14, height: 14 }} />
              Running Cron...
            </>
          ) : (
            <>
              <Play size={14} />
              Trigger Scheduler
            </>
          )}
        </button>

        {triggerStatus && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.4rem',
              background: triggerStatus.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: triggerStatus.success ? '#34d399' : '#f87171',
              border: triggerStatus.success ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
            <span>{triggerStatus.message}</span>
          </div>
        )}
      </div>

      {/* Logs Card */}
      <div className="scheduler-card glass-panel" style={{ flex: 1 }}>
        <div className="scheduler-card-header" style={{ justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={18} style={{ color: 'var(--text-secondary)' }} />
            Execution Logs
          </span>
          <button className="btn btn-secondary btn-icon" onClick={fetchLogs} disabled={loading} style={{ width: 28, height: 28, borderRadius: 6 }}>
            <RefreshCw size={12} className={loading ? 'spinner' : ''} style={{ margin: 0, width: 12, height: 12 }} />
          </button>
        </div>

        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 1rem', fontSize: '0.85rem' }}>
            No execution logs recorded yet.
          </div>
        ) : (
          <div className="logs-list">
            {logs.map((log) => (
              <div key={log._id} className="log-item">
                <div className="log-item-header">
                  <span className="log-time">{formatLogTime(log.startTime)}</span>
                  <span className={`log-badge ${log.status === 'SUCCESS' ? 'log-success' : 'log-failed'}`}>
                    {log.status}
                  </span>
                </div>

                <div className="log-details">
                  <span>Checked: <strong>{log.processedCount}</strong></span>
                  <span>Updated: <strong>{log.updatedOrders.length}</strong></span>
                  <span>Took: <strong>{log.durationMs}ms</strong></span>
                </div>

                {log.errorMessage && (
                  <div className="log-error-msg">{log.errorMessage}</div>
                )}

                {log.updatedOrders.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <button
                      onClick={() => toggleExpand(log._id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        padding: 0,
                      }}
                    >
                      {expandedLogId === log._id ? (
                        <>Hide Transitions <ChevronUp size={12} /></>
                      ) : (
                        <>Show Transitions ({log.updatedOrders.length}) <ChevronDown size={12} /></>
                      )}
                    </button>

                    {expandedLogId === log._id && (
                      <div
                        style={{
                          marginTop: '0.4rem',
                          background: 'rgba(255, 255, 255, 0.02)',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border-glass)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem',
                        }}
                      >
                        {log.updatedOrders.map((upd, idx) => (
                          <div
                            key={idx}
                            style={{
                              fontSize: '0.7rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            <span style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>
                              {upd.customOrderId}
                            </span>
                            <span>
                              {upd.fromStatus} → {upd.toStatus}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
