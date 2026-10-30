import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, Clock, Flame, Bell, UtensilsCrossed, X } from 'lucide-react';
import { useClientStore } from '../store/clientStore';
import './ClientActiveOrderBar.css';

export const ClientActiveOrderBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const orders = useClientStore((s) => s.orders);
  const table_session = useClientStore((s) => s.table_session);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Lọc tất cả đơn hàng đang hoạt động (chưa hoàn thành và chưa bị hủy)
  const activeOrders = orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');

  // Không hiển thị nếu không có đơn nào đang hoạt động, người dùng đã tắt hoặc đang ở trang danh sách đơn
  if (activeOrders.length === 0 || isDismissed) return null;
  if (location.pathname === '/client/orders') return null;

  // Tính toán tổng số lượng món ăn (không tính món đã hủy)
  const totalDishesCount = activeOrders.reduce(
    (sum, o) => sum + o.items.filter((it) => it.status !== 'cancelled').reduce((s, it) => s + (it.quantity || 1), 0),
    0
  );
  const currentTable = table_session?.table_no || activeOrders[0]?.table_no;

  // Xác định trạng thái tổng thể của các món
  const hasReady = activeOrders.some((o) => o.status === 'ready');
  const hasPreparing = activeOrders.some((o) => o.status === 'preparing');

  const getStatusConfig = () => {
    if (hasReady) {
      return {
        type: 'ready',
        label: 'Món sẵn sàng!',
        badgeClass: 'omni-order-mini-icon--ready',
        icon: <Bell size={16} strokeWidth={2.4} />,
      };
    }
    if (hasPreparing) {
      return {
        type: 'preparing',
        label: 'Bếp đang nấu',
        badgeClass: 'omni-order-mini-icon--preparing',
        icon: <Flame size={16} strokeWidth={2.4} />,
      };
    }
    return {
      type: 'pending',
      label: 'Đã nhận đơn',
      badgeClass: 'omni-order-mini-icon--pending',
      icon: <Clock size={16} strokeWidth={2.4} />,
    };
  };

  const statusConfig = getStatusConfig();

  return (
    <aside
      className={`omni-order-left-dock${isHovered ? ' omni-order-left-dock--expanded' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Theo dõi tiến độ món ăn trực tiếp"
    >
      <div
        className="omni-order-left-pill"
        onClick={() => navigate('/client/orders')}
        title="Nhấn để xem chi tiết tiến độ từng món"
      >
        {/* Radar Icon Badge */}
        <div className={`omni-order-mini-icon ${statusConfig.badgeClass}`}>
          <div className="omni-order-mini-pulse" />
          {statusConfig.icon}
        </div>

        {/* Thông tin siêu rút gọn (Luôn hiển thị) */}
        <div className="omni-order-mini-info">
          <span className="omni-order-mini-count">{totalDishesCount} món</span>
          {currentTable && (
            <span className="omni-order-mini-table">Bàn {currentTable}</span>
          )}
        </div>

        {/* Vùng mở rộng khi Hover / Chạm (Progressive Disclosure) */}
        <div className="omni-order-expanded-zone">
          <span className="omni-order-expanded-label">{statusConfig.label}</span>
          <button
            type="button"
            className="omni-order-mini-cta"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/client/orders');
            }}
          >
            <UtensilsCrossed size={12} strokeWidth={2.4} />
            <span>Tiến độ</span>
            <ChevronRight size={13} strokeWidth={2.4} />
          </button>
        </div>

        {/* Nút tạm ẩn */}
        <button
          type="button"
          className="omni-order-mini-dismiss"
          onClick={(e) => {
            e.stopPropagation();
            setIsDismissed(true);
          }}
          title="Tạm ẩn thanh theo dõi"
          aria-label="Tạm ẩn thanh theo dõi đơn hàng"
        >
          <X size={13} strokeWidth={2.2} />
        </button>
      </div>
    </aside>
  );
};

export default ClientActiveOrderBar;
