import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import type { VoucherInfo, DiscountType } from '../../../../shared/types';

interface VoucherFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<VoucherInfo>) => Promise<void>;
  initialData?: VoucherInfo | null;
}

export const VoucherFormModal: React.FC<VoucherFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const isEdit = Boolean(initialData);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discountType: 'FIXED_AMOUNT' as DiscountType,
    discountValue: 0,
    maxDiscountAmount: 0,
    minOrderAmount: 0,
    totalQuantity: 100,
    usageLimitPerUser: 1,
    startDate: '',
    endDate: '',
    isWelcomeVoucher: false,
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        code: initialData.code || '',
        name: initialData.name || '',
        description: initialData.description || '',
        discountType: (initialData.discountType?.toUpperCase() || 'FIXED_AMOUNT') as DiscountType,
        discountValue: initialData.discountValue || 0,
        maxDiscountAmount: initialData.maxDiscountAmount || 0,
        minOrderAmount: initialData.minOrderAmount || 0,
        totalQuantity: initialData.totalQuantity || 100,
        usageLimitPerUser: initialData.usageLimitPerUser || 1,
        startDate: initialData.startDate ? initialData.startDate.slice(0, 10) : '',
        endDate: initialData.endDate ? initialData.endDate.slice(0, 10) : '',
        isWelcomeVoucher: Boolean(initialData.isWelcomeVoucher),
      });
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      setFormData({
        code: '',
        name: '',
        description: '',
        discountType: 'FIXED_AMOUNT',
        discountValue: 20000,
        maxDiscountAmount: 50000,
        minOrderAmount: 100000,
        totalQuantity: 100,
        usageLimitPerUser: 1,
        startDate: today,
        endDate: nextMonth,
        isWelcomeVoucher: false,
      });
    }
    setErrorMsg(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanCode = formData.code.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg('Vui lòng nhập mã khuyến mãi.');
      return;
    }
    if (!formData.name.trim()) {
      setErrorMsg('Vui lòng nhập tên chương trình khuyến mãi.');
      return;
    }
    if (formData.discountValue <= 0) {
      setErrorMsg('Giá trị giảm giá phải lớn hơn 0.');
      return;
    }
    if (formData.discountType === 'PERCENTAGE' && formData.discountValue > 100) {
      setErrorMsg('Phần trăm giảm giá không được vượt quá 100%.');
      return;
    }
    if (formData.startDate && formData.endDate && formData.endDate < formData.startDate) {
      setErrorMsg('Ngày kết thúc phải diễn ra sau ngày bắt đầu.');
      return;
    }

    try {
      setSubmitting(true);
      const payload: Partial<VoucherInfo> = {
        code: cleanCode,
        name: formData.name.trim(),
        description: formData.description.trim(),
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        maxDiscountAmount:
          formData.discountType === 'PERCENTAGE' && Number(formData.maxDiscountAmount) > 0
            ? Number(formData.maxDiscountAmount)
            : undefined,
        minOrderAmount: Number(formData.minOrderAmount) || 0,
        totalQuantity: Number(formData.totalQuantity) || 1,
        usageLimitPerUser: Number(formData.usageLimitPerUser) || 1,
        startDate: formData.startDate ? `${formData.startDate}T00:00:00` : new Date().toISOString(),
        endDate: formData.endDate ? `${formData.endDate}T23:59:59` : new Date(Date.now() + 30 * 86400000).toISOString(),
        isWelcomeVoucher: formData.isWelcomeVoucher,
      };

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Đã có lỗi xảy ra khi lưu khuyến mãi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              {isEdit ? 'Chỉnh Sửa Khuyến Mãi' : 'Tạo Khuyến Mãi Mới'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0' }}>
              {isEdit ? `Cập nhật thông số mã [${initialData?.code}]` : 'Thiết lập mã giảm giá để thu hút thực khách'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {errorMsg && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Code & Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Mã Code *
              </label>
              <input
                type="text"
                placeholder="VD: CHAOBAN20"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Tên Chương Trình *
              </label>
              <input
                type="text"
                placeholder="VD: Ưu Đãi Chào Bạn Mới"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Mô Tả Điều Kiện Áp Dụng
            </label>
            <textarea
              rows={2}
              placeholder="VD: Áp dụng cho đơn hàng dùng bữa tại nhà hàng từ 200.000đ"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Discount Type & Value */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Hình Thức Giảm Giá *
              </label>
              <select
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value as DiscountType })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box',
                }}
              >
                <option value="FIXED_AMOUNT">Giảm Tiền Mặt (VNĐ)</option>
                <option value="PERCENTAGE">Giảm Theo Phần Trăm (%)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                {formData.discountType === 'PERCENTAGE' ? 'Phần Trăm Giảm (%) *' : 'Số Tiền Giảm (VNĐ) *'}
              </label>
              <input
                type="number"
                min={1}
                max={formData.discountType === 'PERCENTAGE' ? 100 : 10000000}
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Max Discount & Min Order */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Giảm Tối Đa (VNĐ)
              </label>
              <input
                type="number"
                min={0}
                disabled={formData.discountType !== 'PERCENTAGE'}
                value={formData.maxDiscountAmount}
                onChange={(e) => setFormData({ ...formData, maxDiscountAmount: Number(e.target.value) })}
                placeholder={formData.discountType !== 'PERCENTAGE' ? 'Không áp dụng' : 'VD: 50000'}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none',
                  backgroundColor: formData.discountType !== 'PERCENTAGE' ? '#f1f5f9' : '#ffffff',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Đơn Hàng Tối Thiểu (VNĐ)
              </label>
              <input
                type="number"
                min={0}
                value={formData.minOrderAmount}
                onChange={(e) => setFormData({ ...formData, minOrderAmount: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Quantities */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Tổng Số Lượng Phát Hành *
              </label>
              <input
                type="number"
                min={1}
                value={formData.totalQuantity}
                onChange={(e) => setFormData({ ...formData, totalQuantity: Number(e.target.value) })}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Giới Hạn Lượt/Khách *
              </label>
              <input
                type="number"
                min={1}
                value={formData.usageLimitPerUser}
                onChange={(e) => setFormData({ ...formData, usageLimitPerUser: Number(e.target.value) })}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Start Date & End Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Ngày Bắt Đầu *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Ngày Kết Thúc *
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Welcome Voucher Option */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#334155', cursor: 'pointer', marginTop: '4px' }}>
            <input
              type="checkbox"
              checked={formData.isWelcomeVoucher}
              onChange={(e) => setFormData({ ...formData, isWelcomeVoucher: e.target.checked })}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 600 }}>Tự động tặng khi khách hàng mới đăng ký tài khoản (Welcome Voucher)</span>
          </label>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Đang Lưu...' : isEdit ? 'Lưu Thay Đổi' : 'Tạo Khuyến Mãi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
