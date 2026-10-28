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
  XCircle,
  Sparkles,
  MapPin,
  Lock,
  Unlock,
  Receipt,
  FlaskConical,
  UtensilsCrossed,
  ConciergeBell,
  CheckCheck,
  Zap,
} from 'lucide-react';
import { useClientStore } from '../../store/clientStore';
import { OrderStatusStepper } from '../../components/OrderStatusStepper';
import { ServiceRequestModal } from '../../components/ServiceRequestModal';
import type { PlacedOrder, VnPayPaymentInfo } from '../../../shared/types/client';
import { VNPAY_SANDBOX_CONFIG } from '../../../shared/types/client';
import { PAYMENT_CONFIG, generateVietQRUrl } from '../../../shared/config/paymentConfig';
import { createVnPayPayment, processVnPayDirectPayment } from '../../../shared/api/vnpayApi';
import './ClientOrdersPage.css';

export const ClientOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    orders,
    table_session,
    refreshTableSession,
    fetchOrdersFromServer,
    requestPayment,
    cancelPaymentRequest,
    confirmPaymentDemo,
  } = useClientStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'batches' | 'all_dishes'>('batches');
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTab, setPaymentTab] = useState<'vnpay' | 'qr' | 'cash'>('vnpay');
  const [vnpayInfo, setVnPayInfo] = useState<VnPayPaymentInfo | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // VNPAY Sandbox card inputs (set sẵn mặc định để kiểm thử nhanh)
  const [vnpayCardNumber, setVnPayCardNumber] = useState(VNPAY_SANDBOX_CONFIG.card_number);
  const [vnpayCardHolder, setVnPayCardHolder] = useState(VNPAY_SANDBOX_CONFIG.card_holder);
  const [vnpayPaymentDate, setVnPayPaymentDate] = useState(VNPAY_SANDBOX_CONFIG.payment_date);
  const [vnpayOtp, setVnPayOtp] = useState(VNPAY_SANDBOX_CONFIG.otp);
  const [isPayingVnPay, setIsPayingVnPay] = useState(false);

  // Tự động làm mới dữ liệu phiên bàn & danh sách đơn hàng từ Server khi vào trang
  useEffect(() => {
    fetchOrdersFromServer();
    if (table_session?.session_token) {
      refreshTableSession();
    }

    // Polling định kỳ mỗi 4 giây nếu còn đơn hàng đang hoạt động
    const interval = setInterval(() => {
      const hasActive = useClientStore.getState().orders.some(
        (o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED'
      );
      if (hasActive) {
        fetchOrdersFromServer();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [table_session?.session_token, fetchOrdersFromServer, refreshTableSession]);

  // Lọc đơn hàng theo ô tìm kiếm
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        o.order_number.toLowerCase().includes(q) ||
        (o.table_no && o.table_no.toLowerCase().includes(q)) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
        o.items.some((it) => it.name.toLowerCase().includes(q))
      );
    });
  }, [orders, searchQuery]);

  const activeOrders = useMemo(
    () => filteredOrders.filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED'),
    [filteredOrders]
  );
  const completedOrders = useMemo(
    () => filteredOrders.filter((o) => o.status === 'COMPLETED'),
    [filteredOrders]
  );
  const cancelledOrders = useMemo(
    () => filteredOrders.filter((o) => o.status === 'CANCELLED'),
    [filteredOrders]
  );

  // Tự động khởi tạo phiên thanh toán VNPAY-QR khi mở modal
  useEffect(() => {
    if (isPaymentModalOpen && paymentTab === 'vnpay') {
      const targetOrderId = activeOrders[0]?.id;
      if (targetOrderId && !vnpayInfo) {
        createVnPayPayment(targetOrderId)
          .then((info) => setVnPayInfo(info))
          .catch((err) => console.warn('Lỗi tạo VNPAY bill bàn:', err));
      }
    }
  }, [isPaymentModalOpen, paymentTab, activeOrders, vnpayInfo]);

  // Quản lý trạng thái mở rộng accordion của các đợt gọi món
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
    return index === 0;
  };

  // Từ điển trạng thái F&B đồng bộ thời gian thực
  const getStatusInfo = (status: PlacedOrder['status']) => {
    switch (status) {
      case 'PENDING':
        return {
          label: 'Đang tiếp nhận',
          color: '#0284c7',
          bg: '#f0f9ff',
          badgeText: 'Chờ nhà bếp tiếp nhận',
          dishTag: 'Chờ nấu',
          icon: Clock,
        };
      case 'PREPARING':
        return {
          label: 'Bếp đang nấu',
          color: '#ea580c',
          bg: '#fff7ed',
          badgeText: 'Đầu bếp đang nấu',
          dishTag: 'Đang nấu',
          icon: Flame,
        };
      case 'READY':
        return {
          label: 'Món sẵn sàng',
          color: '#16a34a',
          bg: '#f0fdf4',
          badgeText: 'Đang bưng ra bàn',
          dishTag: 'Đang bưng ra',
          icon: ConciergeBell,
        };
      case 'CANCELLED':
        return {
          label: 'Đã hủy',
          color: '#dc2626',
          bg: '#fef2f2',
          badgeText: 'Đơn đã bị hủy',
          dishTag: 'Đã hủy',
          icon: XCircle,
        };
      default:
        return {
          label: 'Hoàn tất',
          color: '#64748b',
          bg: '#f8fafc',
          badgeText: 'Đã lên bàn xong',
          dishTag: 'Đã lên bàn',
          icon: CheckCheck,
        };
    }
  };

  const getItemStatusBadge = (status?: string) => {
    switch (status) {
      case 'SERVED':
        return { text: 'Đã lên bàn', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', Icon: CheckCheck };
      case 'READY':
        return { text: 'Đang bưng ra', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', Icon: ConciergeBell };
      case 'PREPARING':
        return { text: 'Bếp đang nấu', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', Icon: Flame };
      case 'CANCELLED':
        return { text: 'Đã hủy', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', Icon: XCircle };
      default:
        return { text: 'Chờ nấu', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', Icon: Clock };
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
      round_no: number;
      notes?: string;
      options?: any[];
      order_number: string;
    }[] = [];

    activeOrders.forEach((ord) => {
      ord.items.forEach((it, idx) => {
        if (it.status === 'CANCELLED') return;
        list.push({
          key: `${ord.id}-${it.menu_item_id}-${it.name}-${idx}`,
          name: it.name,
          image: it.image,
          quantity: it.quantity,
          price: it.price,
          status: it.status || ord.status,
          round_no: it.round_no || 1,
          notes: it.notes,
          options: it.options || [],
          order_number: ord.order_number,
        });
      });
    });

    return list;
  }, [activeOrders]);

  // Thống kê tổng tiền và tổng số món đang hoạt động
  const totalTableAmount = activeOrders.reduce(
    (sum, o) => sum + (o.status === 'CANCELLED' ? 0 : o.total_amount),
    0
  );
  const totalTableDishCount = activeOrders.reduce(
    (sum, o) => sum + o.items.filter((it) => it.status !== 'CANCELLED').reduce((s, it) => s + it.quantity, 0),
    0
  );

  // Hàm nạp nhanh dữ liệu đơn hàng mẫu phục vụ kiểm thử giao diện
  const handleSeedDemo = () => {
    const demoOrders: PlacedOrder[] = [
      {
        id: 'demo-ord-1',
        order_number: 'ORD-8821',
        table_no: table_session?.table_no || 'Bàn 04',
        customer_name: 'Nguyễn Văn A',
        status: 'PREPARING',
        order_mode: 'DINE_IN',
        placed_at: '19:45',
        estimated_minutes: 12,
        total_amount: 315000,
        payment_method: 'QR_CODE',
        items: [
          {
            id: 'item-1',
            menu_item_id: 'm1',
            name: 'Phở Bò Tái Nạm Wagyu Thượng Hạng',
            category: 'Món chính',
            price: 185000,
            quantity: 1,
            round_no: 1,
            status: 'PREPARING',
            notes: 'Ít hành lá, nhiều ớt tươi',
            image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=300&auto=format&fit=crop&q=80',
          },
          {
            id: 'item-2',
            menu_item_id: 'm2',
            name: 'Trà Sen Vàng Long Nhãn Khởi Sắc',
            category: 'Đồ uống',
            price: 65000,
            quantity: 2,
            round_no: 1,
            status: 'READY',
            image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=300&auto=format&fit=crop&q=80',
          },
        ],
      },
      {
        id: 'demo-ord-2',
        order_number: 'ORD-8825',
        table_no: table_session?.table_no || 'Bàn 04',
        customer_name: 'Nguyễn Văn A',
        status: 'PENDING',
        order_mode: 'DINE_IN',
        placed_at: '20:05',
        estimated_minutes: 8,
        total_amount: 85000,
        payment_method: 'CASH',
        items: [
          {
            id: 'item-3',
            menu_item_id: 'm3',
            name: 'Bánh Flan Trân Châu Đường Đen Hoàng Gia',
            category: 'Tráng miệng',
            price: 85000,
            quantity: 1,
            round_no: 2,
            status: 'PENDING',
            notes: 'Dùng sau bữa ăn',
            image: 'https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=300&auto=format&fit=crop&q=80',
          },
        ],
      },
    ];
    useClientStore.setState({ orders: demoOrders });
    localStorage.setItem('omniresto_client_orders', JSON.stringify(demoOrders));
  };

  return (
    <div className="cop-page">
      <div className="cop-container">

        {/* ── TOP HEADER: Table session & Unified Service Call ── */}
        <header className="cop-header">
          <div className="cop-header-meta">
            {/* Table Badge & Live Pulse */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="cop-table-tag">
                <MapPin size={13} strokeWidth={2.2} />
                <span>{table_session?.table_no || 'Bàn của bạn'}</span>
              </span>
              <span className="cop-live-sync-pill">
                <span className="cop-live-pulse-dot" />
                <span>Trực tiếp từ bếp</span>
              </span>
            </div>
          </div>

          <h1 className="cop-title">
            Theo Dõi Tiến Độ Món Ăn
          </h1>
          <p className="cop-subtitle">
            Tiến độ từng món và các đợt gọi món của bàn được cập nhật thời gian thực.
          </p>
        </header>

        {/* ── BANNER: Hóa đơn đang đóng băng để thanh toán ── */}
        {table_session?.status?.toUpperCase() === 'PAYMENT_REQUESTED' && (
          <div className="cop-frozen-banner">
            <div className="cop-frozen-banner-left">
              <div className="cop-frozen-icon">
                <Lock size={18} strokeWidth={2.2} color="#1d4ed8" />
              </div>
              <div>
                <h4 className="cop-frozen-title">
                  Hóa đơn bàn đang đóng băng để thanh toán
                </h4>
                <p className="cop-frozen-desc">
                  Số tiền đã được chốt cố định để quét mã VietQR. Bạn có thể mở khóa để tiếp tục gọi thêm món.
                </p>
              </div>
            </div>
            <div className="cop-frozen-banner-actions">
              <button
                className="cop-btn-view-qr"
                onClick={() => setIsPaymentModalOpen(true)}
              >
                <QrCode size={15} />
                <span>Xem mã VietQR</span>
              </button>
              <button
                className="cop-btn-unfreeze"
                onClick={async () => {
                  await cancelPaymentRequest();
                }}
              >
                <Unlock size={14} strokeWidth={2.2} />
                <span>Mở khóa gọi thêm</span>
              </button>
            </div>
          </div>
        )}

        {/* ── CONTROL DECK: View Switcher & Spotlight Search ── */}
        <div className="cop-control-deck">
          {/* Segmented Tab */}
          <div className="cop-segmented-tabs">
            <button
              className={`cop-tab-btn ${viewMode === 'batches' ? 'is-active' : ''}`}
              onClick={() => setViewMode('batches')}
            >
              <ListOrdered size={15} />
              <span>Theo đợt gọi</span>
              <span className="cop-tab-badge">{activeOrders.length}</span>
            </button>

            <button
              className={`cop-tab-btn ${viewMode === 'all_dishes' ? 'is-active' : ''}`}
              onClick={() => setViewMode('all_dishes')}
            >
              <Layers size={15} />
              <span>Tất cả món</span>
              <span className="cop-tab-badge">{totalTableDishCount}</span>
            </button>
          </div>

          {/* Quick Search & Dev Tool */}
          <div className="cop-search-wrapper">
            <div className="cop-search-box">
              <Search size={15} color="#94a3b8" />
              <input
                type="text"
                className="cop-search-input"
                placeholder="Tìm món hoặc mã đơn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="cop-search-clear"
                  onClick={() => setSearchQuery('')}
                  title="Xóa tìm kiếm"
                >
                  <X size={13} strokeWidth={2.4} />
                </button>
              )}
            </div>

            <button
              className="cop-btn-reset-dev"
              onClick={() => {
                if (window.confirm('Bạn có muốn làm mới dữ liệu thử nghiệm và tải lại phiên bàn không?')) {
                  useClientStore.getState().resetClientData();
                  window.location.reload();
                }
              }}
              title="Đặt lại phiên dữ liệu kiểm thử"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            ACTIVE ORDERS CONTENT (BATCHES OR ALL DISHES BOARD)
           ══════════════════════════════════════════════════════ */}
        {activeOrders.length === 0 ? (
          /* ── LUXURY EMPTY STATE ── */
          <div className="cop-empty-card">
            <div className="cop-empty-cloche-art">
              <ChefHat size={34} strokeWidth={1.8} />
            </div>
            <h3 className="cop-empty-title">
              Hiện tại không có món nào đang nấu
            </h3>
            <p className="cop-empty-desc">
              Quý khách chưa đặt món hoặc toàn bộ các món trước đó đã được phục vụ lên bàn đầy đủ.
              Hương vị ẩm thực tinh hoa OmniResto đang sẵn sàng chào đón quý khách!
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="cop-btn-cta-menu" onClick={() => navigate('/client/menu')}>
                <Utensils size={16} />
                <span>Khám phá thực đơn thượng hạng</span>
                <Sparkles size={15} />
              </button>
              <button
                onClick={handleSeedDemo}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '9999px',
                  padding: '11px 20px',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s ease',
                }}
              >
                <FlaskConical size={14} strokeWidth={2.2} />
                <span>Nạp đơn mẫu trải nghiệm</span>
              </button>
            </div>
          </div>
        ) : viewMode === 'batches' ? (
          /* ── TAB 1: ACCORDION ORDER BATCHES ── */
          <div className="cop-batches-stack">
            {activeOrders.map((order, idx) => {
              const statusInfo = getStatusInfo(order.status);
              const StatusIcon = statusInfo.icon;
              const isExpanded = isOrderExpanded(order.id, idx);
              const itemCount = order.items.reduce((s, it) => s + it.quantity, 0);

              return (
                <div
                  key={order.id}
                  className={`cop-order-card ${isExpanded ? 'is-expanded' : ''}`}
                >
                  {/* Card Header (Clickable Accordion) */}
                  <div
                    className="cop-card-header"
                    onClick={() => toggleOrderAccordion(order.id, idx)}
                  >
                    {/* Left: Meta */}
                    <div className="cop-card-header-left">
                      <div
                        className="cop-status-avatar"
                        style={{
                          background: statusInfo.bg,
                          color: statusInfo.color,
                        }}
                      >
                        <StatusIcon size={18} />
                      </div>
                      <div>
                        <div className="cop-order-id-row">
                          <span className="cop-order-num">{order.order_number}</span>
                          <span className="cop-order-time">· {order.placed_at}</span>
                        </div>
                        <div className="cop-order-summary-text">
                          {itemCount} món ·{' '}
                          <span className="cop-order-summary-price">
                            {order.total_amount.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Status Pill & Chevron */}
                    <div className="cop-card-header-right">
                      <span
                        className="cop-status-pill"
                        style={{
                          background: statusInfo.bg,
                          color: statusInfo.color,
                          border: `1px solid ${statusInfo.color}35`,
                        }}
                      >
                        <StatusIcon size={12} strokeWidth={2.4} />
                        <span>{statusInfo.dishTag}</span>
                      </span>
                      <div className="cop-chevron-box">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>

                  {/* Card Body (Expanded) */}
                  {isExpanded && (
                    <div className="cop-card-body">
                      {/* Slim Stepper Progress */}
                      <div className="cop-mini-stepper">
                        <OrderStatusStepper
                          status={order.status}
                          estimatedMinutes={order.estimated_minutes}
                        />
                      </div>

                      {/* Dishes in this Order (Grouped by Round) */}
                      {(() => {
                        const roundsMap: Record<number, typeof order.items> = {};
                        order.items.forEach((it) => {
                          const r = it.round_no || 1;
                          if (!roundsMap[r]) roundsMap[r] = [];
                          roundsMap[r].push(it);
                        });
                        const roundNumbers = Object.keys(roundsMap).map(Number).sort((a, b) => a - b);
                        const hasMultipleRounds = roundNumbers.length > 1;

                        return (
                          <div className="cop-rounds-container">
                            {roundNumbers.map((rNo) => {
                              const rItems = roundsMap[rNo];
                              const rTotal = rItems.reduce((s, it) => s + it.price * it.quantity, 0);

                              return (
                                <div
                                  key={`round-${rNo}`}
                                  className={`cop-round-box ${hasMultipleRounds ? 'is-multiround' : ''}`}
                                >
                                  {hasMultipleRounds && (
                                    <div className="cop-round-header">
                                      {rNo === 1 ? (
                                        <span className="cop-round-title round-1" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                          <Receipt size={13} strokeWidth={2.2} />
                                          <span>Đợt 1 (Đầu tiên)</span>
                                        </span>
                                      ) : (
                                        <span className="cop-round-title round-next" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                          <Flame size={13} strokeWidth={2.2} />
                                          <span>Đợt {rNo} (Gọi thêm)</span>
                                        </span>
                                      )}
                                      <span className="cop-round-meta">
                                        {rItems.reduce((s, it) => s + it.quantity, 0)} phần · {rTotal.toLocaleString('vi-VN')}đ
                                      </span>
                                    </div>
                                  )}

                                  <div className="cop-dishes-list">
                                    {rItems.map((it, itemIdx) => {
                                      const itemBadge = getItemStatusBadge(it.status);
                                      const ItemBadgeIcon = itemBadge.Icon;
                                      return (
                                        <div
                                          key={`${it.menu_item_id}-${rNo}-${itemIdx}`}
                                          className="cop-dish-row"
                                        >
                                          <div className="cop-dish-info-left">
                                            {it.image ? (
                                              <img
                                                src={it.image}
                                                alt={it.name}
                                                className="cop-dish-thumb"
                                              />
                                            ) : (
                                              <div className="cop-dish-thumb-placeholder">
                                                <UtensilsCrossed size={18} strokeWidth={1.8} />
                                              </div>
                                            )}
                                            <div className="cop-dish-details">
                                              <div className="cop-dish-name">
                                                {it.name}
                                              </div>
                                              {it.options && it.options.length > 0 && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '2px 0 4px' }}>
                                                  {it.options.map((opt: any, optIdx: number) => {
                                                    const isSize = (opt.option_type || opt.optionType)?.toUpperCase() === 'SIZE';
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
                                                        {isSize ? '📏' : '➕'} {opt.option_name || opt.optionName}
                                                      </span>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                              <div className="cop-dish-submeta">
                                                SL: <strong>{it.quantity}</strong> ·{' '}
                                                {(it.price * it.quantity).toLocaleString('vi-VN')}đ
                                              </div>
                                              {it.notes && (
                                                <span className="cop-dish-notes">
                                                  Ghi chú: {it.notes}
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          <span
                                            className="cop-dish-status-tag"
                                            style={{
                                              background: itemBadge.bg,
                                              color: itemBadge.color,
                                              border: `1px solid ${itemBadge.border}`,
                                            }}
                                          >
                                            <ItemBadgeIcon size={11} strokeWidth={2.2} />
                                            <span>{itemBadge.text}</span>
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

                      {/* Batch Footer */}
                      <div className="cop-card-footer">
                        <span className="cop-batch-pay-info">
                          Hình thức thanh toán:{' '}
                          <strong>
                            {order.payment_method === 'QR_CODE'
                              ? 'Quét VietQR'
                              : order.payment_method === 'VNPAY_QR'
                              ? 'VNPAY'
                              : 'Tiền mặt/Tại quầy'}
                          </strong>
                        </span>
                        <div className="cop-batch-total">
                          <span className="cop-batch-total-label">Tổng đợt:</span>
                          <span className="cop-batch-total-value">
                            {order.total_amount.toLocaleString('vi-VN')}đ
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
          /* ── TAB 2: ALL DISHES SUMMARY BOARD ── */
          <div className="cop-aggregate-card">
            <div className="cop-aggregate-header">
              <div className="cop-aggregate-title-group">
                <ChefHat size={20} color="#ea580c" />
                <h3 className="cop-aggregate-title">
                  Tổng Hợp Món Ăn Bàn Này ({allDishesSummary.length} món)
                </h3>
              </div>
              <span className="cop-aggregate-subtitle">
                Gom từ {activeOrders.length} đợt gọi
              </span>
            </div>

            <div className="cop-dishes-list">
              {allDishesSummary.map((item) => {
                const itemBadge = getItemStatusBadge(item.status);
                const ItemBadgeIcon = itemBadge.Icon;
                return (
                  <div key={item.key} className="cop-dish-row">
                    <div className="cop-dish-info-left">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="cop-dish-thumb"
                        />
                      ) : (
                        <div className="cop-dish-thumb-placeholder">
                          <UtensilsCrossed size={18} strokeWidth={1.8} />
                        </div>
                      )}
                      <div className="cop-dish-details">
                        <div className="cop-dish-name">{item.name}</div>
                        {item.options && item.options.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '2px 0 4px' }}>
                            {item.options.map((opt: any, optIdx: number) => {
                              const isSize = (opt.option_type || opt.optionType)?.toUpperCase() === 'SIZE';
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
                                  {isSize ? '📏' : '➕'} {opt.option_name || opt.optionName}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <div className="cop-dish-submeta">
                          Đơn {item.order_number}{' '}
                          {item.round_no && item.round_no > 1 ? `· Đợt ${item.round_no}` : ''} · SL:{' '}
                          <strong>{item.quantity}</strong> ·{' '}
                          {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                        </div>
                        {item.notes && (
                          <span className="cop-dish-notes">
                            Ghi chú: {item.notes}
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className="cop-dish-status-tag"
                      style={{
                        background: itemBadge.bg,
                        color: itemBadge.color,
                        border: `1px solid ${itemBadge.border}`,
                      }}
                    >
                      <ItemBadgeIcon size={11} strokeWidth={2.2} />
                      <span>{itemBadge.text}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            COMPLETED ORDERS HISTORY
           ══════════════════════════════════════════════════════ */}
        {completedOrders.length > 0 && (
          <section className="cop-history-section">
            <h3 className="cop-history-heading">
              Lịch sử các đợt đã xong ({completedOrders.length})
            </h3>

            <div className="cop-history-stack">
              {completedOrders.map((order) => (
                <div key={order.id} className="cop-history-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CheckCircle2 size={16} color="#16a34a" />
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>
                        {order.order_number}
                      </strong>
                      <span style={{ fontSize: '0.74rem', color: '#64748b', marginLeft: '8px' }}>
                        · {order.placed_at} ({order.items.length} món)
                      </span>
                    </div>
                  </div>

                  <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                    {order.total_amount.toLocaleString('vi-VN')}đ
                  </strong>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════
            CANCELLED ORDERS ARCHIVE
           ══════════════════════════════════════════════════════ */}
        {cancelledOrders.length > 0 && (
          <section className="cop-history-section">
            <h3 className="cop-history-heading" style={{ color: '#dc2626' }}>
              <XCircle size={15} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
              Đơn đã bị hủy ({cancelledOrders.length})
            </h3>

            <div className="cop-history-stack">
              {cancelledOrders.map((order) => {
                const originalEstimate = order.items.reduce((s, it) => s + it.price * it.quantity, 0);
                return (
                  <div
                    key={order.id}
                    className="cop-history-item"
                    style={{ background: '#fef2f2', borderColor: '#fecaca' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <XCircle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '0.85rem', color: '#991b1b' }}>
                            {order.order_number}
                          </strong>
                          <span
                            style={{
                              background: '#fee2e2',
                              color: '#b91c1c',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            Đã hủy bởi nhà hàng
                          </span>
                        </div>
                        <span style={{ fontSize: '0.74rem', color: '#7f1d1d' }}>
                          Đặt lúc {order.placed_at} · {order.items.length} món · Không tính tiền
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {originalEstimate > 0 && (
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                          {originalEstimate.toLocaleString('vi-VN')}đ
                        </div>
                      )}
                      <strong style={{ fontSize: '0.88rem', color: '#dc2626' }}>
                        0đ
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

      </div>

      {/* ── FLOATING EXECUTIVE BOTTOM ISLAND BAR ── */}
      {activeOrders.length > 0 && (
        <div className="cop-floating-bar-backdrop">
          <div className="cop-floating-bar">
            <div className="cop-floating-bar-summary">
              <span className="cop-floating-count">
                Tổng bàn ({totalTableDishCount} món):
              </span>
              <span className="cop-floating-amount">
                {totalTableAmount.toLocaleString('vi-VN')}đ
              </span>
            </div>

            <div className="cop-floating-actions">
              {table_session?.status?.toUpperCase() === 'PAYMENT_REQUESTED' ? (
                <>
                  <button
                    className="cop-btn-primary-action"
                    style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}
                    onClick={() => setIsPaymentModalOpen(true)}
                  >
                    <QrCode size={16} />
                    <span>Xem mã VietQR</span>
                  </button>

                  <button
                    className="cop-btn-call-waiter"
                    onClick={async () => {
                      await cancelPaymentRequest();
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Unlock size={14} strokeWidth={2.2} />
                    <span>Mở khóa gọi thêm</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="cop-btn-primary-action"
                    disabled={isProcessingPayment}
                    onClick={async () => {
                      setIsProcessingPayment(true);
                      try {
                        await requestPayment();
                        setIsPaymentModalOpen(true);
                      } finally {
                        setIsProcessingPayment(false);
                      }
                    }}
                  >
                    <CreditCard size={16} />
                    <span>{isProcessingPayment ? 'Đang gửi...' : 'Yêu cầu thanh toán'}</span>
                  </button>

                  <button
                    className="cop-btn-order-more"
                    onClick={() => navigate('/client/menu')}
                  >
                    <PlusCircle size={16} />
                    <span>Gọi thêm</span>
                  </button>

                  <button
                    className="cop-btn-call-waiter"
                    onClick={() => setIsServiceModalOpen(true)}
                  >
                    <Bell size={15} />
                    <span>Phục vụ</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PAYMENT MODAL (Đóng băng hóa đơn & Thanh toán cuối bữa) ── */}
      {isPaymentModalOpen && (
        <div className="cop-modal-overlay">
          <div className="cop-modal-card">
            {/* Modal Header */}
            <div className="cop-modal-header">
              <div>
                <h3 className="cop-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard size={18} strokeWidth={2.2} color="#0284c7" />
                  <span>Thanh toán tại bàn</span>
                </h3>
                <div className="cop-modal-subtitle">
                  {table_session?.table_no || 'Bàn ăn'} • Hóa đơn đã được chốt đóng băng
                </div>
              </div>
              <button
                className="cop-modal-close-btn"
                onClick={() => setIsPaymentModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Total Amount Box */}
            <div className="cop-modal-total-banner">
              <div className="cop-modal-total-label">
                Tổng số tiền thanh toán (Đã chốt cố định):
              </div>
              <div className="cop-modal-total-num">
                {totalTableAmount.toLocaleString('vi-VN')}đ
              </div>
              <div className="cop-modal-total-hint">
                * Hóa đơn được giữ nguyên số tiền để chuyển khoản VietQR chính xác 100%
              </div>
            </div>

            {/* Tabs Selector */}
            <div className="cop-modal-tab-selector">
              <button
                className={`cop-modal-tab-item ${paymentTab === 'vnpay' ? 'is-selected' : ''}`}
                onClick={() => setPaymentTab('vnpay')}
              >
                <QrCode size={15} color={paymentTab === 'vnpay' ? '#0284c7' : '#64748b'} />
                <span>VNPAY</span>
                <span style={{ fontSize: '0.65rem', background: '#e0f2fe', color: '#0369a1', padding: '1px 5px', borderRadius: 4, fontWeight: 800 }}>
                  Demo
                </span>
              </button>

              <button
                className={`cop-modal-tab-item ${paymentTab === 'qr' ? 'is-selected' : ''}`}
                onClick={() => setPaymentTab('qr')}
              >
                <QrCode size={15} />
                <span>VietQR</span>
              </button>

              <button
                className={`cop-modal-tab-item ${paymentTab === 'cash' ? 'is-selected' : ''}`}
                onClick={() => setPaymentTab('cash')}
              >
                <Banknote size={15} />
                <span>Tiền mặt/Thẻ POS</span>
              </button>
            </div>

            {/* Tab: VNPAY Sandbox (Thẻ & OTP Set Sẵn) */}
            {paymentTab === 'vnpay' && (
              <div>
                {(() => {
                  const targetOrderId = activeOrders[0]?.id;

                  const handlePayTableVnPay = async () => {
                    if (isPayingVnPay) return;
                    setIsPayingVnPay(true);
                    try {
                      if (targetOrderId) {
                        await processVnPayDirectPayment({
                          order_id: targetOrderId,
                          card_number: vnpayCardNumber,
                          card_holder: vnpayCardHolder,
                          payment_date: vnpayPaymentDate,
                          otp: vnpayOtp,
                        });
                      }
                      await confirmPaymentDemo('VNPAY_QR');
                      setIsPaymentModalOpen(false);
                      alert('🎉 Thanh toán VNPAY Sandbox thành công! Cảm ơn quý khách đã dùng bữa tại OmniResto.');
                    } catch (err: any) {
                      alert(err.message || 'Thanh toán VNPAY thất bại. Vui lòng thử lại!');
                    } finally {
                      setIsPayingVnPay(false);
                    }
                  };

                  return (
                    <div>
                      {/* Luxury Black Titanium Card Preview */}
                      <div className="cop-card-mockup">
                        <div className="cop-card-mockup-top">
                          <span className="cop-card-bank-name">NCB BANK</span>
                          <span className="cop-card-sandbox-pill">VNPAY SANDBOX</span>
                        </div>
                        <div className="cop-card-number-display">
                          {vnpayCardNumber.replace(/(\d{4})/g, '$1 ').trim()}
                        </div>
                        <div className="cop-card-mockup-bottom">
                          <div>
                            <div style={{ opacity: 0.65, fontSize: '0.62rem', marginBottom: 2 }}>CHỦ THẺ</div>
                            <div className="cop-card-holder-val">{vnpayCardHolder}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ opacity: 0.65, fontSize: '0.62rem', marginBottom: 2 }}>HẾT HẠN</div>
                            <div style={{ fontWeight: 800 }}>{vnpayPaymentDate}</div>
                          </div>
                        </div>
                      </div>

                      {/* Card Inputs Form (Đã SET SẴN thông tin) */}
                      <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        padding: '12px',
                        marginBottom: 14,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                            Số thẻ (Đã nhập sẵn):
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
                          <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                            Tên chủ thẻ:
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
                            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
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
                            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#0284c7', marginBottom: 4 }}>
                              OTP xác thực:
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

                      {/* Main Action Button */}
                      <button
                        type="button"
                        disabled={isPayingVnPay}
                        onClick={handlePayTableVnPay}
                        style={{
                          width: '100%', padding: '13px', borderRadius: 12,
                          background: isPayingVnPay ? '#94a3b8' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                          color: '#ffffff', fontWeight: 800, fontSize: '0.9rem',
                          cursor: isPayingVnPay ? 'not-allowed' : 'pointer', border: 'none',
                          boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)', marginBottom: 10,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        }}
                      >
                        {isPayingVnPay ? (
                          'Đang xác thực giao dịch...'
                        ) : (
                          <>
                            <Zap size={16} strokeWidth={2.4} />
                            <span>Xác nhận thanh toán VNPAY ({totalTableAmount.toLocaleString('vi-VN')}đ)</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Tab: VietQR Content */}
            {paymentTab === 'qr' && (
              <div style={{ textAlign: 'center' }}>
                {(() => {
                  const activeOrderNumber = table_session?.active_order_number || activeOrders[0]?.order_number || 'ORD-BILL';
                  const transferContent = `OMNIRESTO ${activeOrderNumber}`;
                  const qrUrl = table_session?.viet_qr?.qr_image_url ||
                    generateVietQRUrl(totalTableAmount, transferContent);

                  return (
                    <div>
                      <div
                        style={{
                          background: '#ffffff',
                          padding: '14px',
                          borderRadius: '16px',
                          display: 'inline-block',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
                          marginBottom: '16px',
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
                          padding: '14px 16px',
                          textAlign: 'left',
                          fontSize: '0.84rem',
                          marginBottom: '16px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ color: '#64748b' }}>Ngân hàng:</span>
                          <strong style={{ color: '#0f172a' }}>{table_session?.viet_qr?.bank_id || PAYMENT_CONFIG.bankName}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ color: '#64748b' }}>Số tài khoản:</span>
                          <strong style={{ color: '#0f172a' }}>{table_session?.viet_qr?.account_number || PAYMENT_CONFIG.accountNumber}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ color: '#64748b' }}>Chủ tài khoản:</span>
                          <strong style={{ color: '#0f172a' }}>{table_session?.viet_qr?.account_name || PAYMENT_CONFIG.accountName}</strong>
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
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                padding: '3px 8px',
                                cursor: 'pointer',
                                fontSize: '0.74rem',
                                color: '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 700,
                              }}
                            >
                              <Copy size={12} />
                              {isCopied ? 'Đã chép' : 'Chép'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Simulated Webhook for Demonstration */}
                      <button
                        onClick={async () => {
                          await confirmPaymentDemo('QR_CODE');
                          setIsPaymentModalOpen(false);
                          alert('🎉 Thanh toán VietQR thành công! Cảm ơn quý khách đã dùng bữa tại OmniResto.');
                        }}
                        style={{
                          width: '100%',
                          padding: '11px',
                          borderRadius: '10px',
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          color: '#047857',
                          fontWeight: 800,
                          fontSize: '0.84rem',
                          cursor: 'pointer',
                          marginBottom: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <Zap size={14} strokeWidth={2.2} />
                        <span>Giả lập: Webhook VietQR khớp tiền tự động (Test)</span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Tab: Cash / POS Card */}
            {paymentTab === 'cash' && (
              <div style={{ padding: '12px 0', textAlign: 'center' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: '#fff7ed',
                  color: '#ea580c',
                  margin: '0 auto 12px',
                  boxShadow: '0 4px 12px rgba(234, 88, 12, 0.15)',
                }}>
                  <ConciergeBell size={32} strokeWidth={1.8} />
                </div>
                <h4 style={{ margin: '0 0 8px', fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>
                  Yêu cầu đã gửi tới Quầy Thu Ngân
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6, margin: '0 0 20px' }}>
                  Nhân viên phục vụ đang in hóa đơn chi tiết và sẽ mang thiết bị quẹt thẻ POS hoặc nhận tiền mặt tại bàn của quý khách ngay.
                </p>

                <button
                  onClick={async () => {
                    await confirmPaymentDemo('CASH');
                    setIsPaymentModalOpen(false);
                    alert('✅ Nhân viên đã xác nhận thu tiền tại bàn thành công!');
                  }}
                  style={{
                    width: '100%',
                    padding: '11px',
                    borderRadius: '10px',
                    background: '#fef3c7',
                    border: '1px solid #fde68a',
                    color: '#92400e',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Banknote size={15} strokeWidth={2.2} />
                  <span>Giả lập: Nhân viên xác nhận thu tiền tại bàn (Test)</span>
                </button>
              </div>
            )}

            {/* Bottom Actions */}
            <div style={{
              borderTop: '1px solid #e2e8f0',
              paddingTop: '16px',
              marginTop: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
            }}>
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
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Unlock size={14} strokeWidth={2.2} />
                <span>Mở khóa gọi thêm món</span>
              </button>

              <button
                onClick={() => setIsPaymentModalOpen(false)}
                style={{
                  background: '#0f172a',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '10px',
                  padding: '9px 18px',
                  fontWeight: 800,
                  fontSize: '0.82rem',
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
        table_no={table_session?.table_no}
      />
    </div>
  );
};

export default ClientOrdersPage;
