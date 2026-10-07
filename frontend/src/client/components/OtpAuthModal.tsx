import React, { useState } from 'react';
import { customerApi } from '../../shared/api/customerApi';

interface OtpAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (phone: string) => void;
}

export const OtpAuthModal: React.FC<OtpAuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      setError('Vui lòng nhập số điện thoại');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await customerApi.sendOtp(phone);
      setStep('OTP');
    } catch {
      setError('Gửi mã OTP thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      setError('Vui lòng nhập mã OTP');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await customerApi.verifyOtp(phone, otp);
      if (res.success) {
        onSuccess(phone);
        onClose();
      } else {
        setError(res.message || 'Mã OTP không đúng');
      }
    } catch {
      setError('Xác thực thất bại. Vui lòng kiểm tra lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-xl"
        >
          ✕
        </button>
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
          {step === 'PHONE' ? 'Đăng nhập / Đặt món' : 'Xác thực OTP'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        {step === 'PHONE' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số điện thoại
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ví dụ: 0912345678"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow transition duration-200 disabled:opacity-50"
            >
              {loading ? 'Đang gửi...' : 'Tiếp tục'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Mã OTP đã được gửi tới số {phone}
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mã xác thực OTP
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Nhập 6 số OTP"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 text-center tracking-widest text-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow transition duration-200 disabled:opacity-50"
            >
              {loading ? 'Đang xác thực...' : 'Xác nhận'}
            </button>
            <button
              type="button"
              onClick={() => setStep('PHONE')}
              className="w-full text-center text-sm text-gray-500 hover:underline mt-2"
            >
              Đổi số điện thoại khác
            </button>
          </form>
        )}
      </div>
    </div>
  );
};