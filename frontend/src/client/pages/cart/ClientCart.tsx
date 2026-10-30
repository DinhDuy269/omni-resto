import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Plus, Minus, QrCode, Banknote, CheckCircle, AlertCircle, ExternalLink, ShieldCheck, Ticket } from 'lucide-react';
import { useClientStore, selectTotalAmount } from '../../store/clientStore';
import { voucherApi } from '../../../shared/api/voucherApi';
import type { VoucherInfo } from '../../../shared/types';
import type { OrderMode, ClientPaymentMethod, VnPayPaymentInfo } from '../../../shared/types/client';
import { VNPAY_SANDBOX_CONFIG } from '../../../shared/types/client';
import { PAYMENT_CONFIG, generateVietQRUrl } from '../../../shared/config/paymentConfig';
import { createVnPayPayment, processVnPayDirectPayment } from '../../../shared/api/vnpayApi';
import { checkIsItemAvailableNow } from '../../utils/mealPeriodUtils';

export const ClientCart: React.FC = () => {
  const navigate = useNavigate();
  const {
    cart,
    updateQuantity,
    removeFromCart,
    order_mode: orderMode,
    setOrderMode,
    placeOrder,
    table_session: tableSession,
    refreshTableSession,
  } = useClientStore();

  const totalAmount = useClientStore(selectTotalAmount);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const isEmpty = cart.length === 0;

  const hasExpiredItems = useMemo(() => {
    return cart.some((it) => !checkIsItemAvailableNow(it));
  }, [cart]);

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddr, setDeliveryAddr] = useState('');
  const [notes, setNotes] = useState('');
  const [payMethod, setPayMethod] = useState<ClientPaymentMethod>('vnpay_qr');
  const [takeawayAtTable, setTakeawayAtTable] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Voucher states
  const [availableVouchers, setAvailableVouchers] = useState<VoucherInfo[]>([]);
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher] = useState<VoucherInfo | null>(null);
  const [appliedVoucherPreview, setAppliedVoucherPreview] = useState<import('../../../shared/types').VoucherPreviewResponse | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);
  const [voucherMsg, setVoucherMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Tải danh sách voucher đang có hiệu lực từ backend API
  useEffect(() => {
    let isMounted = true;
    voucherApi.getAvailableVouchers()
      .then((data) => {
        if (isMounted) setAvailableVouchers(data || []);
      })
      .catch((err) => {
        console.warn('Không tải được danh sách voucher gợi ý:', err);
      });
    return () => { isMounted = false; };
  }, []);

  const discountAmount = useMemo(() => {
    if (appliedVoucherPreview) {
      return Number(appliedVoucherPreview.discount_amount) || 0;
    }
    if (!appliedVoucher) return 0;
    // Fallback nếu có voucher cũ
    if (totalAmount < appliedVoucher.min_order_amount) {
      return 0;
    }
    let discount = 0;
    const isPercentage = appliedVoucher.discount_type === 'percentage';
    if (isPercentage) {
      discount = totalAmount * (Number(appliedVoucher.discount_value) / 100);
      if (appliedVoucher.max_discount_amount) {
        discount = Math.min(discount, Number(appliedVoucher.max_discount_amount));
      }
    } else {
      discount = Number(appliedVoucher.discount_value) || 0;
    }
    return Math.min(discount, totalAmount);
  }, [appliedVoucherPreview, appliedVoucher, totalAmount]);

  const finalAmount = Math.max(0, totalAmount - discountAmount);

  // Áp dụng voucher thông qua xác thực Server-side bảo mật cao (Bắt buộc đăng nhập tài khoản)
  const handleApplyVoucher = async () => {
    const code = voucherCode.trim().toUpperCase();
    if (!code) {
      setVoucherMsg({ text: 'Vui lòng nhập mã khuyến mãi.', type: 'error' });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setVoucherMsg({
        text: 'Chỉ khách hàng có tài khoản thành viên mới được áp dụng voucher. Vui lòng đăng nhập!',
        type: 'error',
      });
      setShowLoginPrompt(true);
      return;
    }

    setIsValidatingVoucher(true);
    setVoucherMsg(null);
    setShowLoginPrompt(false);

    try {
      const items = cart.map((it) => ({
        menu_item_id: it.id || it.menu_item_id || '',
        quantity: it.quantity,
      }));

      const preview = await voucherApi.previewVoucher({ code, items });
      setAppliedVoucherPreview(preview);
      setVoucherMsg({
        text: preview.message || `Áp dụng mã [${preview.code}] thành công! Tiết kiệm ${Number(preview.discount_amount).toLocaleString('vi-VN')}đ`,
        type: 'success',
      });
    } catch (err: any) {
      setAppliedVoucherPreview(null);
      const msg = err.error_description || err.message || 'Mã khuyến mãi không hợp lệ hoặc không đủ điều kiện.';
      setVoucherMsg({
        text: msg,
        type: 'error',
      });
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  // Payment modal state (VNPAY-QR & VietQR)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [vnpayInfo, setVnPayInfo] = useState<VnPayPaymentInfo | null>(null);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900);

  // VNPAY Sandbox card inputs (set sẵn mặc định)
  const [vnpayCardNumber, setVnPayCardNumber] = useState(VNPAY_SANDBOX_CONFIG.card_number);
  const [vnpayCardHolder, setVnPayCardHolder] = useState(VNPAY_SANDBOX_CONFIG.card_holder);
  const [vnpayPaymentDate, setVnPayPaymentDate] = useState(VNPAY_SANDBOX_CONFIG.payment_date);
  const [vnpayOtp, setVnPayOtp] = useState(VNPAY_SANDBOX_CONFIG.otp);
  const [isPayingVnPay, setIsPayingVnPay] = useState(false);

  // Auto-sync session state
  useEffect(() => {
    if (tableSession?.session_token) {
      refreshTableSession();
      if (!orderMode) setOrderMode('dine_in');
    } else if (orderMode === 'dine_in') {
      setOrderMode('takeaway');
    }
  }, [tableSession]);

  // Handle placing order
  const handlePlaceOrder = async () => {
    if (isSubmitting || isEmpty) return;

    if (hasExpiredItems) {
      alert('⚠️ Giỏ hàng chứa món đã hết giờ phục vụ. Quý khách vui lòng xóa món đó khỏi danh sách để tiếp tục gửi đơn!');
      return;
    }

    // Validation
    if (orderMode === 'delivery') {
      if (!deliveryAddr.trim()) {
        alert('Vui lòng nhập địa chỉ nhận hàng!');
        return;
      }
      if (!customerPhone.trim()) {
        alert('Vui lòng nhập số điện thoại để shipper liên hệ!');
        return;
      }
    }

    if (orderMode === 'dine_in' && !tableSession) {
      navigate('/client/scan');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalCustomerName = customerName.trim();
      if (orderMode === 'delivery') {
        finalCustomerName = customerName.trim()
          ? `${customerName.trim()} (SĐT: ${customerPhone.trim()}, Đ/c: ${deliveryAddr.trim()})`
          : `SĐT: ${customerPhone.trim()} - Đ/c: ${deliveryAddr.trim()}`;
      } else if (orderMode === 'takeaway') {
        const atTableNote = tableSession && takeawayAtTable ? ` - Nhận tại ${tableSession.table_no}` : '';
        finalCustomerName = customerName.trim()
          ? `${customerName.trim()} (${customerPhone.trim() || 'Mang về'}${atTableNote})`
          : `Khách mang về (${customerPhone.trim() || 'Tại quầy'}${atTableNote})`;
      }

      const placed = await placeOrder({
        order_mode: orderMode,
        table_no: orderMode === 'dine_in'
          ? (tableSession?.table_no || undefined)
          : (orderMode === 'takeaway' && tableSession ? tableSession.table_no : undefined),
        session_token: orderMode === 'dine_in' ? tableSession?.session_token : undefined,
        customer_name: finalCustomerName || undefined,
        customer_phone: customerPhone.trim() || undefined,
        delivery_address: orderMode === 'delivery' ? deliveryAddr.trim() : undefined,
        notes: (appliedVoucherPreview ? `[Voucher ${appliedVoucherPreview.code} - Giảm ${discountAmount.toLocaleString('vi-VN')}đ] ${notes.trim()}`.trim() : notes.trim()) || undefined,
        payment_method: orderMode === 'dine_in' && tableSession?.mode !== 'pay_first' ? 'cash' : payMethod,
        voucher_code: appliedVoucherPreview ? appliedVoucherPreview.code : (appliedVoucher ? appliedVoucher.code : undefined),
      });

      if (!placed) return;

      // Dine-in pay after -> go straight to orders page
      if (orderMode === 'dine_in' && tableSession?.mode !== 'pay_first') {
        navigate('/client/orders');
      } else if (payMethod === 'vnpay_qr') {
        setCurrentOrder(placed);
        setShowPaymentModal(true);
        setTimeLeft(900);
        try {
          const vnp = await createVnPayPayment(placed.id);
          setVnPayInfo(vnp);
        } catch (err: any) {
          console.warn('Lỗi tạo URL VNPAY:', err);
        }
      } else if (payMethod === 'qr_code' || (orderMode === 'dine_in' && tableSession?.mode === 'pay_first')) {
        setCurrentOrder(placed);
        setShowPaymentModal(true);
        setTimeLeft(600);
      } else {
        navigate('/client/orders');
      }
    } catch (err: any) {
      alert(err.message || 'Không thể gửi đơn. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xử lý xác nhận thanh toán VNPAY Sandbox trực tiếp (Số thẻ, tên chủ thẻ, ngày, OTP set sẵn)
  const handleConfirmVnPay = async () => {
    if (!currentOrder || isPayingVnPay) return;
    setIsPayingVnPay(true);
    try {
      await processVnPayDirectPayment({
        order_id: currentOrder.id,
        card_number: vnpayCardNumber,
        card_holder: vnpayCardHolder,
        payment_date: vnpayPaymentDate,
        otp: vnpayOtp,
      });
      setIsPaidSuccess(true);
      setTimeout(() => {
        setShowPaymentModal(false);
        navigate('/client/orders');
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Thanh toán VNPAY thất bại. Vui lòng thử lại!');
    } finally {
      setIsPayingVnPay(false);
    }
  };

  // Payment polling for QR Code (VNPAY-QR & VietQR)
  useEffect(() => {
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
            const isPaid = Boolean(data.isPaid || data.is_paid);
            if (isPaid) {
              setIsPaidSuccess(true);
              setTimeout(() => {
                setShowPaymentModal(false);
                navigate(`/client/orders`);
              }, 1800);
            }
          }
        } catch { }
      }, 2000);
    }

    return () => {
      clearInterval(timer);
      clearInterval(poller);
    };
  }, [showPaymentModal, currentOrder, isPaidSuccess]);

  // Empty state
  if (isEmpty) {
    return (
      <div style={{
        fontFamily: 'var(--c-font)', minHeight: '65vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 16, padding: '40px 20px', textAlign: 'center',
      }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          background: 'var(--c-surface-warm, #f8fafc)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.5rem', border: '1px solid var(--c-border-light, #e2e8f0)',
        }}>
          🛒
        </div>
        <div>
          <h2 style={{ color: 'var(--c-text-main)', margin: '0 0 6px', fontSize: '1.25rem', fontWeight: 800 }}>
            Giỏ hàng của bạn đang trống
          </h2>
          <p style={{ color: 'var(--c-text-muted)', margin: 0, fontSize: '0.9rem' }}>
            Hãy chọn các món ăn thơm ngon trong thực đơn nhé!
          </p>
        </div>
        <button
          className="c-btn c-btn-primary"
          style={{ padding: '12px 28px', fontSize: '0.95rem', fontWeight: 700, marginTop: 8 }}
          onClick={() => navigate('/client/menu')}
        >
          🍜 Xem thực đơn ngay
        </button>
      </div>
    );
  }

  const isDineIn = orderMode === 'dine_in';
  const isTakeaway = orderMode === 'takeaway';
  const isDelivery = orderMode === 'delivery';

  return (
    <div style={{
      fontFamily: 'var(--c-font)',
      background: 'var(--c-bg, #faf8f5)',
      minHeight: '100%',
      padding: '24px 16px 80px',
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* ── Top Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 20,
        }}>
          <button
            onClick={() => navigate('/client/menu')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: 'var(--c-text-muted)', fontSize: '0.875rem', fontWeight: 600,
              padding: 0,
            }}
          >
            <ArrowLeft size={18} />
            <span>Thêm món khác</span>
          </button>

          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--c-text-muted)' }}>
            {totalItems} món trong giỏ
          </span>
        </div>

        {/* ── Main Two-Column Layout ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 340px',
          gap: 20,
          alignItems: 'start',
        }}>

          {/* ──── LEFT COLUMN: Dish Items & Order Form ──── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* 1. Món trong giỏ */}
            <div style={{
              background: '#ffffff',
              borderRadius: 16,
              border: '1px solid var(--c-border-light, #e2e8f0)',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}>
              <div style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--c-border-light, #f1f5f9)',
                fontWeight: 800,
                fontSize: '0.95rem',
                color: 'var(--c-text-main)',
              }}>
                Món đã chọn ({totalItems})
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {cart.map((item, idx) => {
                  const itemKey = item.id || item.menu_item_id || '';
                  const isAvailable = checkIsItemAvailableNow(item);
                  return (
                    <div
                      key={itemKey || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '14px 18px',
                        borderBottom: idx < cart.length - 1 ? '1px solid var(--c-border-light, #f1f5f9)' : 'none',
                        background: !isAvailable ? '#fff1f2' : 'transparent',
                      }}
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        style={{
                          width: 58, height: 58, borderRadius: 10,
                          objectFit: 'cover', flexShrink: 0,
                          border: '1px solid #f1f5f9',
                          filter: !isAvailable ? 'grayscale(80%)' : 'none',
                        }}
                      />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 700, fontSize: '0.9rem',
                          color: 'var(--c-text-main)', marginBottom: 2,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {item.name}
                        </div>
                        {item.options && item.options.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '2px 0 4px' }}>
                            {item.options.map((opt, optIdx) => {
                              const isSize = opt.option_type?.toLowerCase() === 'size';
                              return (
                                <span
                                  key={optIdx}
                                  style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    background: isSize ? '#e0e7ff' : '#ecfdf5',
                                    color: isSize ? '#3730a3' : '#065f46',
                                    border: isSize ? '1px solid #c7d2fe' : '1px solid #a7f3d0',
                                  }}
                                >
                                  {isSize ? '📏' : '➕'} {opt.option_name}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        {item.notes && (
                          <div style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 600, marginBottom: 2 }}>
                            📝 {item.notes}
                          </div>
                        )}
                        {!isAvailable && (
                          <div style={{
                            fontSize: '0.725rem',
                            color: '#b91c1c',
                            background: '#fee2e2',
                            border: '1px solid #fca5a5',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            marginBottom: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 600,
                            width: 'fit-content',
                          }}>
                            ⚠️ Đã hết giờ phục vụ
                          </div>
                        )}
                        <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--c-primary)' }}>
                          {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)' }}>
                          {item.price.toLocaleString('vi-VN')}đ / phần
                        </div>
                      </div>

                      {/* Stepper (+ / -) */}
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        border: '1.5px solid var(--c-primary)', borderRadius: 8,
                        overflow: 'hidden', flexShrink: 0,
                      }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (item.quantity === 1) {
                              removeFromCart(itemKey);
                            } else {
                              updateQuantity(itemKey, -1);
                            }
                          }}
                          style={{
                            width: 30, height: 30, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            background: 'transparent', border: 'none',
                            cursor: 'pointer', color: 'var(--c-primary)',
                          }}
                        >
                          {item.quantity === 1 ? <Trash2 size={13} color="var(--c-error)" /> : <Minus size={13} strokeWidth={2.5} />}
                        </button>

                        <span style={{
                          width: 28, textAlign: 'center', fontSize: '0.85rem',
                          fontWeight: 800, color: 'var(--c-primary)',
                        }}>
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() => updateQuantity(itemKey, 1)}
                          style={{
                            width: 30, height: 30, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            background: 'var(--c-primary)', border: 'none',
                            cursor: 'pointer', color: '#fff',
                          }}
                        >
                          <Plus size={13} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Kitchen note */}
              <div style={{ padding: '12px 18px', background: '#fafaf9', borderTop: '1px solid #f1f5f9' }}>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi chú cho bếp (VD: ít cay, không hành, làm nhanh...)"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--c-border, #e2e8f0)',
                    background: '#ffffff',
                    fontSize: '0.825rem',
                    fontFamily: 'var(--c-font)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* 2. Hình thức & Thông tin nhận món (CLEAR & UNIFIED) */}
            <div style={{
              background: '#ffffff',
              borderRadius: 16,
              border: '1px solid var(--c-border-light, #e2e8f0)',
              padding: '18px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}>
              <div style={{
                fontSize: '0.8rem', fontWeight: 800,
                color: 'var(--c-text-muted)', textTransform: 'uppercase',
                letterSpacing: '0.5px', marginBottom: 10,
              }}>
                Hình thức phục vụ
              </div>

              {/* Segmented Control */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 6,
                background: '#f1f5f9',
                padding: 4,
                borderRadius: 10,
                marginBottom: 16,
              }}>
                {[
                  {
                    key: 'dine_in' as OrderMode,
                    label: tableSession ? `Tại bàn (${tableSession.table_no})` : 'Tại bàn',
                    icon: '🍽️',
                  },
                  { key: 'takeaway' as OrderMode, label: 'Mang về', icon: '📦' },
                  { key: 'delivery' as OrderMode, label: 'Giao hàng', icon: '🛵' },
                ].map((tab) => {
                  const active = orderMode === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setOrderMode(tab.key)}
                      style={{
                        padding: '9px 6px',
                        borderRadius: 8,
                        border: 'none',
                        background: active ? '#ffffff' : 'transparent',
                        color: active ? 'var(--c-primary)' : '#475569',
                        fontWeight: active ? 800 : 600,
                        fontSize: '0.825rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        boxShadow: active ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{tab.icon}</span>
                      <span style={{ whiteSpace: 'nowrap' }}>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Details based on mode */}
              {isDineIn && (
                tableSession ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: 10,
                    background: '#f0fdf4', border: '1px solid #bbf7d0',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.2rem' }}>📍</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.875rem', color: '#166534' }}>
                          Phục vụ tại Bàn {tableSession.table_no}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#15803d' }}>
                          {tableSession.is_verified
                            ? 'Món sẽ được gửi thẳng vào quầy bếp để chế biến'
                            : 'Đợt 1 · Nhân viên sẽ xác nhận tại bàn khi gửi đơn'}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: 10,
                    background: '#fff7ed', border: '1px solid #fed7aa', gap: 10,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertCircle size={18} color="#ea580c" />
                      <span style={{ fontSize: '0.825rem', color: '#9a3412', fontWeight: 600 }}>
                        Chưa nhận diện bàn ngồi. Quý khách vui lòng quét mã QR tại bàn.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/client/scan')}
                      style={{
                        padding: '6px 12px', borderRadius: 8,
                        background: '#ea580c', color: '#fff', border: 'none',
                        fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                        whiteSpace: 'nowrap', flexShrink: 0,
                      }}
                    >
                      Quét QR bàn
                    </button>
                  </div>
                )
              )}

              {isTakeaway && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                        Tên khách hàng
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="VD: Anh Nam"
                        style={{
                          width: '100%', padding: '9px 12px', borderRadius: 8,
                          border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                        Số điện thoại
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Để nhận thông báo khi món xong"
                        style={{
                          width: '100%', padding: '9px 12px', borderRadius: 8,
                          border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  {tableSession && (
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 12px', borderRadius: 8,
                      background: '#fff7ed', border: '1px solid #fed7aa',
                      fontSize: '0.8rem', color: '#9a3412', fontWeight: 600, cursor: 'pointer',
                    }}>
                      <input
                        type="checkbox"
                        checked={takeawayAtTable}
                        onChange={(e) => setTakeawayAtTable(e.target.checked)}
                        style={{ accentColor: '#ea580c' }}
                      />
                      <span>Đóng gói xong mang ra Bàn <strong>{tableSession.table_no}</strong> giúp tôi</span>
                    </label>
                  )}
                </div>
              )}

              {isDelivery && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      Địa chỉ nhận hàng <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={deliveryAddr}
                      onChange={(e) => setDeliveryAddr(e.target.value)}
                      placeholder="Số nhà, tên đường, phường, quận..."
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: 8,
                        border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                        Số điện thoại <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Để shipper liên hệ giao"
                        style={{
                          width: '100%', padding: '9px 12px', borderRadius: 8,
                          border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                        Tên người nhận
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Không bắt buộc"
                        style={{
                          width: '100%', padding: '9px 12px', borderRadius: 8,
                          border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2.5. Voucher & Mã Khuyến Mãi */}
            <div style={{
              background: '#ffffff',
              borderRadius: 16,
              border: '1px solid var(--c-border-light, #e2e8f0)',
              padding: '18px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: '0.8rem', fontWeight: 800,
                color: 'var(--c-text-muted)', textTransform: 'uppercase',
                letterSpacing: '0.5px', marginBottom: 12,
              }}>
                <Ticket size={16} color="var(--c-primary)" />
                <span>Mã ưu đãi / Khuyến mãi</span>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    placeholder="Nhập mã voucher..."
                    className="form-control"
                    value={voucherCode}
                    onChange={(e) => {
                      setVoucherCode(e.target.value.toUpperCase());
                      setVoucherMsg(null);
                    }}
                    style={{
                      width: '100%',
                      fontFamily: 'inherit',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      padding: '10px 14px',
                      background: '#f8fafc',
                      outline: 'none',
                      fontSize: '0.85rem',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <button
                  type="button"
                  className="c-btn c-btn-primary"
                  style={{ padding: '0 20px', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem' }}
                  disabled={!voucherCode.trim() || isValidatingVoucher}
                  onClick={handleApplyVoucher}
                >
                  {isValidatingVoucher ? 'Đang kiểm tra...' : 'Áp dụng'}
                </button>
              </div>

              {/* Danh sách các mã có sẵn để bấm chọn nhanh */}
              {availableVouchers.length > 0 && (
                <div style={{
                  marginTop: 12,
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                  maxHeight: '112px',
                  overflowY: 'auto',
                  paddingRight: '4px',
                  alignContent: 'flex-start',
                }}>
                  {availableVouchers.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => {
                        setVoucherCode(v.code);
                        setVoucherMsg(null);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 99,
                        border: voucherCode === v.code ? '1.5px solid var(--c-primary)' : '1px solid #e2e8f0',
                        background: voucherCode === v.code ? '#fff7ed' : '#f8fafc',
                        color: voucherCode === v.code ? 'var(--c-primary)' : '#475569',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        fontWeight: 600,
                        transition: 'all 0.2s',
                        height: 'fit-content',
                      }}
                      title={`${v.name} (Đơn tối thiểu: ${v.min_order_amount.toLocaleString('vi-VN')}đ)`}
                    >
                      🎁 {v.code}
                    </div>
                  ))}
                </div>
              )}

              {voucherMsg && (
                <div style={{
                  marginTop: 10,
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: voucherMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${voucherMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                  color: voucherMsg.type === 'success' ? '#15803d' : '#b91c1c',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {voucherMsg.type === 'success' ? '✅' : '❌'} {voucherMsg.text}
                  </div>
                  {showLoginPrompt && (
                    <button
                      type="button"
                   onClick={() => navigate('/auth?redirect=/client/cart')}
                      style={{
                        alignSelf: 'flex-start',
                        padding: '6px 14px',
                        background: '#dc2626',
                        color: '#ffffff',
                        borderRadius: 6,
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        marginTop: 2,
                        transition: 'background 0.2s',
                      }}
                    >
                      Đăng nhập tài khoản thành viên ngay &rarr;
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 3. Phương thức thanh toán (Gọn gàng) */}
            <div style={{
              background: '#ffffff',
              borderRadius: 16,
              border: '1px solid var(--c-border-light, #e2e8f0)',
              padding: '18px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}>
              <div style={{
                fontSize: '0.8rem', fontWeight: 800,
                color: 'var(--c-text-muted)', textTransform: 'uppercase',
                letterSpacing: '0.5px', marginBottom: 10,
              }}>
                Phương thức thanh toán
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                {[
                  {
                    key: 'vnpay_qr' as ClientPaymentMethod,
                    label: 'VNPAY-QR (Sandbox)',
                    sublabel: 'Quét mã QR qua app Ngân hàng / VNPAY Sandbox',
                    badge: '⚡ Khuyên dùng',
                    badgeColor: '#0284c7',
                    badgeBg: '#e0f2fe',
                    icon: QrCode,
                  },
                  {
                    key: 'qr_code' as ClientPaymentMethod,
                    label: 'Chuyển khoản VietQR',
                    sublabel: 'Chuyển khoản qua số tài khoản nhà hàng',
                    badge: null,
                    badgeColor: '',
                    badgeBg: '',
                    icon: QrCode,
                  },
                  {
                    key: 'cash' as ClientPaymentMethod,
                    label: isDineIn ? 'Thanh toán tại bàn / Quầy' : 'Tiền mặt khi nhận',
                    sublabel: isDineIn ? 'Nhân viên thu tiền sau' : 'Thanh toán trực tiếp cho shipper',
                    badge: null,
                    badgeColor: '',
                    badgeBg: '',
                    icon: Banknote,
                  },
                ].map((m) => {
                  const active = payMethod === m.key;
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setPayMethod(m.key)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        border: `1.5px solid ${active ? 'var(--c-primary)' : '#e2e8f0'}`,
                        background: active ? '#fff7ed' : '#ffffff',
                        color: active ? 'var(--c-primary)' : '#334155',
                        fontWeight: active ? 800 : 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        transition: 'all 0.15s ease',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 8,
                          background: active ? '#fed7aa' : '#f1f5f9',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Icon size={20} color={active ? 'var(--c-primary)' : '#64748b'} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 800 }}>{m.label}</span>
                            {m.badge && (
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                background: m.badgeBg,
                                color: m.badgeColor,
                                padding: '1px 6px',
                                borderRadius: 4,
                              }}>
                                {m.badge}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginTop: 2 }}>
                            {m.sublabel}
                          </div>
                        </div>
                      </div>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%',
                        border: `2px solid ${active ? 'var(--c-primary)' : '#cbd5e1'}`,
                        background: active ? 'var(--c-primary)' : '#ffffff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff' }} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* ──── RIGHT COLUMN: Order Summary & Place Order CTA ──── */}
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid var(--c-border-light, #e2e8f0)',
            padding: '20px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            position: 'sticky',
            top: 'calc(var(--c-header-h, 64px) + 20px)',
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--c-text-main)', margin: '0 0 16px' }}>
              Chi tiết thanh toán
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Tạm tính ({totalItems} món)</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{totalAmount.toLocaleString('vi-VN')}đ</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Phí dịch vụ</span>
                <span style={{ fontWeight: 700, color: '#16a34a' }}>Miễn phí</span>
              </div>

              {(appliedVoucherPreview || appliedVoucher) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                  <span>Khuyến mãi ({appliedVoucherPreview?.code || appliedVoucher?.code})</span>
                  <span style={{ fontWeight: 700 }}>-{discountAmount.toLocaleString('vi-VN')}đ</span>
                </div>
              )}

              {isDelivery && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Phí giao hàng</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>Theo km thực tế</span>
                </div>
              )}

              <div style={{ height: 1, background: '#e2e8f0', margin: '6px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Tổng cộng</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--c-primary)' }}>
                  {finalAmount.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>

            {/* Main Action Button */}
            {hasExpiredItems && (
              <div style={{
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                color: '#991b1b',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: '0.8rem',
                fontWeight: 600,
                marginTop: 16,
                lineHeight: 1.4,
              }}>
                ⚠️ Giỏ hàng chứa món đã hết giờ phục vụ. Quý khách vui lòng xóa món đó khỏi danh sách để tiếp tục gửi đơn!
              </div>
            )}

            <button
              id="place-order-main-btn"
              onClick={handlePlaceOrder}
              disabled={isSubmitting || (isDineIn && !tableSession) || hasExpiredItems}
              className="c-btn c-btn-primary c-btn-lg c-btn-block"
              style={{
                marginTop: hasExpiredItems ? 10 : 20,
                padding: '14px',
                fontSize: '0.95rem',
                fontWeight: 800,
                boxShadow: hasExpiredItems ? 'none' : '0 4px 14px rgba(234, 88, 12, 0.3)',
                background: hasExpiredItems ? '#cbd5e1' : undefined,
                cursor: hasExpiredItems ? 'not-allowed' : 'pointer',
              }}
            >
              {hasExpiredItems
                ? '⚠️ Vui lòng xóa món hết giờ phục vụ'
                : isSubmitting
                  ? 'Đang gửi đơn...'
                  : isDineIn
                    ? (tableSession ? `🚀 Gửi bếp ngay • ${finalAmount.toLocaleString('vi-VN')}đ` : '📷 Quét QR bàn để đặt món')
                    : isTakeaway
                      ? `📦 Đặt món mang về • ${finalAmount.toLocaleString('vi-VN')}đ`
                      : `🛵 Đặt giao hàng • ${finalAmount.toLocaleString('vi-VN')}đ`}
            </button>

            <div style={{ marginTop: 12, textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
              {isDineIn
                ? 'Món gọi sẽ được chế biến và phục vụ tại bàn'
                : isTakeaway
                  ? 'Được đóng hộp sạch sẽ, giữ nhiệt chu đáo'
                  : 'Shipper liên hệ ngay khi bếp hoàn thành món'}
            </div>
          </div>

        </div>
      </div>

      {/* ── Payment Modal (VNPAY-QR Sandbox & VietQR) ── */}
      {showPaymentModal && currentOrder && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            maxWidth: 440, width: '100%', background: '#ffffff',
            borderRadius: 24, padding: 24, textAlign: 'center',
            boxShadow: '0 24px 48px -12px rgba(0,0,0,0.25)',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            {isPaidSuccess ? (
              <div style={{ padding: '28px 12px' }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: '#dcfce7', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', margin: '0 auto 16px',
                }}>
                  <CheckCircle size={44} color="#16a34a" />
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#14532d', margin: '0 0 8px' }}>
                  Thanh toán thành công!
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 16px' }}>
                  Hệ thống đã xác nhận thanh toán cho đơn hàng <strong>#{currentOrder.orderNumber}</strong>. Bếp đang bắt đầu chuẩn bị món!
                </p>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: '0.8rem', color: '#16a34a', fontWeight: 700,
                  background: '#f0fdf4', padding: '6px 14px', borderRadius: 99,
                }}>
                  <ShieldCheck size={16} /> Đang tự động chuyển trang...
                </div>
              </div>
            ) : payMethod === 'vnpay_qr' ? (
              <div>
                {/* VNPAY-QR Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      padding: '4px 8px', borderRadius: 6,
                      background: '#0284c7', color: '#ffffff',
                      fontWeight: 900, fontSize: '0.75rem', letterSpacing: 0.5,
                    }}>
                      VNPAY
                    </div>
                    <span style={{
                      fontSize: '0.7rem', background: '#e0f2fe', color: '#0369a1',
                      padding: '2px 8px', borderRadius: 99, fontWeight: 700,
                    }}>
                      🧪 Sandbox Configured
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.78rem', background: '#fee2e2', color: '#b91c1c',
                    padding: '2px 8px', borderRadius: 99, fontWeight: 700,
                  }}>
                    ⏱️ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                {/* Simulated Bank Card Preview */}
                <div style={{
                  background: 'linear-gradient(135deg, #034ea2 0%, #002d62 100%)',
                  borderRadius: 16, padding: '16px 18px', color: '#ffffff',
                  textAlign: 'left', marginBottom: 14, boxShadow: '0 8px 20px rgba(3, 78, 162, 0.25)',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 900, letterSpacing: 1 }}>NCB BANK</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 4 }}>
                      VNPAY SANDBOX
                    </span>
                  </div>
                  <div style={{ fontSize: '1.05rem', letterSpacing: 2, fontWeight: 700, marginBottom: 10, fontFamily: 'monospace' }}>
                    {vnpayCardNumber.replace(/(\d{4})/g, '$1 ').trim()}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.75rem' }}>
                    <div>
                      <div style={{ opacity: 0.7, fontSize: '0.65rem' }}>CHỦ THẺ</div>
                      <div style={{ fontWeight: 800, letterSpacing: 0.5 }}>{vnpayCardHolder}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ opacity: 0.7, fontSize: '0.65rem' }}>NGÀY PH / HẾT HẠN</div>
                      <div style={{ fontWeight: 800 }}>{vnpayPaymentDate}</div>
                    </div>
                  </div>
                </div>

                {/* Card Inputs Form (Đã SET SẴN thông tin) */}
                <div style={{
                  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14,
                  padding: 12, marginBottom: 14, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                      Số thẻ (Đã set sẵn):
                    </label>
                    <input
                      type="text"
                      value={vnpayCardNumber}
                      onChange={(e) => setVnPayCardNumber(e.target.value)}
                      style={{
                        width: '100%', padding: '8px 10px', borderRadius: 8,
                        border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700,
                        background: '#ffffff', color: '#0f172a', boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                      Tên chủ thẻ (Đã set sẵn):
                    </label>
                    <input
                      type="text"
                      value={vnpayCardHolder}
                      onChange={(e) => setVnPayCardHolder(e.target.value.toUpperCase())}
                      style={{
                        width: '100%', padding: '8px 10px', borderRadius: 8,
                        border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700,
                        background: '#ffffff', color: '#0f172a', boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                        Ngày phát hành:
                      </label>
                      <input
                        type="text"
                        value={vnpayPaymentDate}
                        onChange={(e) => setVnPayPaymentDate(e.target.value)}
                        style={{
                          width: '100%', padding: '8px 10px', borderRadius: 8,
                          border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700,
                          background: '#ffffff', color: '#0f172a', boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#0369a1', marginBottom: 4 }}>
                        Mã OTP xác thực:
                      </label>
                      <input
                        type="text"
                        value={vnpayOtp}
                        onChange={(e) => setVnPayOtp(e.target.value)}
                        style={{
                          width: '100%', padding: '8px 10px', borderRadius: 8,
                          border: '1.5px solid #0284c7', fontSize: '0.85rem', fontWeight: 800,
                          background: '#f0f9ff', color: '#0284c7', boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Big Action Button: Thanh toán ngay */}
                <button
                  type="button"
                  disabled={isPayingVnPay}
                  onClick={handleConfirmVnPay}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 12,
                    background: isPayingVnPay ? '#94a3b8' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff', fontWeight: 800, fontSize: '0.95rem',
                    cursor: isPayingVnPay ? 'not-allowed' : 'pointer', border: 'none',
                    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)', marginBottom: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {isPayingVnPay ? (
                    <span>Đang xác nhận giao dịch...</span>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      <span>Xác nhận thanh toán ({currentOrder.totalAmount.toLocaleString('vi-VN')}đ)</span>
                    </>
                  )}
                </button>

                {/* Optional QR Code & Gateway view */}
                {vnpayInfo?.qr_image_url && (
                  <div style={{ marginBottom: 10 }}>
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal((prev) => prev)}
                      style={{
                        background: 'none', border: 'none', color: '#0284c7',
                        fontSize: '0.78rem', cursor: 'pointer', fontWeight: 700,
                      }}
                    >
                      {vnpayInfo?.payment_url && (
                        <a
                          href={vnpayInfo.payment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#0284c7', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          Hoặc mở cổng sandbox ngoài <ExternalLink size={12} />
                        </a>
                      )}
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    navigate(`/client/orders`);
                  }}
                  style={{
                    background: 'none', border: 'none', color: '#64748b',
                    fontSize: '0.8rem', cursor: 'pointer', padding: 4,
                  }}
                >
                  Đóng và theo dõi đơn hàng sau →
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
                    Quét mã VietQR thanh toán
                  </span>
                  <span style={{
                    fontSize: '0.78rem', background: '#fee2e2', color: '#b91c1c',
                    padding: '2px 8px', borderRadius: 99, fontWeight: 700,
                  }}>
                    ⏱️ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                <div style={{
                  background: '#fafafa', border: '1px solid #f1f5f9', borderRadius: 14,
                  padding: 12, marginBottom: 14, display: 'inline-block',
                }}>
                  <img
                    src={generateVietQRUrl(currentOrder.totalAmount, `OMNIRESTO ${currentOrder.orderNumber}`)}
                    alt="VietQR"
                    style={{ width: 200, height: 200, objectFit: 'contain', margin: '0 auto', display: 'block' }}
                  />
                </div>

                <div style={{
                  fontSize: '0.825rem', color: '#475569', textAlign: 'left',
                  background: '#f8fafc', padding: 12, borderRadius: 10, marginBottom: 16,
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Số tiền:</span>
                    <strong style={{ color: '#ea580c', fontSize: '0.95rem' }}>
                      {currentOrder.totalAmount.toLocaleString('vi-VN')}đ
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Nội dung CK:</span>
                    <strong style={{ color: '#0f172a' }}>OMNIRESTO {currentOrder.orderNumber}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Ngân hàng:</span>
                    <span style={{ fontWeight: 600 }}>{PAYMENT_CONFIG.bankName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Số tài khoản:</span>
                    <span style={{ fontWeight: 600 }}>{PAYMENT_CONFIG.accountNumber}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Chủ tài khoản:</span>
                    <span style={{ fontWeight: 600 }}>{PAYMENT_CONFIG.accountName}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    navigate(`/client/orders`);
                  }}
                  style={{
                    background: 'none', border: 'none', color: '#64748b',
                    fontSize: '0.8rem', cursor: 'pointer', padding: 4,
                  }}
                >
                  Đóng và theo dõi đơn hàng sau →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientCart;
