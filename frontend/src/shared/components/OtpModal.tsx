import React, { useState, useEffect } from 'react';
import { authApi,type OtpPurpose } from '../api/authService';

interface OtpModalProps {
  isOpen: boolean;
  email: string;
  purpose: OtpPurpose;
  onClose: () => void;
  onSuccess: (otpCode: string) => void;
}

export const OtpModal: React.FC<OtpModalProps> = ({
  isOpen,
  email,
  purpose,
  onClose,
  onSuccess,
}) => {
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);

  useEffect(() => {
   let timer: ReturnType<typeof setInterval>;
    if (isOpen && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [isOpen, countdown]);

  if (!isOpen) return null;

  const handleChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Tự động focus sang ô tiếp theo
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Mã OTP không chính xác hoặc đã hết hạn');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setError('');
      await authApi.resendOtp(email, purpose);
      setCountdown(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể gửi lại mã OTP, vui lòng thử lại');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl">
        <h3 className="text-xl font-bold text-center text-gray-800">Xác Nhập Mã OTP</h3>
        <p className="mt-2 text-sm text-center text-gray-600">
          Mã xác thực gồm 6 chữ số đã được gửi đến email:<br />
          <span className="font-semibold text-orange-600">{email}</span>
        </p>

        {error && (
          <div className="p-3 mt-4 text-sm text-red-600 bg-red-50 rounded-md text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6">
          <div className="flex justify-center gap-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-input-${index}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="w-12 h-12 text-2xl font-bold text-center border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
              />
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Đang xác minh...' : 'Xác Nhận'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              Hủy bỏ
            </button>
          </div>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">
          {canResend ? (
            <button
              onClick={handleResend}
              className="font-semibold text-orange-600 hover:underline"
            >
              Gửi lại mã OTP
            </button>
          ) : (
            <span>Gửi lại mã sau: <strong className="text-orange-600">{countdown}s</strong></span>
          )}
        </div>
      </div>
    </div>
  );
};