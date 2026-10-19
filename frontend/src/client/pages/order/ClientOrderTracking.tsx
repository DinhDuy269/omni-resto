import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  ListOrdered,
  Clock,
  ChefHat,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  QrCode,
  PlusCircle,
  Flame,
  Check,
} from 'lucide-react';
import { useClientStore } from '../../store/clientStore';
import { ServiceRequestModal } from '../../components/ServiceRequestModal';
import type { PlacedOrderStatus } from '../../../shared/types/client';
import { PAYMENT_CONFIG, generateVietQRUrl } from '../../../shared/config/paymentConfig';

const STEPS: { key: PlacedOrderStatus; label: string; icon: React.FC<{ size?: number; color?: string }> }[] = [
  { key: 'PENDING', label: 'Tiếp nhận', icon: Clock },
  { key: 'CONFIRMED', label: 'Đã duyệt', icon: Clock },
  { key: 'PREPARING', label: 'Bếp nấu', icon: ChefHat },
  { key: 'READY', label: 'Sẵn sàng', icon: Bell },
  { key: 'COMPLETED', label: 'Phục vụ', icon: Check },
];

export const ClientOrderTracking: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { orders, placed_order, table_session, fetchOrderById } = useClientStore();

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isQrAccordionOpen, setIsQrAccordionOpen] = useState(false);

  // Tìm đơn hàng theo ID hoặc order_number
  const matchedOrder = orders.find(
    (o) => o.id === orderId || o.order_number === orderId
  ) || (placed_order?.id === orderId || placed_order?.order_number === orderId ? placed_order : null);

  const currentStatus: PlacedOrderStatus = ((matchedOrder?.status ?? 'PENDING').toUpperCase() as PlacedOrderStatus);

  // Đồng bộ trạng thái đơn hàng từ Server theo thời gian thực (ngay khi mở trang & polling dự phòng)
  useEffect(() => {
    if (!orderId) return;
    fetchOrderById(orderId);

    const interval = setInterval(() => {
      const current = useClientStore.getState().orders.find((o) => o.id === orderId || o.order_number === orderId);
      if (!current || (current.status !== 'COMPLETED' && current.status !== 'CANCELLED')) {
        fetchOrderById(orderId);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [orderId, fetchOrderById]);

  if (!matchedOrder) {
    return (
      <div style={{
        fontFamily: 'var(--c-font, sans-serif)', minHeight: '70vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 16, padding: 32, textAlign: 'center',
      }}>
        <span style={{ fontSize: '3.5rem' }}>🔍</span>
        <h2 style={{ color: '#0f172a', margin: 0, fontWeight: 800 }}>Không tìm thấy đơn hàng</h2>
        <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>
          Mã đơn: <code style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>{orderId}</code>
        </p>
        <div style={{ display: 'flex', gap: '10px', marginTop: 12 }}>
          <button className="c-btn c-btn-primary" onClick={() => navigate('/client/menu')}>
            🍜 Đặt món mới
          </button>
          <button className="c-btn c-btn-outline" onClick={() => navigate('/client/orders')}>
            📋 Danh sách đơn
          </button>
        </div>
      </div>
    );
  }

  const currentOrder = matchedOrder;
  const isCompleted = currentStatus === 'COMPLETED';

  const orderMode = currentOrder.order_mode || (currentOrder.table_no ? 'DINE_IN' : 'TAKEAWAY');
  let orderModeBadge = {
    icon: '🍽️',
    label: currentOrder.table_no || table_session?.table_no ? `Bàn ${currentOrder.table_no || table_session?.table_no}` : 'Tại bàn',
    bg: '#ecfdf5',
    color: '#047857',
    border: '#a7f3d0'
  };

  if (orderMode === 'TAKEAWAY') {
    orderModeBadge = {
      icon: '🛍️',
      label: currentOrder.table_no ? `Mang về (Bàn ${currentOrder.table_no})` : 'Mang về',
      bg: '#fff7ed',
      color: '#c2410c',
      border: '#fed7aa'
    };
  } else if (orderMode === 'DELIVERY') {
    orderModeBadge = {
      icon: '🛵',
      label: 'Giao hàng tận nơi',
      bg: '#eff6ff',
      color: '#1d4ed8',
      border: '#bfdbfe'
    };
  }

  const currentStepIdx = STEPS.findIndex((s) => s.key === currentStatus);
  const progressPercent = currentStepIdx === -1 ? 0 : (currentStepIdx / (STEPS.length - 1)) * 100;

  // Trạng thái hiển thị từng món ăn
  const getItemStatusBadge = () => {
    switch (currentStatus) {
      case 'COMPLETED':
        return {
          text: orderMode === 'TAKEAWAY' ? 'Đã nhận món' : orderMode === 'DELIVERY' ? 'Đã giao' : 'Đã lên bàn',
          color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: '✅'
        };
      case 'READY':
        return {
          text: orderMode === 'TAKEAWAY' ? 'Sẵn sàng lấy' : orderMode === 'DELIVERY' ? 'Đang ship' : 'Đang bưng ra',
          color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: '🔔'
        };
      case 'PREPARING':
        return { text: 'Bếp đang nấu', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', icon: '🔥' };
      default:
        return { text: 'Chờ nấu', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', icon: '⏳' };
    }
  };

  const itemBadge = getItemStatusBadge();

  return (
    <div style={{
      fontFamily: 'var(--c-font, sans-serif)',
      background: 'var(--c-bg, #faf8f5)',
      minHeight: '100%',
      padding: '20px 16px 80px',
    }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* ── TOP NAV BAR (Minimalist) ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <button
            onClick={() => navigate('/client/orders')}
            style={{
              background: 'none', border: 'none', padding: '6px 8px',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: '#475569', fontSize: '0.875rem', fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={17} />
            <span>Tất cả đơn của bạn</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              background: orderModeBadge.bg, color: orderModeBadge.color, border: `1px solid ${orderModeBadge.border}`,
              padding: '3px 10px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 800,
            }}>
              {orderModeBadge.icon} {orderModeBadge.label}
            </span>
          </div>
        </div>

        {/* ── 1. UNIFIED STATUS & STEPPER CARD (Minimal & Modern) ── */}
        <div style={{
          background: '#ffffff',
          borderRadius: 18,
          border: '1px solid #e2e8f0',
          padding: '20px',
          marginBottom: 16,
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        }}>
          {/* Header Trạng Thái */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 18,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: isCompleted ? '#ecfdf5' : '#fff7ed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isCompleted ? '#16a34a' : '#ea580c',
              }}>
                {isCompleted ? <CheckCircle2 size={24} /> : <Flame size={24} className="c-pulse" />}
              </div>
              <div>
                <h1 style={{
                  fontSize: '1.15rem', fontWeight: 900, color: '#0f172a',
                  margin: '0 0 2px', lineHeight: 1.3,
                }}>
                  {isCompleted
                    ? (orderMode === 'TAKEAWAY' ? 'Đơn mang về đã hoàn tất' : orderMode === 'DELIVERY' ? 'Giao hàng thành công' : 'Đơn hàng đã phục vụ xong')
                    : currentStatus === 'READY'
                    ? (orderMode === 'TAKEAWAY' ? 'Món đã sẵn sàng để mang về!' : orderMode === 'DELIVERY' ? 'Đơn hàng đang được giao!' : 'Món đã sẵn sàng phục vụ!')
                    : currentStatus === 'PREPARING'
                    ? 'Bếp đang chế biến món'
                    : currentStatus === 'CONFIRMED'
                    ? 'Đơn đã duyệt (Chuyển bếp nấu)'
                    : 'Đã gửi vào bếp (Chờ nấu)'}
                </h1>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Đơn {currentOrder.order_number} · Đặt lúc {currentOrder.placed_at || 'vừa xong'}
                </div>
              </div>
            </div>

            {!isCompleted && (
              <div style={{
                background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: 10, padding: '6px 10px', textAlign: 'right', flexShrink: 0,
              }}>
                <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                  Dự kiến
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#ea580c' }}>
                  ~{currentOrder.estimated_minutes || 15}p
                </span>
              </div>
            )}
          </div>

          {/* Minimal Linear Stepper */}
          <div style={{ position: 'relative', margin: '20px 0 10px' }}>
            {/* Background line */}
            <div style={{
              position: 'absolute', top: 14, left: 16, right: 16, height: 3,
              background: '#e2e8f0', borderRadius: 2, zIndex: 1,
            }}>
              <div style={{
                height: '100%', width: `${progressPercent}%`,
                background: '#ea580c', borderRadius: 2, transition: 'width 0.4s ease',
              }} />
            </div>

            {/* Stepper nodes */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              position: 'relative', zIndex: 2,
            }}>
              {STEPS.map((step, idx) => {
                const isDone = idx < currentStepIdx;
                const isCurr = idx === currentStepIdx;
                const IconComponent = step.icon;

                return (
                  <div key={step.key} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', width: 64, textAlign: 'center',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: isDone ? '#16a34a' : isCurr ? '#ea580c' : '#ffffff',
                      border: isDone ? 'none' : isCurr ? '2px solid #ea580c' : '2px solid #cbd5e1',
                      color: isDone || isCurr ? '#ffffff' : '#94a3b8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: isCurr ? '0 0 0 4px rgba(234,88,12,0.18)' : 'none',
                      transition: 'all 0.3s ease',
                    }}>
                      <IconComponent size={14} color={isDone || isCurr ? '#fff' : '#94a3b8'} />
                    </div>
                    <span style={{
                      fontSize: '0.72rem', marginTop: 6,
                      fontWeight: isCurr ? 800 : 600,
                      color: isCurr ? '#ea580c' : isDone ? '#16a34a' : '#94a3b8',
                    }}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 2. DISHES LIST WITH ITEM-LEVEL PROGRESS (Gestalt Grouping) ── */}
        <div style={{
          background: '#ffffff',
          borderRadius: 18,
          border: '1px solid #e2e8f0',
          padding: '18px 20px',
          marginBottom: 16,
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 14,
          }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Tiến độ từng món ({currentOrder.items.length} món)
            </h2>
            <button
              onClick={() => setIsServiceModalOpen(true)}
              style={{
                background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309',
                padding: '4px 10px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer',
              }}
            >
              <Bell size={13} />
              <span>Gọi phục vụ / Xin đá</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {currentOrder.items.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: idx < currentOrder.items.length - 1 ? '1px solid #f1f5f9' : 'none',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                    />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.875rem', fontWeight: 700, color: '#0f172a',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Số lượng: <strong>{item.quantity}</strong> · {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                    </div>
                  </div>
                </div>

                {/* Badge tiến độ từng món */}
                <span style={{
                  background: itemBadge.bg,
                  color: itemBadge.color,
                  border: `1px solid ${itemBadge.border}`,
                  padding: '3px 9px',
                  borderRadius: 999,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  {itemBadge.icon} {itemBadge.text}
                </span>
              </div>
            ))}
          </div>

          {/* Tổng tiền & thanh toán tóm tắt */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 14, paddingTop: 12, borderTop: '1.5px dashed #e2e8f0',
          }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Hình thức: <strong>{currentOrder.payment_method === 'QR_CODE' ? 'Quét QR' : 'Tiền mặt/Tại quầy'}</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', marginRight: 6 }}>Tổng cộng:</span>
              <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ea580c' }}>
                {currentOrder.total_amount.toLocaleString('vi-VN')}đ
              </span>
            </div>
          </div>
        </div>

        {/* ── 3. COLLAPSIBLE VIETQR PAYMENT (Tối giản: Mở khi cần) ── */}
        {currentOrder.payment_method === 'QR_CODE' && !isCompleted && (
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #fed7aa',
            marginBottom: 20,
            overflow: 'hidden',
          }}>
            <button
              type="button"
              onClick={() => setIsQrAccordionOpen(!isQrAccordionOpen)}
              style={{
                width: '100%', padding: '14px 18px',
                background: '#fff7ed', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <QrCode size={18} color="#ea580c" />
                <div>
                  <strong style={{ fontSize: '0.88rem', color: '#9a3412', display: 'block' }}>
                    Thanh toán nhanh qua VietQR
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: '#c2410c' }}>
                    {isQrAccordionOpen ? 'Bấm để thu gọn mã QR' : 'Bấm để hiển thị mã QR chuyển khoản'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ea580c' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                  {currentOrder.total_amount.toLocaleString('vi-VN')}đ
                </span>
                {isQrAccordionOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </button>

            {isQrAccordionOpen && (
              <div style={{ padding: '16px 20px', textAlign: 'center', background: '#fff' }}>
                <div style={{
                  display: 'inline-block', background: '#fff', padding: 8,
                  borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}>
                  <img
                    src={generateVietQRUrl(currentOrder.total_amount, currentOrder.order_number)}
                    alt="VietQR"
                    style={{ width: 190, height: 190, borderRadius: 8, display: 'block' }}
                  />
                </div>
                <div style={{ marginTop: 10, fontSize: '0.8rem', color: '#64748b' }}>
                  Ngân hàng: <strong style={{ color: '#0f172a' }}>{PAYMENT_CONFIG.bank_name}</strong> | STK: <strong style={{ color: '#0f172a' }}>{PAYMENT_CONFIG.account_number}</strong>
                </div>
                <div style={{ marginTop: 4, fontSize: '0.8rem', color: '#64748b' }}>
                  Chủ TK: <strong style={{ color: '#0f172a' }}>{PAYMENT_CONFIG.account_name}</strong>
                </div>
                <div style={{ marginTop: 4, fontSize: '0.8rem', color: '#64748b' }}>
                  Nội dung CK: <strong style={{ color: '#ea580c' }}>{currentOrder.order_number}</strong>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 4. STICKY QUICK ACTIONS (Tiện tay ngón cái) ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
        }}>
          <button
            onClick={() => navigate('/client/menu')}
            style={{
              padding: '13px 16px', borderRadius: 12,
              background: '#ea580c', color: '#fff', border: 'none',
              fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 14px rgba(234, 88, 12, 0.3)',
            }}
          >
            <PlusCircle size={16} />
            <span>Gọi thêm món</span>
          </button>

          <button
            onClick={() => navigate('/client/orders')}
            style={{
              padding: '13px 16px', borderRadius: 12,
              background: '#ffffff', color: '#334155', border: '1px solid #cbd5e1',
              fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <ListOrdered size={16} />
            <span>Tất cả các đợt</span>
          </button>
        </div>

      </div>

      {/* Service Request Modal */}
      <ServiceRequestModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        order_id={currentOrder.id}
        table_no={currentOrder.table_no}
      />
    </div>
  );
};

export default ClientOrderTracking;
