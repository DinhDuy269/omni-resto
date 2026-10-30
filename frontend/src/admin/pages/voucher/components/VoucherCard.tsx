import React from 'react';
import { Calendar, ShoppingBag } from 'lucide-react';
import { StatusBadge } from '../../../components/StatusBadge';
import type { VoucherInfo } from '../../../../shared/types/admin';

interface Props {
  voucher: VoucherInfo;
  onToggleStatus?: (id: string, currentStatus: string) => void;
  onEdit?: (voucher: VoucherInfo) => void;
}

export const VoucherCard: React.FC<Props> = ({ voucher, onToggleStatus, onEdit }) => {
  const isPercentage = voucher.discount_type === 'percentage';
  const isActive = voucher.status === 'active';
  const isExpired = voucher.status === 'expired';

  const usagePercent = voucher.total_quantity > 0 
    ? Math.round((voucher.used_quantity / voucher.total_quantity) * 100) 
    : 0;

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '14px',
        borderTop: `4px solid ${
          isActive ? 'var(--success)' : isExpired ? 'var(--danger)' : 'var(--text-muted)'
        }`,
        transition: 'transform 0.2s, box-shadow 0.2s',
        minWidth: 0, // Tránh thẻ card bị phình ngang quá container grid
      }}
    >
      {/* Header: Code & Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', minWidth: 0 }}>
        {/* Khối chứa mã code có xử lý co giãn và cắt chữ nếu quá dài */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            title={voucher.code}
            style={{
              display: 'inline-block',
              maxWidth: '100%',
              padding: '6px 10px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-app)',
              border: '1px dashed var(--primary)',
              color: 'var(--primary)',
              fontWeight: 800,
              fontSize: '0.925rem',
              letterSpacing: '0.5px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              boxSizing: 'border-box',
              verticalAlign: 'middle',
            }}
          >
            {voucher.code}
          </div>
        </div>

        {/* StatusBadge giữ nguyên kích thước không bị bẹp */}
        <div style={{ flexShrink: 0 }}>
          <StatusBadge status={voucher.status} size="sm" />
        </div>
      </div>

      {/* Body: Info */}
      <div style={{ minWidth: 0 }}>
        {/* Tên voucher: Giới hạn tối đa 2 dòng, tự động ... nếu vượt quá */}
        <h4
          title={voucher.name}
          style={{
            fontSize: '0.95rem',
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: '4px',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '2.8em', // Đảm bảo các card đều nhau về chiều cao dòng tiêu đề
          }}
        >
          {voucher.name}
        </h4>

        {/* Giá trị giảm */}
        <div style={{ fontSize: '0.875rem', color: 'var(--danger)', fontWeight: 800, marginBottom: '10px' }}>
          Giảm {voucher.discount_value.toLocaleString('vi-VN')} {isPercentage ? '%' : 'đ'}
          {voucher.max_discount_amount && isPercentage && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
              {' '} (Tối đa {voucher.max_discount_amount.toLocaleString('vi-VN')}đ)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShoppingBag size={14} style={{ flexShrink: 0 }} />
            <span>Đơn tối thiểu: {voucher.min_order_amount.toLocaleString('vi-VN')}đ</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} style={{ flexShrink: 0 }} />
            <span>HSD: {new Date(voucher.end_date).toLocaleDateString('vi-VN')}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar (Usage) */}
      <div style={{ backgroundColor: 'var(--bg-app)', padding: '10px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 600 }}>
          <span style={{ color: 'var(--text-main)' }}>Đã dùng: {voucher.used_quantity}/{voucher.total_quantity}</span>
          <span style={{ color: 'var(--primary)' }}>{usagePercent}%</span>
        </div>
        <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
          <div 
            style={{ 
              width: `${usagePercent}%`, 
              height: '100%', 
              backgroundColor: usagePercent >= 100 ? 'var(--danger)' : 'var(--primary)',
              transition: 'width 0.3s ease'
            }} 
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <button 
          className="btn btn-secondary btn-sm" 
          style={{ flex: 1 }}
          onClick={() => onEdit?.(voucher)}
        >
          Chỉnh Sửa
        </button>
        {!isExpired && (
          <button 
            className={`btn btn-sm ${isActive ? 'btn-danger' : 'btn-success'}`} 
            style={{ flex: 1 }}
            onClick={() => onToggleStatus?.(voucher.id, voucher.status)}
          >
            {isActive ? 'Tạm Dừng' : 'Kích Hoạt'}
          </button>
        )}
      </div>
    </div>
  );
};