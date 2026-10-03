import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Utensils, ShoppingBag, Bike, QrCode, Banknote, CreditCard, Ticket } from 'lucide-react';
import { useClientStore, selectTotalAmount } from '../../store/clientStore';
import { useAdminStore } from '../../../admin/store/adminStore';
import type { OrderMode, ClientPaymentMethod } from '../../../shared/types/client';

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
    selectedBranchId, selectedBranchName,
    placeOrder,
  } = useClientStore();
  const totalAmount = useClientStore(selectTotalAmount);
  const { vouchers } = useAdminStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableNo, setTableNo] = useState('');
  const [deliveryAddr, setDeliveryAddr] = useState('');
  const [notes, setNotes] = useState('');
  const [payMethod, setPayMethod] = useState<ClientPaymentMethod>('QR_CODE');
  const [voucherCode, setVoucherCode] = useState('');
  // 1. Thêm state lưu giữ voucher đã áp dụng thành công
  const [appliedVoucher, setAppliedVoucher] = useState<typeof vouchers[0] | null>(null);
  const [voucherMsg, setVoucherMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // 2. Tự động tính toán số tiền được giảm mỗi khi giỏ hàng hoặc voucher thay đổi
  const discountAmount = useMemo(() => {
    if (!appliedVoucher) return 0;
    let discount = 0;

    // Nếu là giảm theo phần trăm
    if (appliedVoucher.discountType === 'PERCENTAGE' || appliedVoucher.discountType === 'percentage') {
      discount = totalAmount * (appliedVoucher.discountValue / 100);
      // Kiểm tra giới hạn giảm tối đa (nếu có)
      if (appliedVoucher.maxDiscountAmount) {
        discount = Math.min(discount, appliedVoucher.maxDiscountAmount);
      }
    } else {
      // Nếu là giảm tiền mặt
      discount = appliedVoucher.discountValue;
    }

    // Đảm bảo không giảm âm tiền của đơn hàng
    return Math.min(discount, totalAmount);
  }, [appliedVoucher, totalAmount]);

  // Tổng tiền thanh toán cuối cùng
  const finalAmount = totalAmount - discountAmount;

  // 3. Hàm xử lý khi bấm nút "Áp dụng"
  const handleApplyVoucher = () => {
    const selected = activeVouchers.find(v => v.code === voucherCode);
    if (!selected) return;

    // Kiểm tra điều kiện đơn hàng tối thiểu
    if (totalAmount < selected.minOrderAmount) {
      setAppliedVoucher(null); // Gỡ bỏ voucher cũ nếu có
      setVoucherMsg({
        text: `Đơn hàng chưa đạt mức tối thiểu ${selected.minOrderAmount.toLocaleString('vi-VN')}đ để áp dụng mã này.`,
        type: 'error'
      });
      return;
    }

    setAppliedVoucher(selected);
    setVoucherMsg({
      text: `Áp dụng mã ${selected.code} thành công!`,
      type: 'success'
    });
  };
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const isEmpty = cart.length === 0;
  const activeVouchers = useMemo(() => {
    return vouchers.filter(v => v.status === 'ACTIVE' || v.status === 'active');
  }, [vouchers]);

  const ORDER_MODES: Array<{ mode: OrderMode; icon: typeof Utensils; label: string; desc: string; emoji: string }> = [
    { mode: 'DINE_IN', icon: Utensils, label: 'Tại bàn', desc: 'Dùng bữa ngay tại nhà hàng', emoji: '🍽️' },
    { mode: 'TAKEAWAY', icon: ShoppingBag, label: 'Mang về', desc: 'Đóng gói mang đi, nhận tại quầy', emoji: '📦' },
    { mode: 'DELIVERY', icon: Bike, label: 'Giao hàng', desc: 'Giao đến tận địa chỉ của bạn', emoji: '🚴' },
  ];

  const PAY_METHODS: Array<{ key: ClientPaymentMethod; label: string; icon: typeof QrCode }> = [
    { key: 'QR_CODE', label: 'Quét QR', icon: QrCode },
    { key: 'CASH', label: 'Tiền mặt', icon: Banknote },
    { key: 'CARD', label: 'Thẻ ngân hàng', icon: CreditCard },
  ];

  const handlePlaceOrder = () => {
    const placed = placeOrder({
      branchId: selectedBranchId || 'br-01',
      branchName: selectedBranchName || 'OmniResto',
      orderMode,
      tableNo: orderMode === 'DINE_IN' ? tableNo : undefined,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      deliveryAddress: orderMode === 'DELIVERY' ? deliveryAddr : undefined,
      notes: notes || undefined,
      paymentMethod: payMethod,
    });
    navigate(`/client/order/${placed.id}`);
  };

  const canGoStep2 = cart.length > 0;
  const canGoStep3 = orderMode !== undefined;
  const canConfirm = orderMode !== 'DINE_IN' || tableNo.trim() !== '';

  /* Step progress indicator */
  const StepIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
      {(['Giỏ hàng', 'Hình thức', 'Thông tin'] as const).map((label, i) => {
        const stepNum = (i + 1) as 1 | 2 | 3;
        const done = step > stepNum;
        const active = step === stepNum;
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

      {/* 1. Danh sách món ăn */}
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

      {/* 2. Tạm tính (Subtotal) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: '0.875rem', color: 'var(--c-text-body)' }}>
          Tạm tính
        </span>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--c-text-main)' }}>
          {totalAmount.toLocaleString('vi-VN')}đ
        </span>
      </div>

      {/* 3. Khuyến mãi (Chỉ hiển thị khi đã áp dụng thành công) */}
      {appliedVoucher && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--c-text-body)' }}>
            Khuyến mãi ({appliedVoucher.code})
          </span>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--c-success)' }}>
            -{discountAmount.toLocaleString('vi-VN')}đ
          </span>
        </div>
      )}

      {/* 4. Tổng cộng thanh toán */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--c-text-body)' }}>
          Tổng cộng
        </span>
        <span style={{ fontSize: '1.125rem', fontWeight: 900, color: 'var(--c-primary)' }}>
          {finalAmount.toLocaleString('vi-VN')}đ
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

                {/* ── KHỐI VOUCHER MỚI THÊM ── */}
                <div style={{
                  background: 'var(--c-surface)', border: '1px solid var(--c-border)',
                  borderRadius: 'var(--c-r-lg)', padding: 24, boxShadow: 'var(--c-shadow-sm)', marginBottom: 20,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Ticket size={20} color="var(--c-primary)" />
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--c-text-main)' }}>
                      Mã ưu đãi / Khuyến mãi
                    </h2>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <select
                        className="form-control"
                        value={voucherCode}
                        onChange={(e) => {
                          setVoucherCode(e.target.value);
                          setVoucherMsg(null); // Ẩn thông báo khi khách hàng đổi mã khác
                        }}
                        style={{
                          width: '100%', fontFamily: 'var(--c-font)', borderRadius: 'var(--c-r-md)',
                          borderColor: 'var(--c-border)', padding: '12px 16px', appearance: 'none',
                          background: 'var(--c-surface-warm)', cursor: 'pointer', outline: 'none',
                          fontSize: '0.875rem', color: voucherCode ? 'var(--c-text-main)' : 'var(--c-text-muted)'
                        }}
                      >
                        <option value="">Chọn Voucher</option>
                        {activeVouchers.map(v => (
                          <option key={v.id} value={v.code}>
                            🎁 {v.code} - {v.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      className="c-btn c-btn-primary"
                      style={{ padding: '0 24px', borderRadius: 'var(--c-r-md)', fontWeight: 700 }}
                      disabled={!voucherCode}
                      onClick={handleApplyVoucher}
                    >
                      Áp dụng
                    </button>
                  </div>

                  {/* Hiển thị thông báo (Inline Message) thay cho alert() */}
                  {voucherMsg && (
                    <div className="c-animate-fade-up" style={{
                      marginTop: 12,
                      padding: '10px 14px',
                      borderRadius: 'var(--c-r-md)',
                      background: voucherMsg.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: voucherMsg.type === 'success' ? 'var(--c-success, #22c55e)' : 'var(--c-error, #ef4444)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      {voucherMsg.type === 'success' ? '✅' : '❌'} {voucherMsg.text}
                    </div>
                  )}
                </div>
                {/* ── KẾT THÚC KHỐI VOUCHER ── */}

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
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--c-text-body)' }}>
                        Số bàn <span style={{ color: 'var(--c-error)' }}>*</span>
                      </span>
                      <input
                        id="table-no-input"
                        className="form-control"
                        style={{ fontFamily: 'var(--c-font)', borderRadius: 'var(--c-r-md)', borderColor: 'var(--c-border)', padding: '12px 16px' }}
                        placeholder="VD: Bàn 05"
                        value={tableNo}
                        onChange={(e) => setTableNo(e.target.value)}
                      />
                    </label>
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
                    ✅ Xác nhận đặt hàng · {finalAmount.toLocaleString('vi-VN')}đ
                  </button>
                  <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--c-text-muted)', margin: 0 }}>
                    Bằng cách đặt hàng, bạn đồng ý với điều khoản dịch vụ của OmniResto
                  </p>
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
