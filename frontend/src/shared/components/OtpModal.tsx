import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { authApi } from '../api/authService';
import './OtpModal.css';

interface OtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (otpCode: string) => Promise<void> | void;
  email?: string;
  phone?: string;
  purpose?: string;
}

export const OtpModal: React.FC<OtpModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  email,
  phone,
  purpose: _purpose,
}) => {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      setOtp(Array(6).fill(''));
      setError('');
      setResendSuccess('');
      setResendCountdown(60);
      setTimeout(() => {
        document.getElementById('otp-input-0')?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, resendCountdown]);

  if (!isOpen) return null;

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    if (value.length > 1) {
      const digits = value.slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(digits.length, 5);
      document.getElementById(`otp-input-${nextIndex}`)?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0 || isResending) return;
    try {
      setIsResending(true);
      setError('');
      setResendSuccess('');
      const target = (phone || email || '').trim();
      if (!target) {
        setError('Không tìm thấy thông tin số điện thoại hoặc email');
        return;
      }
      await authApi.resendOtp(target);
      setResendSuccess('Đã gửi lại mã xác thực mới');
      setResendCountdown(60);
      setOtp(Array(6).fill(''));
      document.getElementById('otp-input-0')?.focus();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể gửi lại mã xác thực. Vui lòng thử lại sau.');
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setError('Vui lòng nhập đầy đủ 6 chữ số');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSuccess(otpValue);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Mã xác thực không hợp lệ hoặc đã hết hạn';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="otp-modal-backdrop" onClick={onClose}>
      <div className="otp-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="otp-modal-close-btn" onClick={onClose} aria-label="Đóng">
          <X size={18} />
        </button>

        <h3 className="otp-modal-title">Xác thực mã OTP</h3>
        <p className="otp-modal-desc">
          Nhập mã 6 chữ số đã gửi tới{' '}
          <span className="otp-target-highlight">{phone || email}</span>
        </p>

        {error && <div className="otp-alert-error">{error}</div>}
        {resendSuccess && <div className="otp-alert-success">{resendSuccess}</div>}

        <form onSubmit={handleSubmit}>
          <div className="otp-inputs-row">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-input-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="otp-digit-input"
                autoComplete="one-time-code"
              />
            ))}
          </div>

          <button type="submit" disabled={loading} className="otp-submit-btn">
            {loading ? 'Đang xác thực...' : 'Xác nhận'}
          </button>

          <div className="otp-resend-row">
            {resendCountdown > 0 ? (
              <span>Gửi lại mã sau {resendCountdown} giây</span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="otp-resend-btn"
              >
                {isResending ? 'Đang gửi...' : 'Gửi lại mã xác thực'}
              </button>
            )}
          </div>

          <button type="button" onClick={onClose} className="otp-back-link">
            Quay lại
          </button>
        </form>
      </div>
    </div>
  );
};

export default OtpModal;