import React from 'react';
import { Star, ToggleLeft, ToggleRight } from 'lucide-react';
import { StatusBadge } from '../../../components/StatusBadge';
import type { MenuItem } from '../../../../shared/types/admin';

interface Props {
  item: MenuItem;
  onToggleStatus: (id: string) => void;
}

export const MenuItemCard: React.FC<Props> = ({ item, onToggleStatus }) => {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden', padding: 0 }}>
      <div style={{ position: 'relative', height: '160px', width: '100%' }}>
        <img
          src={item.image}
          alt={item.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {item.isBestSeller && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Star size={12} fill="#ffffff" /> BEST SELLER
          </div>
        )}
      </div>

      <div style={{ padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>{item.code}</span>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{item.name}</h3>
          </div>
          <StatusBadge status={item.status} />
        </div>

        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.description}
        </p>

        <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--primary)' }}>
            {item.basePrice.toLocaleString('vi-VN')} đ
          </span>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onToggleStatus(item.id)}
            title="Đổi trạng thái"
          >
            {item.status === 'AVAILABLE' ? <ToggleRight size={18} color="var(--success)" /> : <ToggleLeft size={18} color="var(--text-muted)" />}
          </button>
        </div>
      </div>
    </div>
  );
};
