import React, { useState } from 'react';
import { X, Bell, CheckCircle2, Droplets, Utensils, CreditCard, HelpCircle } from 'lucide-react';
import { useClientStore } from '../store/clientStore';

interface ServiceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  order_id?: string;
  table_no?: string;
}

const SERVICE_PRESETS = [
  { id: 'ice', label: 'Xin thêm đá lạnh', icon: Droplets, color: '#0284c7' },
  { id: 'cutlery', label: 'Xin thêm bát, đĩa, đũa, thìa', icon: Utensils, color: '#ea580c' },
  { id: 'broth', label: 'Châm thêm nước dùng / nước lẩu', icon: Bell, color: '#ca8a04' },
  { id: 'payment', label: 'Yêu cầu thanh toán tại bàn', icon: CreditCard, color: '#16a34a' },
  { id: 'support', label: 'Cần gặp nhân viên phục vụ', icon: HelpCircle, color: '#9333ea' },
];

export const ServiceRequestModal: React.FC<ServiceRequestModalProps> = ({
  isOpen,
  onClose,
  order_id,
  table_no,
}) => {
  const { sendServiceRequest } = useClientStore();
  const [selectedPreset, setSelectedPreset] = useState<string>('ice');
  const [customNote, setCustomNote] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const preset = SERVICE_PRESETS.find((p) => p.id === selectedPreset);
    const requestText = customNote.trim()
      ? `${preset?.label || 'Yêu cầu'}: ${customNote.trim()}`
      : preset?.label || 'Yêu cầu hỗ trợ';

    await sendServiceRequest(order_id || 'table-service', requestText);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setCustomNote('');
      onClose();
    }, 1500);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'c-fade-in 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--c-surface, #ffffff)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '460px',
          padding: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          border: '1px solid var(--c-border, #e2e8f0)',
          fontFamily: 'var(--c-font, sans-serif)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'rgba(232, 93, 38, 0.1)',
                color: 'var(--c-primary, #e85d26)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--c-text-main, #0f172a)' }}>
                Gọi Nhân Viên / Hỗ Trợ
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--c-text-muted, #64748b)' }}>
                {table_no ? `Phục vụ tại Bàn: ${table_no}` : 'Yêu cầu phục vụ nhanh'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--c-text-muted, #64748b)',
              padding: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {isSuccess ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', animation: 'c-fade-up 0.3s ease' }}>
            <CheckCircle2 size={48} color="#16a34a" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ margin: '0 0 6px', fontSize: '1.15rem', color: '#16a34a', fontWeight: 800 }}>
              Đã gửi yêu cầu thành công!
            </h4>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--c-text-muted, #64748b)' }}>
              Nhân viên phục vụ bàn đang đến hỗ trợ quý khách ngay.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {SERVICE_PRESETS.map((p) => {
                const Icon = p.icon;
                const isSelected = selectedPreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPreset(p.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: isSelected ? '1.5px solid var(--c-primary, #e85d26)' : '1px solid var(--c-border, #e2e8f0)',
                      backgroundColor: isSelected ? 'rgba(232, 93, 38, 0.05)' : '#ffffff',
                      color: isSelected ? 'var(--c-primary, #e85d26)' : 'var(--c-text-main, #0f172a)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: isSelected ? 700 : 500,
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon size={18} color={isSelected ? 'var(--c-primary, #e85d26)' : p.color} />
                    <span style={{ flex: 1 }}>{p.label}</span>
                    {isSelected && <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>✓</span>}
                  </button>
                );
              })}
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--c-text-muted, #64748b)', marginBottom: '6px' }}>
                Ghi chú thêm (tùy chọn)
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Lấy cho anh cốc đá ít chanh..."
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--c-border, #e2e8f0)',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="c-btn c-btn-ghost c-btn-block"
                onClick={onClose}
                style={{ flex: 1 }}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="c-btn c-btn-primary c-btn-block"
                style={{ flex: 2 }}
              >
                Gửi yêu cầu tới nhân viên
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
