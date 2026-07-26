import React from 'react';

type StatusType =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'MAINTENANCE'
  | 'CLOSED'
  | 'AVAILABLE'
  | 'OUT_OF_STOCK'
  | 'DISCONTINUED'
  | 'PENDING'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'OCCUPIED'
  | 'RESERVED'
  | 'CLEANING'
  | 'active'
  | 'inactive'
  | 'maintenance'
  | 'closed'
  | 'available'
  | 'out_of_stock'
  | 'discontinued'
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'occupied'
  | 'reserved'
  | 'cleaning';

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  size?: 'sm' | 'md';
}

const statusMap: Record<string, { label: string; bg: string; color: string; border: string }> = {
  ACTIVE: { label: 'Đang hoạt động', bg: 'var(--success-bg)', color: 'var(--success)', border: 'var(--success-border)' },
  INACTIVE: { label: 'Tạm khóa', bg: 'var(--danger-bg)', color: 'var(--danger)', border: 'var(--danger-border)' },
  MAINTENANCE: { label: 'Bảo trì', bg: 'var(--warning-bg)', color: 'var(--warning)', border: 'var(--warning-border)' },
  CLOSED: { label: 'Đóng cửa', bg: 'var(--danger-bg)', color: 'var(--danger)', border: 'var(--danger-border)' },

  AVAILABLE: { label: 'Còn món', bg: 'var(--success-bg)', color: 'var(--success)', border: 'var(--success-border)' },
  OUT_OF_STOCK: { label: 'Hết món', bg: 'var(--warning-bg)', color: 'var(--warning)', border: 'var(--warning-border)' },
  DISCONTINUED: { label: 'Ngừng bán', bg: 'var(--danger-bg)', color: 'var(--danger)', border: 'var(--danger-border)' },

  PENDING: { label: 'Mới đặt', bg: 'var(--info-bg)', color: 'var(--info)', border: 'var(--info-border)' },
  PREPARING: { label: 'Đang làm', bg: 'var(--warning-bg)', color: 'var(--warning)', border: 'var(--warning-border)' },
  READY: { label: 'Chờ giao', bg: 'var(--purple-bg)', color: 'var(--purple)', border: '#ddd6fe' },
  COMPLETED: { label: 'Hoàn tất', bg: 'var(--success-bg)', color: 'var(--success)', border: 'var(--success-border)' },
  CANCELLED: { label: 'Đã hủy', bg: 'var(--danger-bg)', color: 'var(--danger)', border: 'var(--danger-border)' },

  OCCUPIED: { label: 'Có khách', bg: 'var(--danger-bg)', color: 'var(--danger)', border: 'var(--danger-border)' },
  RESERVED: { label: 'Đã đặt bàn', bg: 'var(--info-bg)', color: 'var(--info)', border: 'var(--info-border)' },
  CLEANING: { label: 'Cần dọn', bg: 'var(--warning-bg)', color: 'var(--warning)', border: 'var(--warning-border)' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'md' }) => {
  const normalizedKey = status ? String(status).toUpperCase() : '';
  const config = statusMap[normalizedKey] || {
    label: status,
    bg: 'var(--border-subtle)',
    color: 'var(--text-muted)',
    border: 'var(--border-color)',
  };

  const displayText = label || config.label;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: size === 'sm' ? '2px 8px' : '4px 12px',
        fontSize: size === 'sm' ? '0.75rem' : '0.8125rem',
        fontWeight: 600,
        borderRadius: 'var(--radius-full)',
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: size === 'sm' ? '5px' : '6px',
          height: size === 'sm' ? '5px' : '6px',
          borderRadius: '50%',
          backgroundColor: config.color,
        }}
      />
      {displayText}
    </span>
  );
};
