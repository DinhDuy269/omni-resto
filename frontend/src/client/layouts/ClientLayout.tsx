import React, { useState, useEffect } from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom';
import { ShoppingCart, UtensilsCrossed, LogIn, LogOut, Menu, X } from 'lucide-react';
import { useClientStore, selectTotalItems, selectTotalAmount, selectHasActiveOrders } from '../store/clientStore';
import { CartDrawer } from '../components/CartDrawer';
import { ClientActiveOrderBar } from '../components/ClientActiveOrderBar';
import { ClientAiChatWidget } from '../components/chat/ClientAiChatWidget';
import { ClientGachaFloatingButton } from '../components/ClientGachaFloatingButton';
import { useWebSocket } from '../../shared/hooks/useWebSocket';
import { ErrorBoundary } from '../../shared/components/ErrorBoundary';
import { ClientFooter } from '../components/ClientFooter';
import { HandGestureWidget } from '../../shared/handGesture';
import './ClientLayout.css';

const NAV_LINKS = [
  { to: '/client/menu',        label: 'Thực đơn' },
  { to: '/client/orders',      label: 'Đơn hàng' },
  { to: '/client/reservation', label: 'Đặt bàn' },
  { to: '/client/gacha',       label: 'Vòng quay' },
  { to: '/client/about',       label: 'Giới thiệu' },
];

// ─── Layout Component ────────────────────────────────────────────────────────

// Helper lấy chữ cái đầu tên người dùng để tạo avatar monogram sang trọng
const getInitials = (name?: string) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const ClientLayout: React.FC = () => {
  const { is_cart_open, openCart, closeCart, table_session, handleServerOrderEvent } = useClientStore();
  const totalItems  = useClientStore(selectTotalItems);
  const totalAmount = useClientStore(selectTotalAmount);
  const hasActiveOrder = useClientStore(selectHasActiveOrders);

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [customer, setCustomer] = useState<{
    fullName?: string;
    full_name?: string;
    phone?: string;
    memberTier?: string;
    member_tier?: string;
  } | null>(() => {
    try {
      const raw = localStorage.getItem('customer');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('customer');
    setCustomer(null);
    window.location.reload();
  };

  // Lắng nghe sự kiện cập nhật trạng thái đơn hàng thời gian thực từ Server (Admin duyệt, bếp nấu, hoàn tất)
  useWebSocket((event) => {
    if (event?.order) {
      handleServerOrderEvent(event.order);
    }
  });

  return (
    <div className="client-layout client-scope">
      {/* ── Sticky Luxury Header ── */}
      <header className={`client-header${isScrolled ? ' client-header--scrolled' : ''}`}>
        <div className="client-header-container">
          {/* Left Zone: Brand Emblem & Identity */}
          <Link to="/client" className="client-brand" aria-label="OmniResto - Trang chủ">
            <div className="client-brand-emblem">
              <UtensilsCrossed size={20} strokeWidth={2.4} />
            </div>
            <div className="client-brand-text">
              <span className="client-brand-name">OmniResto</span>
              <span className="client-brand-tag">FINE DINING</span>
            </div>
          </Link>

          {/* Center Zone: Floating Glass Nav Dock (Desktop) */}
          <nav className="client-header-nav" aria-label="Điều hướng chính">
            <div className="client-nav-dock">
              {NAV_LINKS.map((link) => {
                const isOrderLink = link.to === '/client/orders';
                const showDot = isOrderLink && hasActiveOrder;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `client-nav-link${isActive ? ' active' : ''}`
                    }
                  >
                    <span>{link.label}</span>
                    {showDot && (
                      <span
                        className="client-nav-beacon"
                        title="Có đơn hàng đang chuẩn bị"
                      />
                    )}
                  </NavLink>
                );
              })}
            </div>
          </nav>

          {/* Right Zone: Interactive Action Cluster */}
          <div className="client-header-actions">
            {/* Table Session Beacon */}
            {table_session && (
              <div
                className="client-table-pill"
                title={`Đang phục vụ tại Bàn ${table_session.table_no}`}
              >
                <span className="client-beacon-live" />
                <span>Bàn {table_session.table_no}</span>
              </div>
            )}

            {/* Cart Trigger */}
            <button
              id="client-cart-button"
              className={`client-cart-btn${totalItems > 0 ? ' client-cart-btn--active' : ''}`}
              onClick={openCart}
              aria-label={`Xem giỏ hàng (${totalItems} món)`}
            >
              <ShoppingCart size={18} strokeWidth={2.2} />
              {totalItems > 0 ? (
                <>
                  <span className="client-cart-amount">
                    {totalAmount.toLocaleString('vi-VN')}đ
                  </span>
                  <span className="client-cart-badge" aria-label={`${totalItems} món`}>
                    {totalItems}
                  </span>
                </>
              ) : (
                <span className="client-cart-label">Giỏ hàng</span>
              )}
            </button>

            {/* User Account / Login CTA (Góc ngoài cùng bên phải) */}
            {customer ? (
              <div
                className="client-member-pill"
                title={`Tài khoản: ${customer.fullName || customer.full_name || customer.phone}`}
              >
                <div className="client-member-avatar">
                  {getInitials(customer.fullName || customer.full_name || customer.phone)}
                </div>
                <div className="client-member-info">
                  <span className="client-member-name">
                    {customer.fullName || customer.full_name || customer.phone || 'Thành viên'}
                  </span>
                  <span className="client-member-tier">
                    {customer.memberTier || customer.member_tier || 'Hội viên'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="client-member-logout"
                  title="Đăng xuất tài khoản"
                  aria-label="Đăng xuất"
                >
                  <LogOut size={14} strokeWidth={2.2} />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                id="header-login-btn"
                className="client-login-cta"
                title="Đăng nhập tài khoản thành viên"
              >
                <LogIn size={16} strokeWidth={2.2} />
                <span>Đăng nhập</span>
              </Link>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              className="client-mobile-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown Drawer */}
        {isMobileMenuOpen && (
          <div className="client-mobile-drawer">
            <div className="client-mobile-drawer-nav">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `client-mobile-link${isActive ? ' active' : ''}`
                  }
                >
                  <span>{link.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ── Main Content ── */}
      <main className="client-main">
        <ErrorBoundary fallbackTitle="Không thể tải nội dung trang">
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* ── Universal Luxury Footer ── */}
      <ClientFooter />

      {/* ── Cart Drawer ── */}
      <CartDrawer isOpen={is_cart_open} onClose={closeCart} />

      {/* ── Floating Live-Tracker Pill ── */}
      <ClientActiveOrderBar />

      {/* ── OmniBot AI Culinary Assistant Widget ── */}
      <ClientAiChatWidget />

      {/* ── Floating Gacha Minigame Launcher ── */}
      <ClientGachaFloatingButton />

      {/* ── AI Hand Gesture Navigation Controller (Phương án A + B) ── */}
      <HandGestureWidget />
    </div>
  );
};