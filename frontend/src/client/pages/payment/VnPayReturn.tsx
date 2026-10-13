import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, ShieldCheck, Home } from 'lucide-react';
import { verifyVnPayCallback } from '../../../shared/api/vnpayApi';
import type { VnPayCallbackResult } from '../../../shared/types/client';

export const VnPayReturn: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<VnPayCallbackResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    if (Object.keys(params).length === 0) {
      setIsLoading(false);
      setErrorMessage('Không tìm thấy thông tin giao dịch VNPAY.');
      return;
    }

    verifyVnPayCallback(params)
      .then((data) => {
        setResult(data);
      })
      .catch((err: any) => {
        setErrorMessage(err.message || 'Xác thực giao dịch VNPAY không thành công.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [location.search]);

  if (isLoading) {
    return (
      <div style={{
        minHeight: '75vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        fontFamily: 'var(--c-font, sans-serif)',
        padding: 24,
      }}>
        <div style={{
          width: 50,
          height: 50,
          border: '4px solid #e2e8f0',
          borderTopColor: '#005baa',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Đang xác thực giao dịch VNPAY...
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
          Vui lòng đợi trong giây lát, hệ thống đang đồng bộ dữ liệu với cổng thanh toán.
        </p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const isSuccess = result?.is_success;

  return (
    <div style={{
      minHeight: '80vh',
      background: 'var(--c-bg, #f8fafc)',
      padding: '40px 16px 80px',
      fontFamily: 'var(--c-font, sans-serif)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        maxWidth: 520,
        width: '100%',
        background: '#ffffff',
        borderRadius: 24,
        padding: '36px 28px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e2e8f0',
        textAlign: 'center',
      }}>
        {/* Header Icon */}
        <div style={{ marginBottom: 20 }}>
          {isSuccess ? (
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: '#dcfce7',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
            }}>
              <CheckCircle2 size={48} strokeWidth={2.5} />
            </div>
          ) : (
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
            }}>
              <XCircle size={48} strokeWidth={2.5} />
            </div>
          )}
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '1.4rem',
          fontWeight: 900,
          color: isSuccess ? '#166534' : '#991b1b',
          margin: '0 0 8px',
        }}>
          {isSuccess ? 'Thanh Toán VNPAY Thành Công!' : 'Giao Dịch Chưa Thành Công'}
        </h1>

        <p style={{
          fontSize: '0.875rem',
          color: '#64748b',
          margin: '0 0 24px',
          lineHeight: 1.5,
        }}>
          {isSuccess
            ? 'Đơn hàng của quý khách đã được xác nhận thanh toán qua VNPAY Sandbox và tự động gửi tới quầy bếp để chuẩn bị món ăn.'
            : (result?.message || errorMessage || 'Quý khách đã hủy giao dịch hoặc cổng thanh toán phản hồi thất bại.')}
        </p>

        {/* Transaction Details Card */}
        {result && (
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: 18,
            marginBottom: 28,
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            fontSize: '0.85rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
              <span>Cổng thanh toán</span>
              <strong style={{ color: '#005baa', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ShieldCheck size={14} /> VNPAY Sandbox (QR)
              </strong>
            </div>

            {result.order_number && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Mã đơn hàng</span>
                <strong style={{ color: '#0f172a' }}>{result.order_number}</strong>
              </div>
            )}

            {result.transaction_no && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Mã giao dịch VNPAY</span>
                <span style={{ color: '#334155', fontWeight: 600 }}>{result.transaction_no}</span>
              </div>
            )}

            {result.amount && result.amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', borderTop: '1px dashed #cbd5e1', paddingTop: 8 }}>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>Số tiền thanh toán</span>
                <strong style={{ fontSize: '1.05rem', color: '#ea580c', fontWeight: 900 }}>
                  {result.amount.toLocaleString('vi-VN')}đ
                </strong>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isSuccess ? (
            <>
              <button
                onClick={() => navigate('/client/orders')}
                className="c-btn c-btn-primary c-btn-lg c-btn-block"
                style={{
                  padding: '14px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span>Theo dõi tiến độ món ăn</span>
                <ArrowRight size={16} />
              </button>
              <button
                onClick={() => navigate('/client')}
                className="c-btn c-btn-ghost c-btn-block"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  color: '#64748b',
                  fontSize: '0.85rem',
                }}
              >
                <Home size={15} />
                <span>Về trang chủ</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/client/cart')}
                className="c-btn c-btn-primary c-btn-lg c-btn-block"
                style={{
                  padding: '14px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <RotateCcw size={16} />
                <span>Quay lại giỏ hàng & Thử lại</span>
              </button>
              <button
                onClick={() => navigate('/client/orders')}
                className="c-btn c-btn-ghost c-btn-block"
                style={{ color: '#64748b', fontSize: '0.85rem' }}
              >
                Kiểm tra danh sách đơn hàng
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VnPayReturn;
