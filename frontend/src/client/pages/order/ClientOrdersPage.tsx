import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Flame,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Utensils,
  Search,
  PlusCircle,
  Layers,
  ChefHat,
  ListOrdered,
  RotateCcw,
  CreditCard,
  QrCode,
  Banknote,
  Copy,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useClientStore } from '../../store/clientStore';
import { OrderStatusStepper } from '../../components/OrderStatusStepper';
import { ServiceRequestModal } from '../../components/ServiceRequestModal';
import type { PlacedOrder } from '../../../shared/types/client';
import { PAYMENT_CONFIG, generateVietQRUrl } from '../../../shared/config/paymentConfig';

export const ClientOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    orders,
    tableSession,
    refreshTableSession,
    requestPayment,
    cancelPaymentRequest,
    verifySessionDemo,
    confirmPaymentDemo,
  } = useClientStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'batches' | 'all_dishes'>('batches');
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTab, setPaymentTab] = useState<'qr' | 'cash'>('qr');
  const [isCopied, setIsCopied] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Tự động làm mới dữ liệu phiên bàn từ Server khi vào trang
  useEffect(() => {
    if (tableSession?.sessionToken) {
      refreshTableSession();
    }
  }, []);

  // Filter orders by search
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        (o.tableNo && o.tableNo.toLowerCase().includes(q)) ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        o.items.some((it) => it.name.toLowerCase().includes(q))
      );
    });
  }, [orders, searchQuery]);

  const activeOrders = useMemo(
    () => filteredOrders.filter((o) => o.status !== 'COMPLETED'),
    [filteredOrders]
  );
  const completedOrders = useMemo(
    () => filteredOrders.filter((o) => o.status === 'COMPLETED'),
    [filteredOrders]
  );

  // Default: Chỉ mở rộng đợt gọi món mới nhất, các đợt khác thu gọn
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const toggleOrderAccordion = (orderId: string, index: number) => {
    setExpandedOrders((prev) => {
      const current = prev[orderId] !== undefined ? prev[orderId] : index === 0;
      return {
        ...prev,
        [orderId]: !current,
      };
    });
  };

  const isOrderExpanded = (orderId: string, index: number) => {
    if (expandedOrders[orderId] !== undefined) {
      return expandedOrders[orderId];
    }
    // Mặc định: Chỉ tự động mở đơn đầu tiên (mới nhất)
    return index === 0;
  };

  // Đồng bộ hóa từ vựng F&B thống nhất:
  // PENDING: Tiếp nhận (Đã gửi vào bếp / Chờ nấu)
  // PREPARING: Bếp đang nấu (Đầu bếp đang nấu)
  // READY: Món sẵn sàng (Đang bưng ra bàn)
  // COMPLETED: Hoàn tất (Đã lên bàn xong)
  const getStatusInfo = (status: PlacedOrder['status']) => {
    switch (status) {
      case 'PENDING':
        return {
          label: 'Đang tiếp nhận',
          color: '#0284c7',
          bg: '#f0f9ff',
          badgeText: 'Đã gửi vào bếp (Chờ nấu)',
          dishTag: '⏳ Chờ nấu',
          icon: Clock,
        };
      case 'PREPARING':
        return {
          label: 'Bếp đang nấu',
          color: '#ea580c',
          bg: '#fff7ed',
          badgeText: 'Đầu bếp đang nấu',
          dishTag: '🔥 Đang nấu',
          icon: Flame,
        };
      case 'READY':
        return {
          label: 'Món sẵn sàng',
          color: '#16a34a',
          bg: '#f0fdf4',
          badgeText: 'Đang bưng ra bàn',
          dishTag: '🔔 Đang bưng ra',
          icon: Bell,
        };
      default:
        return {
          label: 'Hoàn tất',
          color: '#64748b',
          bg: '#f8fafc',
          badgeText: 'Đã lên bàn xong',
          dishTag: '✅ Đã lên bàn',
          icon: CheckCircle2,
        };
    }
  };

  const getItemStatusBadge = (status?: string) => {
    switch (status) {
      case 'SERVED':
        return { text: 'Đã lên bàn', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: '✅' };
      case 'READY':
        return { text: 'Đang bưng ra', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: '🔔' };
      case 'PREPARING':
        return { text: 'Bếp đang nấu', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', icon: '🔥' };
      case 'CANCELLED':
        return { text: 'Đã hủy', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '❌' };
      default:
        return { text: 'Chờ nấu', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', icon: '⏳' };
    }
  };

  // Tổng hợp tất cả món của bàn (All Dishes Aggregate)
  const allDishesSummary = useMemo(() => {
    const list: {
      key: string;
      name: string;
      image?: string;
      quantity: number;
      price: number;
      status: string;
      roundNo: number;
      notes?: string;
      orderNumber: string;
    }[] = [];

    activeOrders.forEach((ord) => {
      ord.items.forEach((it, idx) => {
        list.push({
          key: `${ord.id}-${it.menuItemId}-${it.name}-${idx}`,
          name: it.name,
          image: it.image,
          quantity: it.quantity,
          price: it.price,
          status: it.status || ord.status,
          roundNo: it.roundNo || 1,
          notes: it.notes,
          orderNumber: ord.orderNumber,
        });
      });
    });

    return list;
  }, [activeOrders]);

  // Thống kê tổng tiền bàn
  const totalTableAmount = activeOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalTableDishCount = activeOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, it) => s + it.quantity, 0),
    0
  );

  return (
    <div
      style={{
        fontFamily: 'var(--c-font, sans-serif)',
        background: 'var(--c-bg, #faf8f5)',
        minHeight: '100vh',
        padding: '24px 16px 120px',
      }}
    >
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* ── TOP HEADER: Table session & Unified Service Call ── */}
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '10px',
            }}
          >
            {/* Table Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: '#047857',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                📍 {tableSession?.tableNo || 'Bàn của bạn'}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#ea580c',
                  background: '#fff7ed',
                  padding: '3px 9px',
                  borderRadius: '999px',
                }}
              >
                ● Trực tiếp từ bếp
              </span>
            </div>
          </div>

          <h1
            style={{
              fontSize: 'clamp(1.35rem, 2.5vw, 1.65rem)',
              fontWeight: 900,
              color: 'var(--c-text-main, #0f172a)',
              margin: '0 0 4px',
            }}
          >
            Theo Dõi Tiến Độ Món Ăn
          </h1>
          <p style={{ color: 'var(--c-text-muted, #64748b)', fontSize: '0.85rem', margin: 0 }}>
            Tiến độ từng món và các đợt gọi món của bàn được cập nhật thời gian thực.
          </p>
        </div>

        {/* ── BANNER 1: Hóa đơn đang đóng băng để thanh toán ── */}
        {tableSession?.status === 'PAYMENT_REQUESTED' && (
          <div
            style={{
              background: '#eff6ff',
              border: '1.5px solid #60a5fa',
              borderRadius: '14px',
              padding: '14px 18px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              boxShadow: '0 2px 8px rgba(37,99,235,0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.4rem' }}>❄️</span>
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#1e40af' }}>
                  Hóa đơn bàn đang đóng băng để thanh toán
                </strong>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#3b82f6' }}>
                  Số tiền đã được chốt để quét mã VietQR. Bạn có thể mở lại hóa đơn nếu muốn tiếp tục gọi thêm món.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  padding: '7px 14px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <QrCode size={14} />
                <span>Xem mã VietQR</span>
              </button>
              <button
                onClick={async () => {
                  await cancelPaymentRequest();
                }}
                style={{
                  background: '#ffffff',
                  color: '#1e40af',
                  border: '1px solid #bfdbfe',
                  padding: '7px 12px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                🔓 Hủy để gọi thêm
              </button>
            </div>
          </div>
        )}

        {/* ── BANNER 2: Bàn chưa được nhân viên xác nhận tại chỗ (Chống đơn ma) ── */}
        {tableSession && !tableSession.isVerified && (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '14px',
              padding: '12px 18px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.3rem' }}>⏳</span>
              <div>
                <strong style={{ fontSize: '0.875rem', color: '#92400e' }}>
                  Đợt 1 đang chờ nhân viên kiểm tra bàn
                </strong>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#b45309' }}>
                  Sau khi nhân viên duyệt tại bàn, các đợt gọi thêm tiếp theo sẽ được gửi thẳng vào bếp.
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                await verifySessionDemo();
              }}
              style={{
                background: '#d97706',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <ShieldCheck size={14} />
              <span>Duyệt bàn ngay (Test)</span>
            </button>
          </div>
        )}

        {/* ── VIEW MODE SWITCHER & SEARCH ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '18px',
            flexWrap: 'wrap',
          }}
        >
          {/* Segmented Tab */}
          <div
            style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            <button
              onClick={() => setViewMode('batches')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'batches' ? '#ffffff' : 'transparent',
                color: viewMode === 'batches' ? '#0f172a' : '#64748b',
                fontWeight: viewMode === 'batches' ? 800 : 600,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'batches' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <ListOrdered size={14} />
              <span>Theo đợt gọi ({activeOrders.length})</span>
            </button>

            <button
              onClick={() => setViewMode('all_dishes')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'all_dishes' ? '#ffffff' : 'transparent',
                color: viewMode === 'all_dishes' ? '#0f172a' : '#64748b',
                fontWeight: viewMode === 'all_dishes' ? 800 : 600,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'all_dishes' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Layers size={14} />
              <span>Tất cả món ({totalTableDishCount})</span>
            </button>
          </div>

          {/* Quick Search & Reset */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '220px', maxWidth: '380px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#ffffff',
                borderRadius: '10px',
                padding: '6px 12px',
                border: '1px solid #e2e8f0',
                flex: '1',
              }}
            >
              <Search size={14} color="#94a3b8" />
              <input
                type="text"
                placeholder="Tìm theo món hoặc mã đơn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: '0.8125rem',
                  color: '#0f172a',
                  width: '100%',
                  fontFamily: 'inherit',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    fontSize: '0.75rem',
                    padding: 0,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() => {
                if (window.confirm('Bạn có muốn xóa toàn bộ dữ liệu đơn và phiên bàn ảo để bắt đầu test lại từ đầu không?')) {
                  useClientStore.getState().resetClientData();
                  window.location.reload();
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '10px',
                padding: '7px 11px',
                fontSize: '0.75rem',
                color: '#64748b',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
              title="Xóa dữ liệu test và bắt đầu phiên mới"
            >
              <RotateCcw size={13} />
              <span>Reset test</span>
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            ACTIVE ORDERS CONTENT (COMPACT ACCORDIONS OR SUMMARY)
           ══════════════════════════════════════════════════════ */}
        {activeOrders.length === 0 ? (
          <div
            style={{
              background: '#ffffff',
              border: '1px dashed #e2e8f0',
              borderRadius: '16px',
              padding: '36px 20px',
              textAlign: 'center',
              marginBottom: '28px',
            }}
          >
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '10px' }}>🍽️</span>
            <h3 style={{ margin: '0 0 6px', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
              Hiện tại không có món nào đang nấu
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.8125rem', color: '#64748b' }}>
              Quý khách chưa đặt món hoặc các món trước đó đã được phục vụ lên bàn đầy đủ.
            </p>
            <button className="c-btn c-btn-primary" onClick={() => navigate('/client/menu')}>
              <Utensils size={15} />
              <span>Khám phá thực đơn & Gọi món</span>
            </button>
          </div>
        ) : viewMode === 'batches' ? (
          /* ── TAB 1: COMPACT ACCORDION CARDS (Gọn gàng ~70px collapsed) ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
            {activeOrders.map((order, idx) => {
              const statusInfo = getStatusInfo(order.status);
              const StatusIcon = statusInfo.icon;
              const isExpanded = isOrderExpanded(order.id, idx);
              const itemCount = order.items.reduce((s, it) => s + it.quantity, 0);

              return (
                <div
                  key={order.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Compact Clickable Header (~65px) */}
                  <div
                    onClick={() => toggleOrderAccordion(order.id, idx)}
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      background: isExpanded ? statusInfo.bg : '#ffffff',
                      borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                      transition: 'background 0.15s ease',
                      userSelect: 'none',
                    }}
                  >
                    {/* Left: Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: isExpanded ? '#ffffff' : statusInfo.bg,
                          color: statusInfo.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        }}
                      >
                        <StatusIcon size={16} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                            {order.orderNumber}
                          </strong>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            · {order.placedAt}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px' }}>
                          {itemCount} món · <strong>{order.totalAmount.toLocaleString('vi-VN')}đ</strong>
                        </div>
                      </div>
                    </div>

                    {/* Right: Status Pill & Accordion Chevron */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          background: statusInfo.bg,
                          color: statusInfo.color,
                          border: `1px solid ${statusInfo.color}30`,
                          padding: '3px 8px',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {statusInfo.dishTag}
                      </span>
                      <div style={{ color: '#94a3b8' }}>
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Body: Minimal Stepper & Dish Breakdown */}
                  {isExpanded && (
                    <div style={{ padding: '16px', animation: 'c-fade-in 0.2s ease' }}>
                      {/* Slim Stepper Progress */}
                      <div style={{ marginBottom: '14px' }}>
                        <OrderStatusStepper
                          status={order.status}
                          estimatedMinutes={order.estimatedMinutes}
                        />
                      </div>

                      {/* Dishes in this Order (Grouped by Round) */}
                      {(() => {
                        const roundsMap: Record<number, typeof order.items> = {};
                        order.items.forEach((it) => {
                          const r = it.roundNo || 1;
                          if (!roundsMap[r]) roundsMap[r] = [];
                          roundsMap[r].push(it);
                        });
                        const roundNumbers = Object.keys(roundsMap).map(Number).sort((a, b) => a - b);
                        const hasMultipleRounds = roundNumbers.length > 1;

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {roundNumbers.map((rNo) => {
                              const rItems = roundsMap[rNo];
                              const rTotal = rItems.reduce((s, it) => s + it.price * it.quantity, 0);

                              return (
                                <div
                                  key={`round-${rNo}`}
                                  style={{
                                    background: hasMultipleRounds ? '#f8fafc' : 'transparent',
                                    borderRadius: '10px',
                                    padding: hasMultipleRounds ? '10px 12px' : '0',
                                    border: hasMultipleRounds ? '1px solid #e2e8f0' : 'none',
                                  }}
                                >
                                  {hasMultipleRounds && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: rNo === 1 ? '#475569' : '#ea580c' }}>
                                        {rNo === 1 ? '📋 Đợt 1 (Đầu tiên)' : `🔥 Đợt ${rNo} (Gọi thêm)`}
                                      </span>
                                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                        {rItems.reduce((s, it) => s + it.quantity, 0)} phần · {rTotal.toLocaleString('vi-VN')}đ
                                      </span>
                                    </div>
                                  )}

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {rItems.map((it, itemIdx) => {
                                      const itemBadge = getItemStatusBadge(it.status);
                                      return (
                                        <div
                                          key={`${it.menuItemId}-${rNo}-${itemIdx}`}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '6px 0',
                                            borderBottom: '1px solid #f1f5f9',
                                            gap: '10px',
                                          }}
                                        >
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                            {it.image && (
                                              <img
                                                src={it.image}
                                                alt={it.name}
                                                style={{
                                                  width: '32px',
                                                  height: '32px',
                                                  borderRadius: '6px',
                                                  objectFit: 'cover',
                                                  flexShrink: 0,
                                                }}
                                              />
                                            )}
                                            <div style={{ minWidth: 0 }}>
                                              <div
                                                style={{
                                                  fontSize: '0.8125rem',
                                                  fontWeight: 700,
                                                  color: '#0f172a',
                                                  whiteSpace: 'nowrap',
                                                  overflow: 'hidden',
                                                  textOverflow: 'ellipsis',
                                                }}
                                              >
                                                {it.name}
                                              </div>
                                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                                SL: <strong>{it.quantity}</strong> · {(it.price * it.quantity).toLocaleString('vi-VN')}đ
                                                {it.notes ? ` · (${it.notes})` : ''}
                                              </div>
                                            </div>
                                          </div>

                                          <span
                                            style={{
                                              fontSize: '0.7rem',
                                              fontWeight: 700,
                                              padding: '2px 8px',
                                              borderRadius: '999px',
                                              background: itemBadge.bg,
                                              color: itemBadge.color,
                                              border: `1px solid ${itemBadge.border}`,
                                              whiteSpace: 'nowrap',
                                            }}
                                          >
                                            {itemBadge.icon} {itemBadge.text}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {/* Batch Footer (Total & Close hint) */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: '12px',
                          paddingTop: '10px',
                          borderTop: '1px dashed #e2e8f0',
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Thanh toán: <strong>{order.paymentMethod === 'QR_CODE' ? 'Quét QR' : 'Tiền mặt/Quầy'}</strong>
                        </span>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', marginRight: '6px' }}>Đợt này:</span>
                          <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#ea580c' }}>
                            {order.totalAmount.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* ── TAB 2: ALL DISHES SUMMARY (Gom theo tiến độ toàn bàn) ── */
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '18px',
              marginBottom: '28px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ChefHat size={18} color="#ea580c" />
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  Tổng Hợp Món Ăn Bàn Này ({allDishesSummary.length} món)
                </h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Gom từ {activeOrders.length} đợt gọi
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {allDishesSummary.map((item) => {
                const itemBadge = getItemStatusBadge(item.status);
                return (
                  <div
                    key={item.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: '1px solid #f1f5f9',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            objectFit: 'cover',
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Đơn {item.orderNumber} {item.roundNo && item.roundNo > 1 ? `· Đợt ${item.roundNo}` : ''} · SL: <strong>{item.quantity}</strong> · {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                          {item.notes ? ` · (${item.notes})` : ''}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        background: itemBadge.bg,
                        color: itemBadge.color,
                        border: `1px solid ${itemBadge.border}`,
                        padding: '3px 8px',
                        borderRadius: '999px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {itemBadge.icon} {itemBadge.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            ZONE 2: COMPACT HISTORY FOR COMPLETED ORDERS
           ══════════════════════════════════════════════════════ */}
        {completedOrders.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h3
              style={{
                fontSize: '0.875rem',
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '10px',
              }}
            >
              Lịch sử các đợt đã xong ({completedOrders.length})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {completedOrders.map((order) => (
                <div
                  key={order.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#16a34a" />
                    <div>
                      <strong style={{ fontSize: '0.8125rem', color: '#0f172a' }}>
                        {order.orderNumber}
                      </strong>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '6px' }}>
                        · {order.placedAt} ({order.items.length} món)
                      </span>
                    </div>
                  </div>

                  <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>
                    {order.totalAmount.toLocaleString('vi-VN')}đ
                  </strong>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
      

      {/* ── STICKY BOTTOM ACTION BAR (Thumb-friendly & Payment Flow) ── */}
      {activeOrders.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            padding: '12px 20px',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
            zIndex: 100,
          }}
        >
          <div
            style={{
              maxWidth: '720px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Tổng bàn ({totalTableDishCount} món):
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ea580c' }}>
                {totalTableAmount.toLocaleString('vi-VN')}đ
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {tableSession?.status === 'PAYMENT_REQUESTED' ? (
                <>
                  <button
                    onClick={() => setIsPaymentModalOpen(true)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '12px',
                      background: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 3px 10px rgba(2,132,199,0.3)',
                    }}
                  >
                    <QrCode size={16} />
                    <span>Xem mã VietQR</span>
                  </button>

                  <button
                    onClick={async () => {
                      await cancelPaymentRequest();
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    🔓 Hủy để gọi thêm
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={async () => {
                      setIsProcessingPayment(true);
                      try {
                        await requestPayment();
                        setIsPaymentModalOpen(true);
                      } finally {
                        setIsProcessingPayment(false);
                      }
                    }}
                    disabled={isProcessingPayment}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '12px',
                      background: '#059669',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 3px 10px rgba(5,150,105,0.3)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <CreditCard size={16} />
                    <span>{isProcessingPayment ? 'Đang gửi...' : 'Yêu cầu thanh toán'}</span>
                  </button>

                  <button
                    onClick={() => navigate('/client/menu')}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '12px',
                      background: '#ea580c',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 3px 10px rgba(234,88,12,0.3)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <PlusCircle size={16} />
                    <span>Gọi thêm món</span>
                  </button>

                  <button
                    onClick={() => setIsServiceModalOpen(true)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '12px',
                      background: '#fffbeb',
                      color: '#b45309',
                      border: '1px solid #fde68a',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Bell size={15} color="#b45309" />
                    <span>Gọi phục vụ</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PAYMENT MODAL (Đóng băng hóa đơn & Thanh toán cuối bữa) ── */}
      {isPaymentModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  💳 Thanh toán cuối bữa
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {tableSession?.tableNo || 'Bàn ăn'} • Hóa đơn đã đóng băng
                </div>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Total Amount Box */}
            <div
              style={{
                background: '#fff7ed',
                border: '1.5px dashed #fdba74',
                borderRadius: '14px',
                padding: '16px',
                textAlign: 'center',
                marginBottom: '18px',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: '#9a3412', fontWeight: 600 }}>
                Tổng số tiền thanh toán (Đã chốt cố định):
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ea580c', margin: '4px 0' }}>
                {totalTableAmount.toLocaleString('vi-VN')}đ
              </div>
              <div style={{ fontSize: '0.75rem', color: '#c2410c' }}>
                * Hóa đơn được giữ nguyên số tiền để chuyển khoản VietQR chính xác 100%
              </div>
            </div>

            {/* Tabs Selector */}
            <div
              style={{
                display: 'flex',
                background: '#f1f5f9',
                borderRadius: '12px',
                padding: '4px',
                marginBottom: '18px',
                gap: '4px',
              }}
            >
              <button
                onClick={() => setPaymentTab('qr')}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  border: 'none',
                  borderRadius: '9px',
                  background: paymentTab === 'qr' ? '#ffffff' : 'transparent',
                  color: paymentTab === 'qr' ? '#0f172a' : '#64748b',
                  fontWeight: paymentTab === 'qr' ? 800 : 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: paymentTab === 'qr' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <QrCode size={15} />
                <span>Quét mã VietQR</span>
              </button>

              <button
                onClick={() => setPaymentTab('cash')}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  border: 'none',
                  borderRadius: '9px',
                  background: paymentTab === 'cash' ? '#ffffff' : 'transparent',
                  color: paymentTab === 'cash' ? '#0f172a' : '#64748b',
                  fontWeight: paymentTab === 'cash' ? 800 : 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: paymentTab === 'cash' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Banknote size={15} />
                <span>Tiền mặt / Thẻ tại bàn</span>
              </button>
            </div>

            {/* Tab 1: VietQR Content */}
            {paymentTab === 'qr' && (
              <div style={{ textAlign: 'center' }}>
                {(() => {
                  const activeOrderNumber = tableSession?.activeOrderNumber || activeOrders[0]?.orderNumber || 'ORD-BILL';
                  const transferContent = `OMNIRESTO ${activeOrderNumber}`;
                  const qrUrl = tableSession?.vietQr?.qrImageUrl ||
                    generateVietQRUrl(totalTableAmount, transferContent);

                  return (
                    <div>
                      <div
                        style={{
                          background: '#ffffff',
                          padding: '12px',
                          borderRadius: '16px',
                          display: 'inline-block',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                          marginBottom: '14px',
                        }}
                      >
                        <img
                          src={qrUrl}
                          alt="VietQR Payment"
                          style={{ width: '220px', height: '220px', objectFit: 'contain', display: 'block' }}
                        />
                      </div>

                      <div
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '12px 14px',
                          textAlign: 'left',
                          fontSize: '0.82rem',
                          marginBottom: '16px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: '#64748b' }}>Ngân hàng:</span>
                          <strong style={{ color: '#0f172a' }}>{tableSession?.vietQr?.bankId || PAYMENT_CONFIG.bankName}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: '#64748b' }}>Số tài khoản:</span>
                          <strong style={{ color: '#0f172a' }}>{tableSession?.vietQr?.accountNumber || PAYMENT_CONFIG.accountNumber}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: '#64748b' }}>Chủ tài khoản:</span>
                          <strong style={{ color: '#0f172a' }}>{tableSession?.vietQr?.accountName || PAYMENT_CONFIG.accountName}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b' }}>Nội dung:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ color: '#ea580c' }}>{transferContent}</strong>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(transferContent);
                                setIsCopied(true);
                                setTimeout(() => setIsCopied(false), 2000);
                              }}
                              style={{
                                background: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                padding: '2px 6px',
                                cursor: 'pointer',
                                fontSize: '0.72rem',
                                color: '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <Copy size={12} />
                              {isCopied ? 'Đã chép' : 'Chép'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Test simulation button */}
                      <button
                        onClick={async () => {
                          await confirmPaymentDemo('QR_CODE');
                          setIsPaymentModalOpen(false);
                          alert('🎉 Thanh toán VietQR thành công! Cảm ơn quý khách đã dùng bữa tại OmniResto.');
                        }}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '10px',
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          color: '#047857',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          marginBottom: '10px',
                        }}
                      >
                        ⚡ Giả lập Webhook VietQR khớp tiền (Test)
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Tab 2: Cash / POS Card */}
            {paymentTab === 'cash' && (
              <div style={{ padding: '8px 0', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🛎️</div>
                <h4 style={{ margin: '0 0 6px', fontSize: '1rem', color: '#0f172a', fontWeight: 800 }}>
                  Yêu cầu đã được gửi đến Thu ngân
                </h4>
                <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 18px' }}>
                  Nhân viên phục vụ đang in hóa đơn chi tiết và sẽ mang thiết bị quẹt thẻ POS hoặc tiền mặt lại bàn của bạn ngay.
                </p>

                <button
                  onClick={async () => {
                    await confirmPaymentDemo('CASH');
                    setIsPaymentModalOpen(false);
                    alert('✅ Nhân viên đã xác nhận thu tiền tại bàn thành công!');
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '10px',
                    background: '#fef3c7',
                    border: '1px solid #fde68a',
                    color: '#92400e',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    marginBottom: '10px',
                  }}
                >
                  💵 Giả lập: Nhân viên xác nhận đã thu tiền tại bàn (Test)
                </button>
              </div>
            )}

            {/* Bottom Unfreeze Action */}
            <div
              style={{
                borderTop: '1px solid #e2e8f0',
                paddingTop: '14px',
                marginTop: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <button
                onClick={async () => {
                  await cancelPaymentRequest();
                  setIsPaymentModalOpen(false);
                }}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#475569',
                  borderRadius: '10px',
                  padding: '9px 14px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                🔓 Hủy yêu cầu để gọi thêm món
              </button>

              <button
                onClick={() => setIsPaymentModalOpen(false)}
                style={{
                  background: '#0f172a',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '10px',
                  padding: '9px 16px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Service Request Modal for Table */}
      <ServiceRequestModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        tableNo={tableSession?.tableNo}
      />
    </div>
  );
};

export default ClientOrdersPage;
