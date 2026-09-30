import React, { useState } from 'react';
import { CheckCircle2, ShieldCheck, Copy, RefreshCw } from 'lucide-react';

interface VietQRPaymentModalProps {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

export const VietQRPaymentModal: React.FC<VietQRPaymentModalProps> = ({
  orderId,
  orderNumber,
  totalAmount,
  onClose,
  onPaymentSuccess,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const bankName = 'MBBank (Ngân Hàng Quân Đội)';
  const accountNumber = '09888888888';
  const accountHolder = 'NHAN HANG OMNIRESTO';
  const transferContent = `OMNIRESTO ${orderNumber}`;

  // VietQR Dynamic Image URL
  const qrImageUrl = `https://img.vietqr.io/image/MB-${accountNumber}-compact2.png?amount=${totalAmount}&addInfo=${encodeURIComponent(
    transferContent
  )}&accountName=${encodeURIComponent(accountHolder)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(transferContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulatePaymentWebhook = async () => {
    setIsSimulating(true);
    try {
      // Send mock webhook to backend payment callback
      const res = await fetch('http://localhost:8080/api/payments/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          transactionId: `TXN-${Date.now()}`,
          amount: totalAmount,
        }),
      });

      if (res.ok) {
        onPaymentSuccess();
      } else {
        // Fallback simulation
        onPaymentSuccess();
      }
    } catch {
      onPaymentSuccess();
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        className="animate-fade-in"
        style={{
          background: 'var(--bg-surface)',
          borderRadius: '24px',
          padding: '28px',
          maxWidth: '440px',
          width: '100%',
          border: '1px solid var(--border-color)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              fontWeight: 700,
              fontSize: '0.85rem',
              marginBottom: '8px',
            }}
          >
            <ShieldCheck size={16} /> VietQR Chuyển Khoản Tự Động 24/7
          </div>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Thanh Toán Đơn Hàng {orderNumber}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
            Mở ứng dụng Ngân hàng (App Banking) bất kỳ để quét mã QR bên dưới
          </p>
        </div>

        {/* QR Code Frame */}
        <div
          style={{
            background: '#ffffff',
            padding: '16px',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            border: '2px solid #e2e8f0',
            textAlign: 'center',
          }}
        >
          <img
            src={qrImageUrl}
            alt="VietQR Payment Code"
            style={{ width: '240px', height: '240px', objectFit: 'contain' }}
          />
          <div style={{ marginTop: '8px', color: '#0f172a', fontWeight: 800, fontSize: '1.1rem' }}>
            {totalAmount.toLocaleString('vi-VN')} đ
          </div>
        </div>

        {/* Account Details Box */}
        <div
          style={{
            width: '100%',
            background: 'var(--bg-card)',
            padding: '14px 16px',
            borderRadius: '14px',
            fontSize: '0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Ngân hàng:</span>
            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{bankName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Số tài khoản:</span>
            <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{accountNumber}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Chủ tài khoản:</span>
            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{accountHolder}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)' }}>Nội dung chuyển khoản:</span>
            <button
              onClick={handleCopy}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: copied ? '#10b981' : 'var(--primary-color)',
                color: '#fff',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.75rem',
              }}
            >
              <Copy size={12} /> {copied ? 'Đã chép' : transferContent}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              background: 'var(--bg-card)',
              color: 'var(--text-muted)',
              fontWeight: 700,
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
            }}
          >
            Đóng Màn Hình
          </button>
          <button
            onClick={handleSimulatePaymentWebhook}
            disabled={isSimulating}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            }}
          >
            {isSimulating ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Xác Nhận Đã Chuyển
          </button>
        </div>
      </div>
    </div>
  );
};
