import React from 'react';

interface StatusBadgeProps {
  status: 'PLACED' | 'PROCESSING' | 'READY_TO_SHIP' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getBadgeClass = () => {
    switch (status) {
      case 'PLACED':
        return 'badge-status-placed';
      case 'PROCESSING':
        return 'badge-status-processing';
      case 'READY_TO_SHIP':
        return 'badge-status-ready';
      case 'SHIPPED':
        return 'badge-status-shipped';
      case 'DELIVERED':
        return 'badge-status-delivered';
      case 'CANCELLED':
        return 'badge-status-cancelled';
      default:
        return '';
    }
  };

  const formatStatus = (txt: string) => {
    return txt.replace(/_/g, ' ');
  };

  return (
    <span className={`badge ${getBadgeClass()}`}>
      {formatStatus(status)}
    </span>
  );
};
