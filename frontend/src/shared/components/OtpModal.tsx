import React, { useState, useEffect, useRef } from 'react';
import { authApi, type OtpPurpose } from '../api/authService';
import './OtpModal.css';

interface OtpModalProps {
  isOpen: boolean;
  email: string;
  purpose: OtpPurpose;
  onClose: () => void;
  onSuccess: (otpCode: string) => void;
}

interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
}

// Component con: Tự tạo mới state khi modal bật lên, sạch lỗi render
const OtpModalDialog: React.FC<Omit<OtpModalProps, 'isOpen'>> = ({
  email,
  purpose,
  onClose,
  onSuccess,
}) => {
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const canResend = countdown === 0;

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const handleChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Tự động focus sang ô tiếp theo
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length < 6) {
      setError('Vui lòng nhập đủ 6 chữ số OTP');
      return;
    }

    try {
      setLoading(true);
      setError('');
      if (purpose === 'REGISTER_VERIFICATION') {
        await authApi.verifyRegisterOtp({ email, otpCode: fullOtp });
      } else {
        await authApi.verifyResetOtp({ email, otpCode: fullOtp });
      }
      onSuccess(fullOtp);
    } catch (err: unknown) {
      const apiErr = err as ApiErrorResponse;
      setError(apiErr.response?.data?.message || 'Mã OTP không chính xác hoặc đã hết hạn');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setError('');
      await authApi.resendOtp(email, purpose);
      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      const apiErr = err as ApiErrorResponse;
      setError(apiErr.response?.data?.message || 'Không thể gửi lại mã OTP, vui lòng thử lại');
    }
  };

  return (
    <div
      className="otp-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        className="otp-modal-card"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '32px 24px',
          width: '100%',
          maxWidth: '430px',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        <h3 className="otp-modal-title">Xác Nhận Mã OTP</h3>
        <p className="otp-modal-desc">
          Mã xác thực gồm 6 chữ số đã được gửi đến email:
          <br />
          <span className="otp-modal-email">{email}</span>
        </p>

        {error && <div className="otp-modal-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Hàng 6 ô vuông bắt buộc nằm ngang */}
          <div
            className="otp-inputs-row"
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '24px',
            }}
          >
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onPaste={handlePaste}
                className="otp-box-input"
                style={{
                  width: '46px',
                  height: '52px',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  textAlign: 'center',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                  outline: 'none',
                }}
              />
            ))}
          </div>

          <div>
            <button type="submit" disabled={loading} className="otp-btn-confirm">
              {loading ? 'Đang xác minh...' : 'Xác Nhận'}
            </button>

            <button type="button" onClick={onClose} className="otp-btn-cancel">
              Hủy bỏ
            </button>
          </div>
        </form>

        <div className="otp-resend-text">
          {canResend ? (
            <button onClick={handleResend} className="otp-resend-link">
              Gửi lại mã OTP
            </button>
          ) : (
            <span>
              Gửi lại mã sau: <strong style={{ color: '#ea580c' }}>{countdown}s</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const OtpModal: React.FC<OtpModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <OtpModalDialog {...props} />;
};