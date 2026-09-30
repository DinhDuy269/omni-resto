import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Receipt } from 'lucide-react';
import { useClientStore } from '../../store/clientStore';
import { OrderStatusStepper } from '../../components/OrderStatusStepper';
import type { PlacedOrderStatus } from '../../../shared/types/client';

const ORDER_MODE_LABELS = {
  DINE_IN:  { label: 'Dùng tại bàn',  emoji: '🍽️' },
  TAKEAWAY: { label: 'Mang về',       emoji: '📦' },
  DELIVERY: { label: 'Giao hàng',     emoji: '🚴' },
};

const PAY_LABELS = {
  QR_CODE: 'Quét mã QR',
  CASH:    'Tiền mặt',
  CARD:    'Thẻ ngân hàng',
};

/**
 * ClientOrderTracking — Real-time-like order status page
 *
 * UX Principles:
 * - Progressive Disclosure: Stepper shows current stage clearly
 * - Feedback: Status updates with smooth visual transition
 * - Anchoring: Order details summary keeps context visible
 * - Color Psychology: Green = success, Orange = active, Gray = future
 * - Gestalt Proximity: Order items grouped together
 */
const ClientOrderTracking: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { placedOrder } = useClientStore();

  // Simulate progressive status update (demo purpose)
  const [simulatedStatus, setSimulatedStatus] = useState<PlacedOrderStatus>(
    placedOrder?.status ?? 'PENDING'
  );

  useEffect(() => {
    if (!placedOrder) return;
    setSimulatedStatus(placedOrder.status);

    // Auto-advance demo: PENDING → PREPARING after 4s
    const t1 = setTimeout(() => setSimulatedStatus('PREPARING'), 4000);
    // → READY after 12s
    const t2 = setTimeout(() => setSimulatedStatus('READY'), 12000);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [placedOrder]);

  if (!placedOrder || placedOrder.id !== orderId) {
    return (
      <div style={{
        fontFamily: 'var(--c-font)', minHeight: '70vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 20, padding: 40, textAlign: 'center',
      }}>
        <span style={{ fontSize: '4rem' }}>🔍</span>
        <h2 style={{ color: 'var(--c-text-main)', margin: 0 }}>Không tìm thấy đơn hàng</h2>
        <p style={{ color: 'var(--c-text-muted)', margin: 0 }}>
          Mã đơn: <code style={{ background: 'var(--c-surface-warm)', padding: '2px 8px', borderRadius: 4 }}>{orderId}</code>
        </p>
        <button className="c-btn c-btn-primary" onClick={() => navigate('/client/menu')}>
          🍜 Đặt món mới
        </button>
      </div>
    );
  }

  const modeInfo = ORDER_MODE_LABELS[placedOrder.orderMode];
  const isCompleted = simulatedStatus === 'COMPLETED';

  return (
    <div style={{ fontFamily: 'var(--c-font)', background: 'var(--c-bg)', minHeight: '100%', padding: '32px 24px 64px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <button
            className="c-btn c-btn-ghost c-btn-sm"
            onClick={() => navigate('/client/menu')}
          >
            <ArrowLeft size={16} /> Đặt thêm
          </button>
        </div>

        {/* Success banner or active banner */}
        <div style={{
          borderRadius: 'var(--c-r-xl)', padding: '24px',
          marginBottom: 24,
          background: isCompleted
            ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
            : 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-dark) 100%)',
          color: '#fff', textAlign: 'center',
          boxShadow: isCompleted
            ? '0 8px 32px rgba(22,163,74,0.35)'
            : 'var(--c-shadow-orange)',
          transition: 'all 0.6s ease',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>
            {isCompleted ? '🎉' : '⏳'}
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px' }}>
            {isCompleted ? 'Đơn hàng hoàn thành!' : 'Đơn hàng đã được tiếp nhận'}
          </h1>
          <p style={{ opacity: 0.88, margin: '0 0 12px', fontSize: '0.9375rem' }}>
            {isCompleted
              ? 'Chúc bạn ngon miệng! Cảm ơn đã tin tùng OmniResto.'
              : `Đang xử lý · Dự kiến ${placedOrder.estimatedMinutes} phút`}
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.2)', borderRadius: 'var(--c-r-full)',
            padding: '5px 16px', fontSize: '0.875rem', fontWeight: 700,
          }}>
            <Receipt size={14} />
            {placedOrder.orderNumber}
          </div>
        </div>

        {/* Order Status Stepper */}
        <div style={{
          background: 'var(--c-surface)', border: '1px solid var(--c-border)',
          borderRadius: 'var(--c-r-lg)', padding: '24px',
          boxShadow: 'var(--c-shadow-sm)', marginBottom: 20,
        }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--c-text-main)', margin: '0 0 20px' }}>
            Trạng thái đơn hàng
          </h2>
          <OrderStatusStepper
            status={simulatedStatus}
            estimatedMinutes={isCompleted ? undefined : placedOrder.estimatedMinutes}
          />
        </div>

        {/* Order details */}
        <div style={{
          background: 'var(--c-surface)', border: '1px solid var(--c-border)',
          borderRadius: 'var(--c-r-lg)', overflow: 'hidden',
          boxShadow: 'var(--c-shadow-sm)', marginBottom: 20,
        }}>
          {/* Info strip */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 0,
            borderBottom: '1px solid var(--c-border-light)',
          }}>
            {[
              { label: 'Hình thức', value: `${modeInfo.emoji} ${modeInfo.label}` },
              { label: 'Địa điểm', value: '📍 Nhà hàng OmniResto' },
              placedOrder.tableNo   ? { label: 'Bàn',          value: `🪑 ${placedOrder.tableNo}` } : null,
              placedOrder.customerName ? { label: 'Khách hàng', value: `👤 ${placedOrder.customerName}` } : null,
              { label: 'Thanh toán', value: PAY_LABELS[placedOrder.paymentMethod] },
              { label: 'Đặt lúc', value: `🕐 ${placedOrder.placedAt}` },
            ].filter(Boolean).map((info) => (
              <div key={info!.label} style={{
                flex: '1 1 200px', padding: '14px 20px',
                borderRight: '1px solid var(--c-border-light)',
                borderBottom: '1px solid var(--c-border-light)',
              }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--c-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                  {info!.label}
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--c-text-body)' }}>
                  {info!.value}
                </div>
              </div>
            ))}
          </div>

          {/* Items list — Gestalt Proximity: items grouped */}
          <div style={{ padding: '16px 20px' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--c-text-main)', margin: '0 0 12px' }}>
              Món đã đặt
            </h3>
            {placedOrder.items.map((item) => (
              <div key={item.menuItemId} style={{
                display: 'flex', gap: 12, alignItems: 'center',
                padding: '8px 0', borderBottom: '1px solid var(--c-border-light)',
              }}>
                <img
                  src={item.image}
                  alt={item.name}
                  style={{ width: 44, height: 44, borderRadius: 'var(--c-r-sm)', objectFit: 'cover', flexShrink: 0 }}
                />
                <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--c-text-body)', fontWeight: 500 }}>
                  {item.name}
                  <span style={{ color: 'var(--c-text-muted)', marginLeft: 4 }}>×{item.quantity}</span>
                </span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--c-text-main)', flexShrink: 0 }}>
                  {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                </span>
              </div>
            ))}

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 12 }}>
              <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--c-text-body)' }}>Tổng cộng</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--c-primary)' }}>
                {placedOrder.totalAmount.toLocaleString('vi-VN')}đ
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic VietQR Payment Card */}
        {placedOrder.paymentMethod === 'QR_CODE' && !isCompleted && (
          <div
            style={{
              background: 'var(--c-surface)',
              border: '2px solid var(--c-primary)',
              borderRadius: 'var(--c-r-lg)',
              padding: '20px',
              textAlign: 'center',
              marginBottom: 20,
              boxShadow: '0 4px 20px rgba(249, 115, 22, 0.15)',
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--c-text-main)', margin: '0 0 6px' }}>
              📲 Thanh Toán Nhanh Qua Mã VietQR
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--c-text-muted)', margin: '0 0 16px' }}>
              Mở ứng dụng Ngân hàng / Momo để quét mã tự động điền số tiền & nội dung
            </p>
            <div style={{ display: 'inline-block', background: '#ffffff', padding: '12px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <img
                src={`https://img.vietqr.io/image/MB-03456789999-compact2.png?amount=${placedOrder.totalAmount}&addInfo=${placedOrder.orderNumber}&accountName=OMNIRESTO%20CHAIN`}
                alt="VietQR Payment"
                style={{ width: 220, height: 220, borderRadius: '8px', display: 'block' }}
              />
            </div>
            <div style={{ marginTop: '14px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--c-primary)' }}>
              Số tiền: {placedOrder.totalAmount.toLocaleString('vi-VN')}đ • Nội dung: {placedOrder.orderNumber}
            </div>
          </div>
        )}

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="c-btn c-btn-outline c-btn-block"
            onClick={() => navigate('/client/menu')}
          >
            🍜 Đặt thêm món
          </button>
          <button
            className="c-btn c-btn-ghost c-btn-block"
            onClick={() => navigate('/client')}
          >
            🏠 Trang chủ
          </button>
        </div>

      </div>
    </div>
  );
};

export default ClientOrderTracking;
