import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Utensils, ShoppingBag, Bike, QrCode, Banknote, CreditCard } from 'lucide-react';
import { useClientStore, selectTotalAmount } from '../../store/clientStore';
import type { OrderMode, ClientPaymentMethod } from '../../../shared/types/client';
import { PAYMENT_CONFIG, generateVietQRUrl } from '../../../shared/config/paymentConfig';

/**
 * ClientCart — Multi-step checkout
 *
 * UX Principles:
 * - Hick's Law: 3 steps instead of one long form (chunk complexity)
 * - Miller's Law: Each step shows only relevant info
 * - Progressive Disclosure: Step 1 → 2 → 3 (info revealed incrementally)
 * - Visual Hierarchy: Step indicator at top (orientation/navigation aid)
 * - Fitts's Law: Mode selector buttons are large (min 80px tall)
 * - Anchoring: Order summary always visible on right (desktop)
 */
const ClientCart: React.FC = () => {
  const navigate = useNavigate();
  const {
    cart, updateQuantity, removeFromCart,
    orderMode, setOrderMode,
    placeOrder, tableSession,
    refreshTableSession, cancelPaymentRequest,
  } = useClientStore();
  const totalAmount = useClientStore(selectTotalAmount);

  const [step, setStep]                   = useState<1 | 2 | 3>(1);
  const [customerName, setCustomerName]   = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const tableNo                           = tableSession?.tableNo || '';
  const [deliveryAddr, setDeliveryAddr]   = useState('');
  const [notes, setNotes]                 = useState('');
  const [payMethod, setPayMethod]         = useState<ClientPaymentMethod>('QR_CODE');
  const [isSubmitting, setIsSubmitting]   = useState(false);

  // VietQR modal state (Dành cho TAKEAWAY / DELIVERY hoặc khi nhà hàng cài đặt PAY_FIRST)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentOrder, setCurrentOrder]         = useState<any>(null);
  const [isPaidSuccess, setIsPaidSuccess]       = useState(false);
  const [timeLeft, setTimeLeft]                 = useState(600); // 10 minutes

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const isEmpty    = cart.length === 0;

  // Tự động làm mới trạng thái phiên từ Server khi mở giỏ hàng (Zero-trust)
  React.useEffect(() => {
    if (tableSession?.sessionToken) {
      refreshTableSession();
    }
  }, []);

  const ORDER_MODES: Array<{ mode: OrderMode; icon: typeof Utensils; label: string; desc: string; emoji: string }> = [
    { mode: 'DINE_IN',  icon: Utensils,  label: 'Tại bàn',  desc: 'Dùng bữa ngay tại nhà hàng (Yêu cầu quét QR)', emoji: '🍽️' },
    { mode: 'TAKEAWAY', icon: ShoppingBag, label: 'Mang về', desc: 'Đóng gói mang đi, nhận tại quầy', emoji: '📦' },
    { mode: 'DELIVERY', icon: Bike,      label: 'Giao hàng', desc: 'Giao đến tận địa chỉ của bạn', emoji: '🚴' },
  ];

  const PAY_METHODS: Array<{ key: ClientPaymentMethod; label: string; icon: typeof QrCode }> = [
    { key: 'QR_CODE', label: 'Quét QR Ngân hàng (VietQR)', icon: QrCode },
    { key: 'CASH',    label: 'Tiền mặt', icon: Banknote },
    { key: 'CARD',    label: 'Thẻ ngân hàng', icon: CreditCard },
  ];

  const handlePlaceOrder = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const placed = await placeOrder({
        orderMode,
        tableNo:         orderMode === 'DINE_IN' ? (tableSession?.tableNo || tableNo) : undefined,
        sessionToken:    orderMode === 'DINE_IN' ? tableSession?.sessionToken : undefined,
        customerName:    customerName || undefined,
        customerPhone:   customerPhone || undefined,
        deliveryAddress: orderMode === 'DELIVERY' ? deliveryAddr : undefined,
        notes:           notes || undefined,
        paymentMethod:   orderMode === 'DINE_IN' ? 'CASH' : payMethod,
      });

      if (!placed) {
        // Đặt hàng thất bại hoặc server báo lỗi: Giữ nguyên giỏ hàng và không chuyển trang
        return;
      }

      // Ăn tại bàn (Dine-in) chế độ Trả sau (POSTPAID): Không bắt thanh toán trước, chuyển thẳng sang trang theo dõi đơn!
      if (orderMode === 'DINE_IN' && tableSession?.mode !== 'PAY_FIRST') {
        navigate('/client/orders');
      } else if (payMethod === 'QR_CODE' || tableSession?.mode === 'PAY_FIRST') {
        setCurrentOrder(placed);
        setShowPaymentModal(true);
        setTimeLeft(600);
      } else {
        navigate(`/client/orders`);
      }
    } catch (err: any) {
      alert(err.message || 'Không thể đặt món. Quý khách vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Timer & Polling for VietQR payment
  React.useEffect(() => {
    let timer: any;
    let poller: any;

    if (showPaymentModal && currentOrder && !isPaidSuccess) {
      timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);

      poller = setInterval(async () => {
        try {
          const res = await fetch(`/api/payments/status/${currentOrder.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.isPaid) {
              setIsPaidSuccess(true);
              setTimeout(() => {
                setShowPaymentModal(false);
                navigate(`/client/order/${currentOrder.id}`);
              }, 2000);
            }
          }
        } catch {}
      }, 2500);
    }

    return () => {
      clearInterval(timer);
      clearInterval(poller);
    };
  }, [showPaymentModal, currentOrder, isPaidSuccess]);

  const canGoStep2 = cart.length > 0;
  const canGoStep3 = orderMode !== undefined;
  const canConfirm = orderMode !== 'DINE_IN' ? true : Boolean(tableSession);

  /* Step progress indicator */
  const StepIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
      {(['Giỏ hàng', 'Hình thức', 'Thông tin'] as const).map((label, i) => {
        const stepNum = (i + 1) as 1 | 2 | 3;
        const done    = step > stepNum;
        const active  = step === stepNum;
        return (
          <React.Fragment key={label}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.875rem', fontFamily: 'var(--c-font)',
                transition: 'all 0.3s ease',
                ...(done ? {
                  background: 'var(--c-success)', color: '#fff',
                } : active ? {
                  background: 'var(--c-primary)', color: '#fff',
                  boxShadow: 'var(--c-shadow-orange)',
                } : {
                  background: 'var(--c-border)', color: 'var(--c-text-muted)',
                }),
              }}>
                {done ? <Check size={16} strokeWidth={3} /> : stepNum}
              </div>
              <span style={{
                fontSize: '0.75rem', fontWeight: active ? 700 : 500,
                color: active ? 'var(--c-primary)' : done ? 'var(--c-success)' : 'var(--c-text-muted)',
                whiteSpace: 'nowrap',
              }}>
                {label}
              </span>
            </div>
            {i < 2 && (
              <div style={{
                flex: 1, height: 2, margin: '0 8px', marginBottom: 22,
                background: done ? 'var(--c-success)' : 'var(--c-border)',
                transition: 'background 0.4s ease',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  /* Order summary sidebar (always visible — Anchoring) */
  const OrderSummary = () => (
    <div style={{
      background: 'var(--c-surface)', border: '1px solid var(--c-border)',
      borderRadius: 'var(--c-r-lg)', padding: '20px', boxShadow: 'var(--c-shadow-sm)',
      position: 'sticky', top: 'calc(var(--c-header-h) + 20px)',
    }}>
      <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--c-text-main)', margin: '0 0 16px' }}>
        Tóm tắt đơn hàng
      </h3>
      {cart.map((item) => (
        <div key={item.menuItemId} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          gap: 8, marginBottom: 10,
        }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--c-text-body)', lineHeight: 1.4, flex: 1 }}>
            {item.name} <span style={{ color: 'var(--c-text-muted)' }}>×{item.quantity}</span>
          </span>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--c-text-main)', flexShrink: 0 }}>
            {(item.price * item.quantity).toLocaleString('vi-VN')}đ
          </span>
        </div>
      ))}
      <div style={{ height: 1, background: 'var(--c-border-light)', margin: '12px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--c-text-body)' }}>
          Tổng cộng
        </span>
        <span style={{ fontSize: '1.125rem', fontWeight: 900, color: 'var(--c-primary)' }}>
          {totalAmount.toLocaleString('vi-VN')}đ
        </span>
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)', margin: '8px 0 0', textAlign: 'center' }}>
        * Chưa bao gồm phí dịch vụ và phí giao hàng
      </p>
    </div>
  );

  if (isEmpty) {
    return (
      <div style={{
        fontFamily: 'var(--c-font)', minHeight: '70vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 20, padding: 40, textAlign: 'center',
      }}>
        <span style={{ fontSize: '4rem' }}>🛒</span>
        <h2 style={{ color: 'var(--c-text-main)', margin: 0, fontSize: '1.25rem' }}>Giỏ hàng trống</h2>
        <p style={{ color: 'var(--c-text-muted)', margin: 0 }}>Hãy chọn món ăn yêu thích trước nhé!</p>
        <button
          className="c-btn c-btn-primary"
          onClick={() => navigate('/client/menu')}
        >
          🍜 Xem thực đơn
        </button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'var(--c-font)', background: 'var(--c-bg)', minHeight: '100%', padding: '32px 24px 64px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <button
            className="c-btn c-btn-ghost c-btn-sm"
            onClick={() => step === 1 ? navigate('/client/menu') : setStep((s) => (s - 1) as 1 | 2 | 3)}
          >
            <ArrowLeft size={16} /> Quay lại
          </button>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--c-text-main)', margin: 0 }}>
            Xác nhận đặt hàng
          </h1>
        </div>

        <StepIndicator />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
          {/* ── Main Content (Left) ── */}
          <div>

            {/* ─ STEP 1: Review Cart ─ */}
            {step === 1 && (
              <div className="c-animate-fade-up" style={{
                background: 'var(--c-surface)', border: '1px solid var(--c-border)',
                borderRadius: 'var(--c-r-lg)', overflow: 'hidden', boxShadow: 'var(--c-shadow-sm)',
              }}>
                <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--c-border-light)' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--c-text-main)' }}>
                    🛒 Giỏ hàng ({totalItems} món)
                  </h2>
                </div>

                {tableSession && orderMode === 'DINE_IN' && (
                  <div style={{
                    background: tableSession.status === 'PAYMENT_REQUESTED' ? '#eff6ff' : '#f0fdf4',
                    borderBottom: '1px solid var(--c-border-light)',
                    padding: '12px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.3rem' }}>🍽️</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                          {tableSession.tableNo}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {tableSession.status === 'PAYMENT_REQUESTED' ? (
                            <span style={{ color: '#0284c7', fontWeight: 700 }}>❄️ Hóa đơn đang đóng băng để thanh toán</span>
                          ) : tableSession.isVerified ? (
                            <span style={{ color: '#16a34a', fontWeight: 700 }}>✅ Bàn đã xác nhận · Món gọi thêm vào thẳng bếp</span>
                          ) : (
                            <span style={{ color: '#d97706', fontWeight: 700 }}>⏳ Đợt 1 · Chờ nhân viên xác nhận tại bàn</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {tableSession.status === 'PAYMENT_REQUESTED' && (
                      <button
                        onClick={async () => {
                          await cancelPaymentRequest();
                        }}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #bae6fd',
                          color: '#0284c7',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        🔓 Hủy đóng băng
                      </button>
                    )}
                  </div>
                )}

                {cart.map((item) => (
                  <div key={item.menuItemId} style={{
                    display: 'flex', gap: 14, padding: '16px 20px',
                    borderBottom: '1px solid var(--c-border-light)',
                  }}>
                    <img src={item.image} alt={item.name} style={{
                      width: 72, height: 72, borderRadius: 'var(--c-r-md)', objectFit: 'cover', flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--c-text-main)', marginBottom: 4 }}>{item.name}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--c-primary)', fontWeight: 800 }}>
                        {item.price.toLocaleString('vi-VN')}đ / món
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        border: '1.5px solid var(--c-primary)', borderRadius: 'var(--c-r-md)', overflow: 'hidden',
                      }}>
                        <button
                          onClick={() => removeFromCart(item.menuItemId)}
                          style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: item.quantity === 1 ? 'var(--c-error)' : 'var(--c-primary)', fontSize: '1.1rem' }}
                        >
                          {item.quantity === 1 ? '🗑' : '−'}
                        </button>
                        <span style={{ width: 32, textAlign: 'center', fontWeight: 800, color: 'var(--c-primary)', fontFamily: 'var(--c-font)' }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.menuItemId, +1)}
                          style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--c-primary)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '1.1rem' }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Kitchen Notes */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border-light)' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--c-text-body)' }}>
                      Ghi chú cho bếp (tùy chọn)
                    </span>
                    <input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ít cay, không hành, làm nhanh..."
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--c-border)',
                        fontSize: '0.85rem',
                      }}
                    />
                  </label>
                </div>

                {tableSession && orderMode === 'DINE_IN' ? (
                  <div style={{ padding: '18px 20px' }}>
                    {tableSession.status === 'PAYMENT_REQUESTED' ? (
                      <button
                        className="c-btn c-btn-primary c-btn-lg c-btn-block"
                        disabled
                        style={{ opacity: 0.6, cursor: 'not-allowed', background: '#94a3b8' }}
                      >
                        ❄️ Hóa đơn đang đóng băng để thanh toán
                      </button>
                    ) : (
                      <button
                        id="cart-submit-dine-in-btn"
                        className="c-btn c-btn-primary c-btn-lg c-btn-block"
                        onClick={handlePlaceOrder}
                        disabled={isSubmitting || !canGoStep2}
                        style={{
                          boxShadow: '0 4px 14px rgba(234, 88, 12, 0.35)',
                          fontSize: '0.95rem',
                          fontWeight: 800,
                        }}
                      >
                        {isSubmitting ? (
                          'Đang gửi đơn...'
                        ) : tableSession.isVerified ? (
                          `🚀 Gửi bếp ngay (${totalItems} món • ${totalAmount.toLocaleString('vi-VN')}đ)`
                        ) : (
                          `📋 Gửi đơn — Chờ nhân viên duyệt (${totalItems} món • ${totalAmount.toLocaleString('vi-VN')}đ)`
                        )}
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: 20 }}>
                    <button
                      id="cart-step2-btn"
                      className="c-btn c-btn-primary c-btn-lg c-btn-block"
                      onClick={() => setStep(2)}
                      disabled={!canGoStep2}
                    >
                      Chọn hình thức đặt →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ─ STEP 2: Order Mode — Hick's Law: 3 big choices ─ */}
            {step === 2 && (
              <div className="c-animate-fade-up">
                <div style={{
                  background: 'var(--c-surface)', border: '1px solid var(--c-border)',
                  borderRadius: 'var(--c-r-lg)', padding: 24, boxShadow: 'var(--c-shadow-sm)', marginBottom: 20,
                }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 20px', color: 'var(--c-text-main)' }}>
                    Bạn muốn dùng bữa như thế nào?
                  </h2>
                  {/* 3 big buttons (Fitts's Law + Hick's Law) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {ORDER_MODES.map(({ mode, label, desc, emoji }) => {
                      const active = orderMode === mode;
                      return (
                        <button
                          key={mode}
                          id={`order-mode-${mode}`}
                          onClick={() => setOrderMode(mode)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 16,
                            padding: '18px 20px', borderRadius: 'var(--c-r-lg)',
                            border: `2px solid ${active ? 'var(--c-primary)' : 'var(--c-border)'}`,
                            background: active ? 'var(--c-primary-light)' : 'var(--c-surface-warm)',
                            cursor: 'pointer', textAlign: 'left', transition: 'all var(--c-t-fast)',
                            fontFamily: 'var(--c-font)',
                          }}
                        >
                          <span style={{ fontSize: '2rem', flexShrink: 0 }}>{emoji}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: active ? 'var(--c-primary)' : 'var(--c-text-main)', marginBottom: 2 }}>
                              {label}
                            </div>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--c-text-muted)' }}>
                              {desc}
                            </div>
                          </div>
                          {active && (
                            <div style={{
                              width: 24, height: 24, borderRadius: '50%',
                              background: 'var(--c-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                              <Check size={14} color="#fff" strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Payment method */}
                <div style={{
                  background: 'var(--c-surface)', border: '1px solid var(--c-border)',
                  borderRadius: 'var(--c-r-lg)', padding: 24, boxShadow: 'var(--c-shadow-sm)', marginBottom: 20,
                }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 16px', color: 'var(--c-text-main)' }}>
                    Phương thức thanh toán
                  </h2>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {PAY_METHODS.map(({ key, label, icon: Icon }) => {
                      const active = payMethod === key;
                      return (
                        <button
                          key={key}
                          id={`pay-method-${key}`}
                          onClick={() => setPayMethod(key)}
                          style={{
                            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                            padding: '14px 8px', borderRadius: 'var(--c-r-md)',
                            border: `2px solid ${active ? 'var(--c-primary)' : 'var(--c-border)'}`,
                            background: active ? 'var(--c-primary-light)' : 'var(--c-surface-warm)',
                            cursor: 'pointer', fontFamily: 'var(--c-font)', transition: 'all var(--c-t-fast)',
                          }}
                        >
                          <Icon size={20} color={active ? 'var(--c-primary)' : 'var(--c-text-muted)'} strokeWidth={1.8} />
                          <span style={{ fontSize: '0.75rem', fontWeight: active ? 700 : 500, color: active ? 'var(--c-primary)' : 'var(--c-text-body)' }}>
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  id="cart-step3-btn"
                  className="c-btn c-btn-primary c-btn-lg c-btn-block"
                  onClick={() => setStep(3)}
                  disabled={!canGoStep3}
                >
                  Nhập thông tin →
                </button>
              </div>
            )}

            {/* ─ STEP 3: Info Form — minimal fields ─ */}
            {step === 3 && (
              <div className="c-animate-fade-up" style={{
                background: 'var(--c-surface)', border: '1px solid var(--c-border)',
                borderRadius: 'var(--c-r-lg)', padding: 24, boxShadow: 'var(--c-shadow-sm)',
              }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 20px', color: 'var(--c-text-main)' }}>
                  Thông tin đặt hàng
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Conditional fields based on order mode */}
                  {orderMode === 'DINE_IN' && (
                    tableSession ? (
                      <div style={{
                        background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
                        border: '1.5px solid #6ee7b7',
                        borderRadius: 'var(--c-r-md)',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <span>🛡️ Phiên bàn bảo mật hợp lệ</span>
                          </div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#064e3b', marginTop: 2 }}>
                            {tableSession.tableNo}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#059669', marginTop: 2 }}>
                            Mã phiên: {tableSession.sessionToken.substring(0, 16)}... (Đã khóa)
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate('/client/scan?change=true')}
                          style={{
                            background: '#fff', border: '1px solid #10b981', color: '#047857',
                            padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          Đổi bàn
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        background: '#fff7ed',
                        border: '1.5px solid #fed7aa',
                        borderRadius: 'var(--c-r-md)',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '1.4rem' }}>📱</span>
                          <div>
                            <strong style={{ fontSize: '0.9rem', color: '#9a3412', display: 'block' }}>
                              Yêu cầu quét mã QR tại bàn để gọi món
                            </strong>
                            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#c2410c', lineHeight: 1.4 }}>
                              Để bảo mật, chống gọi nhầm bàn và đảm bảo bếp làm đúng bàn của quý khách, hình thức <strong>Tại bàn</strong> yêu cầu quét mã QR dán trên bàn ăn.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="c-btn c-btn-primary c-btn-sm"
                          onClick={() => navigate('/client/scan')}
                          style={{ alignSelf: 'flex-start' }}
                        >
                          📷 Quét QR nhận bàn ngay
                        </button>
                      </div>
                    )
                  )}

                  {orderMode === 'DELIVERY' && (
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--c-text-body)' }}>
                        Địa chỉ giao hàng <span style={{ color: 'var(--c-error)' }}>*</span>
                      </span>
                      <input
                        id="delivery-address-input"
                        className="form-control"
                        style={{ fontFamily: 'var(--c-font)', borderRadius: 'var(--c-r-md)', borderColor: 'var(--c-border)', padding: '12px 16px' }}
                        placeholder="Số nhà, tên đường, phường, quận..."
                        value={deliveryAddr}
                        onChange={(e) => setDeliveryAddr(e.target.value)}
                      />
                    </label>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--c-text-body)' }}>Tên khách hàng</span>
                      <input
                        id="customer-name-input"
                        className="form-control"
                        style={{ fontFamily: 'var(--c-font)', borderRadius: 'var(--c-r-md)', borderColor: 'var(--c-border)', padding: '12px 16px' }}
                        placeholder="Không bắt buộc"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--c-text-body)' }}>Số điện thoại</span>
                      <input
                        id="customer-phone-input"
                        className="form-control"
                        style={{ fontFamily: 'var(--c-font)', borderRadius: 'var(--c-r-md)', borderColor: 'var(--c-border)', padding: '12px 16px' }}
                        placeholder="Không bắt buộc"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </label>
                  </div>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--c-text-body)' }}>Ghi chú cho bếp</span>
                    <textarea
                      id="order-notes-input"
                      className="form-control"
                      style={{ fontFamily: 'var(--c-font)', borderRadius: 'var(--c-r-md)', borderColor: 'var(--c-border)', padding: '12px 16px', resize: 'none', minHeight: 80 }}
                      placeholder="Dị ứng thực phẩm, ít cay, không hành..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </label>

                  {/* Confirm button — Fitts's Law: full-width, 52px */}
                  <button
                    id="place-order-btn"
                    className="c-btn c-btn-primary c-btn-lg c-btn-block"
                    style={{ marginTop: 8 }}
                    onClick={handlePlaceOrder}
                    disabled={!canConfirm}
                  >
                    {orderMode === 'DINE_IN' && !tableSession
                      ? '⚠️ Vui lòng quét QR bàn trước khi đặt món'
                      : `✅ Xác nhận đặt hàng · ${totalAmount.toLocaleString('vi-VN')}đ`}
                  </button>
                  <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--c-text-muted)', margin: 0 }}>
                    Bằng cách đặt hàng, bạn đồng ý với điều khoản dịch vụ của OmniResto
                  </p>
                </div>
              </div>
            )}

            {/* ─ VietQR Live Payment Modal ─ */}
            {showPaymentModal && currentOrder && (
              <div style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
              }}>
                <div style={{
                  maxWidth: 440, width: '100%', background: '#fff',
                  borderRadius: 20, padding: 28, textAlign: 'center',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                }}>
                  {isPaidSuccess ? (
                    <div style={{ padding: '24px 0' }}>
                      <div style={{ fontSize: '4rem', marginBottom: 12 }}>🎉</div>
                      <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#059669', margin: '0 0 8px' }}>
                        Thanh toán thành công!
                      </h3>
                      <p style={{ fontSize: '0.875rem', color: '#666' }}>
                        Hệ thống đã nhận được tiền và tự động gửi đơn sang bếp để chế biến.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <span style={{ fontWeight: 800, color: '#111', fontSize: '1.1rem' }}>Thanh toán VietQR</span>
                        <span style={{ fontSize: '0.8rem', background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: 99, fontWeight: 700 }}>
                          ⏱️ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </span>
                      </div>

                      <div style={{
                        background: '#fafafa', border: '1px solid #eee', borderRadius: 14,
                        padding: 12, marginBottom: 16, display: 'inline-block',
                      }}>
                        <img
                          src={generateVietQRUrl(currentOrder.totalAmount, `OMNIRESTO ${currentOrder.orderNumber}`)}
                          alt="VietQR"
                          style={{ width: 220, height: 220, objectFit: 'contain', margin: '0 auto', display: 'block' }}
                        />
                      </div>

                      <div style={{ fontSize: '0.875rem', color: '#444', textAlign: 'left', background: '#f8fafc', padding: 12, borderRadius: 10, marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span>Số tiền:</span>
                          <strong style={{ color: '#ea580c', fontSize: '1rem' }}>{currentOrder.totalAmount.toLocaleString('vi-VN')}đ</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span>Nội dung CK:</span>
                          <strong style={{ color: '#111' }}>OMNIRESTO {currentOrder.orderNumber}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span>Ngân hàng:</span>
                          <span style={{ fontWeight: 600 }}>{PAYMENT_CONFIG.bankName}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span>Số tài khoản:</span>
                          <span style={{ fontWeight: 600 }}>{PAYMENT_CONFIG.accountNumber}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Chủ tài khoản:</span>
                          <span style={{ fontWeight: 600 }}>{PAYMENT_CONFIG.accountName}</span>
                        </div>
                      </div>

                      {/* Simulation button for demo testing */}
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch('/api/payments/webhook', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              orderId: currentOrder.id,
                              transactionId: 'TXN-' + Date.now(),
                              amount: currentOrder.totalAmount,
                            }),
                          }).catch(() => {});
                          setIsPaidSuccess(true);
                          setTimeout(() => {
                            setShowPaymentModal(false);
                            navigate(`/client/order/${currentOrder.id}`);
                          }, 1500);
                        }}
                        style={{
                          width: '100%', padding: '12px', borderRadius: 10,
                          background: '#059669', color: '#fff', border: 'none',
                          fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', marginBottom: 10,
                        }}
                      >
                        ⚡ Giả lập Chuyển khoản thành công (Webhook Ngân Hàng)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowPaymentModal(false);
                          navigate(`/client/order/${currentOrder.id}`);
                        }}
                        style={{
                          background: 'none', border: 'none', color: '#888',
                          fontSize: '0.8rem', cursor: 'pointer',
                        }}
                      >
                        Thanh toán sau tại quầy hoặc đóng
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* ── Order Summary Sidebar (Anchoring) ── */}
          <div style={{ display: 'none' }}
            ref={(el) => { if (el) el.style.display = window.innerWidth >= 768 ? 'block' : 'none'; }}>
            <OrderSummary />
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          #cart-summary-sidebar { display: block !important; }
        }
      `}</style>
    </div>
  );
};

export default ClientCart;
