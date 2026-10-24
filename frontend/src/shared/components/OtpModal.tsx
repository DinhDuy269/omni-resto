import React, { useState, useEffect } from 'react';

interface OtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (otpCode: string) => void;
  email?: string;
  phone?: string;
  purpose?: string;
}

export const OtpModal: React.FC<OtpModalProps> = ({
  isOpen,
  onClose: _onClose,
  onSuccess,
  email,
  phone,
  purpose: _purpose,
}) => {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // === NGĂN ĐÓNG TRANG ===
  useEffect(() => {
    if (isOpen) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [isOpen]);
  // === KẾT THÚC ===

  useEffect(() => {
    if (isOpen) {
      setOtp(Array(6).fill(''));
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setError('Vui lòng nhập đủ 6 chữ số mã OTP');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Gọi API xác minh OTP tại đây
      onSuccess(otpValue);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Xác minh thất bại, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'rgba(0,0,0,0.5)', position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
      <div style={{ background: 'white', borderRadius: '16px', maxWidth: '430px', width: '100%', padding: '32px 24px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h3 style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center', marginBottom: '8px', color: '#1f2937' }}>
          Xác Nhận Mã OTP
        </h3>
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '24px' }}>
          Mã xác thực gồm 6 chữ số đã được gửi đến:<br />
          <span style={{ fontWeight: 600, color: '#1f2937' }}>{email || phone}</span>
        </p>

        {error && (
          <div style={{ background: '#fef2f2', color: '#dc2626', padding: '12px', borderRadius: '8px', marginBottom: '16px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
            {otp.map((digit, index) => (
              <input
                key={index}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                style={{
                  width: '48px',
                  height: '52px',
                  textAlign: 'center',
                  fontSize: '20px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  outline: 'none'
                }}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: '#f97316',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? 'Đang xác minh...' : 'Xác Nhận'}
          </button>

          {/* === NÚT HỦY BỎ ĐÃ XÓA === */}
        </form>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: '#6b7280' }}>
          Gửi lại mã sau: <span style={{ color: '#f97316', fontWeight: 600 }}>60s</span>
        </p>
      </div>
    </div>
  );
};

export default OtpModal;