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
  const isPercentage = voucher.discountType === 'PERCENTAGE' || voucher.discountType === 'percentage';
  const isActive = voucher.status === 'ACTIVE' || voucher.status === 'active';
  const isExpired = voucher.status === 'EXPIRED' || voucher.status === 'expired';

  const usagePercent = voucher.totalQuantity > 0 
    ? Math.round((voucher.usedQuantity / voucher.totalQuantity) * 100) 
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
      }}
    >
      {/* Header: Code & Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-app)',
              border: '1px dashed var(--primary)',
              color: 'var(--primary)',
              fontWeight: 800,
              fontSize: '1rem',
            }}
          >
            {voucher.code}
          </div>
        </div>
        <StatusBadge status={voucher.status} size="sm" />
      </div>

      {/* Body: Info */}
      <div>
        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
          {voucher.name}
        </h4>
        <div style={{ fontSize: '0.875rem', color: 'var(--danger)', fontWeight: 700, marginBottom: '12px' }}>
          Giảm {voucher.discountValue.toLocaleString('vi-VN')} {isPercentage ? '%' : 'đ'}
          {voucher.maxDiscountAmount && isPercentage && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
              {' '} (Tối đa {voucher.maxDiscountAmount.toLocaleString('vi-VN')}đ)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShoppingBag size={14} />
            Đơn tối thiểu: {voucher.minOrderAmount.toLocaleString('vi-VN')}đ
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} />
            HSD: {new Date(voucher.endDate).toLocaleDateString('vi-VN')}
          </div>
        </div>
      </div>

      {/* Progress Bar (Usage) */}
      <div style={{ backgroundColor: 'var(--bg-app)', padding: '10px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 600 }}>
          <span style={{ color: 'var(--text-main)' }}>Đã dùng: {voucher.usedQuantity}/{voucher.totalQuantity}</span>
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