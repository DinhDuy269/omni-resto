import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getValidateVoucherSchema } from '../validate';
import type { VoucherInfo, DiscountType } from '../../../../shared/types/admin';

interface Props {
  isOpen: boolean;
  initialData?: VoucherInfo | null;
  onClose: () => void;
  onSubmit: (data: Partial<VoucherInfo>) => Promise<void>;
}

const DEFAULT_FORM_STATE = {
  code: '',
  name: '',
  description: '',
  discountType: 'FIXED_AMOUNT' as DiscountType,
  discountValue: 0,
  maxDiscountAmount: 0,
  minOrderAmount: 0,
  totalQuantity: 100,
  usageLimitPerUser: 1,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  isWelcomeVoucher: false,
};

export const CreateVoucherModal: React.FC<Props> = ({
  isOpen,
  initialData,
  onClose,
  onSubmit,
}) => {
  // 1. Khai báo state trước
  const [formData, setFormData] = useState(DEFAULT_FORM_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // 2. Đồng bộ dữ liệu khi mở modal hoặc thay đổi initialData
  useEffect(() => {
    if (initialData) {
      setFormData({
        code: initialData.code || '',
        name: initialData.name || '',
        description: initialData.description || '',
        discountType: initialData.discountType || 'FIXED_AMOUNT',
        discountValue: Number(initialData.discountValue) || 0,
        maxDiscountAmount: Number(initialData.maxDiscountAmount) || 0,
        minOrderAmount: Number(initialData.minOrderAmount) || 0,
        totalQuantity: Number(initialData.totalQuantity) || 100,
        usageLimitPerUser: Number(initialData.usageLimitPerUser) || 1,
        startDate: initialData.startDate
          ? initialData.startDate.slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        endDate: initialData.endDate
          ? initialData.endDate.slice(0, 10)
          : new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        isWelcomeVoucher: Boolean(initialData.isWelcomeVoucher),
      });
    } else {
      setFormData(DEFAULT_FORM_STATE);
    }
    setErrors({});
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const schema = getValidateVoucherSchema();
      await schema.validate(formData, { abortEarly: false });

      setSubmitting(true);
      await onSubmit({
        ...formData,
        code: formData.code.trim().toUpperCase(),
        discountValue: Number(formData.discountValue),
        maxDiscountAmount:
          formData.discountType === 'PERCENTAGE' && Number(formData.maxDiscountAmount) > 0
            ? Number(formData.maxDiscountAmount)
            : undefined,
        minOrderAmount: Number(formData.minOrderAmount) || 0,
        totalQuantity: Number(formData.totalQuantity) || 0,
        usageLimitPerUser: Number(formData.usageLimitPerUser) || 1,
        status: initialData?.status || 'ACTIVE',
      });
      onClose();
    } catch (err: any) {
      if (err.inner) {
        const fieldErrors: Record<string, string> = {};
        err.inner.forEach((validationError: any) => {
          if (validationError.path && !fieldErrors[validationError.path]) {
            fieldErrors[validationError.path] = validationError.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        alert(err.message || 'Thao tác khuyến mãi thất bại!');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isEditMode = Boolean(initialData);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px 28px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #f1f5f9',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header Modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
            {isEditMode ? 'Chỉnh Sửa Mã Khuyến Mãi' : 'Thêm Khuyến Mãi Mới'}
          </h3>
          <button
            onClick={onClose}
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Mã voucher & Tên */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Mã khuyến mãi *
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="VD: GIAM20K"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1.5px solid ${errors.code ? '#ef4444' : '#e2e8f0'}`,
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {errors.code && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 4, display: 'block' }}>{errors.code}</span>}
            </div>

            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Tên chương trình *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="VD: Giảm 20k đơn từ 100k"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1.5px solid ${errors.name ? '#ef4444' : '#e2e8f0'}`,
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {errors.name && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 4, display: 'block' }}>{errors.name}</span>}
            </div>
          </div>

          {/* Loại giảm & Mức giảm */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Loại giảm
              </label>
              <select
                name="discountType"
                value={formData.discountType}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '0.875rem',
                  outline: 'none',
                  background: '#fff',
                  boxSizing: 'border-box',
                }}
              >
                <option value="FIXED_AMOUNT">Giảm Tiền Mặt (VNĐ)</option>
                <option value="PERCENTAGE">Giảm Theo Phần Trăm (%)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                {formData.discountType === 'PERCENTAGE' ? 'Phần trăm giảm (%) *' : 'Số tiền giảm (VNĐ) *'}
              </label>
              <input
                type="number"
                name="discountValue"
                min="0"
                value={formData.discountValue}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1.5px solid ${errors.discountValue ? '#ef4444' : '#e2e8f0'}`,
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {errors.discountValue && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 4, display: 'block' }}>{errors.discountValue}</span>}
            </div>
          </div>

          {/* Giảm tối đa & Đơn tối thiểu */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {formData.discountType === 'PERCENTAGE' ? (
              <div>
                <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Giảm tối đa (VNĐ)
                </label>
                <input
                  type="number"
                  name="maxDiscountAmount"
                  min="0"
                  value={formData.maxDiscountAmount}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            ) : <div />}

            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Đơn hàng tối thiểu (VNĐ)
              </label>
              <input
                type="number"
                name="minOrderAmount"
                min="0"
                value={formData.minOrderAmount}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Số lượng phát hành & Giới hạn/khách */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Tổng số lượng mã
              </label>
              <input
                type="number"
                name="totalQuantity"
                min="1"
                value={formData.totalQuantity}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Số lượt dùng/khách
              </label>
              <input
                type="number"
                name="usageLimitPerUser"
                min="1"
                value={formData.usageLimitPerUser}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Ngày bắt đầu & Ngày kết thúc */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Ngày bắt đầu *
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1.5px solid ${errors.startDate ? '#ef4444' : '#e2e8f0'}`,
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {errors.startDate && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 4, display: 'block' }}>{errors.startDate}</span>}
            </div>

            <div>
              <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Ngày kết thúc *
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1.5px solid ${errors.endDate ? '#ef4444' : '#e2e8f0'}`,
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {errors.endDate && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 4, display: 'block' }}>{errors.endDate}</span>}
            </div>
          </div>

          {/* Các nút hành động */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#334155',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '9px 24px',
                borderRadius: '8px',
                border: 'none',
                background: '#2563eb',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Đang lưu...' : isEditMode ? 'Lưu Thay Đổi' : 'Tạo Khuyến Mãi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};