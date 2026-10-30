  import React from 'react';

type StatusType =
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
  | 'cleaning'
  | 'expired';

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  size?: 'sm' | 'md';
}

const statusMap: Record<string, { label: string; bg: string; color: string; border: string }> = {
  active: { label: 'Đang hoạt động', bg: 'var(--success-bg)', color: 'var(--success)', border: 'var(--success-border)' },
  inactive: { label: 'Tạm khóa', bg: 'var(--danger-bg)', color: 'var(--danger)', border: 'var(--danger-border)' },
  maintenance: { label: 'Bảo trì', bg: 'var(--warning-bg)', color: 'var(--warning)', border: 'var(--warning-border)' },
  closed: { label: 'Đóng cửa', bg: 'var(--danger-bg)', color: 'var(--danger)', border: 'var(--danger-border)' },

  available: { label: 'Còn món', bg: 'var(--success-bg)', color: 'var(--success)', border: 'var(--success-border)' },
  out_of_stock: { label: 'Hết món', bg: 'var(--warning-bg)', color: 'var(--warning)', border: 'var(--warning-border)' },
  discontinued: { label: 'Ngừng bán', bg: 'var(--danger-bg)', color: 'var(--danger)', border: 'var(--danger-border)' },

  pending: { label: 'Mới đặt', bg: 'var(--info-bg)', color: 'var(--info)', border: 'var(--info-border)' },
  preparing: { label: 'Đang làm', bg: 'var(--warning-bg)', color: 'var(--warning)', border: 'var(--warning-border)' },
  ready: { label: 'Chờ giao', bg: 'var(--purple-bg)', color: 'var(--purple)', border: '#ddd6fe' },
  completed: { label: 'Hoàn tất', bg: 'var(--success-bg)', color: 'var(--success)', border: 'var(--success-border)' },
  cancelled: { label: 'Đã hủy', bg: 'var(--danger-bg)', color: 'var(--danger)', border: 'var(--danger-border)' },

  occupied: { label: 'Có khách', bg: 'var(--danger-bg)', color: 'var(--danger)', border: 'var(--danger-border)' },
  reserved: { label: 'Đã đặt bàn', bg: 'var(--info-bg)', color: 'var(--info)', border: 'var(--info-border)' },
  cleaning: { label: 'Cần dọn', bg: 'var(--warning-bg)', color: 'var(--warning)', border: 'var(--warning-border)' },

  expired: { label: 'Đã hết hạn', bg: 'var(--danger-bg)', color: 'var(--danger)', border: 'var(--danger-border)' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'md' }) => {
  const normalizedKey = status ? String(status).toLowerCase() : '';
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
