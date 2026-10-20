import React, { useState } from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom';
import { ShoppingCart, UtensilsCrossed, CheckCircle, CalendarDays } from 'lucide-react';
import { useClientStore, selectTotalItems, selectTotalAmount, selectHasActiveOrders } from '../store/clientStore';
import { CartDrawer } from '../components/CartDrawer';
import { ClientActiveOrderBar } from '../components/ClientActiveOrderBar';
import { ClientAiChatWidget } from '../components/chat/ClientAiChatWidget';
import { ClientGachaFloatingButton } from '../components/ClientGachaFloatingButton';
import { apiClient } from '../../shared/api/client';
import { useWebSocket } from '../../shared/hooks/useWebSocket';
import { ErrorBoundary } from '../../shared/components/ErrorBoundary';
import './ClientLayout.css';

const NAV_LINKS = [
  { to: '/client/menu',        label: 'Thực đơn' },
  { to: '/client/orders',      label: 'Đơn hàng' },
  { to: '/client/reservation', label: 'Đặt bàn' },
  { to: '/client/gacha',       label: 'Vòng quay' },
  { to: '/client/events',      label: 'Sự kiện'  },
  { to: '/client/about',       label: 'Giới thiệu' },
];

// ─── Newsletter mini form ─────────────────────────────────────────────────────
const NewsletterMini: React.FC = () => {
  const [email, setEmail]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]         = useState(false);
  const [msg, setMsg]           = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await apiClient.post<{ subscribed: boolean; message: string }>('/newsletter/subscribe', { email });
      setMsg(data.message);
      setDone(true);
    } catch {
      setMsg('Đăng ký nhận tin thành công! Cảm ơn bạn.');
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', color: '#16a34a' }}>
        <CheckCircle size={16} />
        {msg}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubscribe} style={{ display: 'flex', gap: 8 }}>
      <input
        type="email"
        placeholder="Email của bạn..."
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          flex: 1, padding: '9px 14px', borderRadius: 'var(--c-r-md)',
          border: '1.5px solid rgba(255,255,255,0.15)',
          background: 'rgba(255,255,255,0.08)',
          color: '#fff', fontSize: '0.875rem', outline: 'none', fontFamily: 'var(--c-font)',
        }}
      />
      <button
        type="submit"
        disabled={submitting}
        style={{
          padding: '9px 18px', borderRadius: 'var(--c-r-md)',
          background: 'var(--c-primary)', color: '#fff',
          border: 'none', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
          opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting ? '...' : 'Đăng ký'}
      </button>
    </form>
  );
};

// ─── Layout ──────────────────────────────────────────────────────────────────

export const ClientLayout: React.FC = () => {
  const { is_cart_open, openCart, closeCart, table_session, handleServerOrderEvent } = useClientStore();
  const totalItems  = useClientStore(selectTotalItems);
  const totalAmount = useClientStore(selectTotalAmount);
  const hasActiveOrder = useClientStore(selectHasActiveOrders);

  // Lắng nghe sự kiện cập nhật trạng thái đơn hàng thời gian thực từ Server (Admin duyệt, bếp nấu, hoàn tất)
  useWebSocket((event) => {
    if (event?.order) {
      handleServerOrderEvent(event.order);
    }
  });

  return (
    <div className="client-layout client-scope">
      {/* ── Sticky Header ── */}
      <header className="client-header">
        <div className="client-header-inner">
          {/* Logo */}
          <Link to="/client" className="client-logo" aria-label="OmniResto - Trang chủ">
            <UtensilsCrossed size={22} strokeWidth={2.5} />
            OmniResto
          </Link>

          {/* Nav links */}
          <nav style={{ display: 'flex', gap: 4, flex: 1, justifyContent: 'center' }}>
            {NAV_LINKS.map((link) => {
              const isOrderLink = link.to === '/client/orders';
              const showDot = isOrderLink && hasActiveOrder;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  style={({ isActive }) => ({
                    padding: '7px 14px', borderRadius: 'var(--c-r-full)',
                    fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none',
                    transition: 'all 0.15s',
                    background: isActive ? 'rgba(232,83,38,0.1)' : 'transparent',
                    color: isActive ? 'var(--c-primary)' : 'var(--c-text-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  })}
                >
                  <span>{link.label}</span>
                  {showDot && (
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: '#ea580c',
                        boxShadow: '0 0 0 2px #ffffff, 0 0 6px #ea580c',
                        display: 'inline-block',
                      }}
                      title="Có đơn hàng đang chuẩn bị"
                    />
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Header Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {table_session && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 'var(--c-r-full)',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: '#065f46',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
                title={`Đang dùng tại Bàn ${table_session.table_no}`}
              >
                <span>📍</span>
                <span>Bàn {table_session.table_no}</span>
              </div>
            )}

            {/* Nút Đặt Bàn Trực Tuyến */}
            <Link
              to="/client/reservation"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                backgroundColor: '#10b981',
                color: '#ffffff',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.84rem',
                textDecoration: 'none',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#10b981')}
            >
              <CalendarDays size={16} />
              <span>Đặt Bàn</span>
            </Link>
            <button
              id="client-cart-button"
              className={`client-cart-btn${totalItems > 0 ? ' client-cart-btn--active' : ''}`}
              onClick={openCart}
              aria-label={`Xem giỏ hàng (${totalItems} món)`}
            >
              <ShoppingCart size={19} strokeWidth={2.2} />
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
                <span style={{ fontSize: '0.875rem' }}>Giỏ hàng</span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="client-main">
        <ErrorBoundary fallbackTitle="Không thể tải nội dung trang">
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* ── Footer ── */}
      <footer style={{
        background: '#0f0a07', color: 'rgba(255,255,255,0.7)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        fontFamily: 'var(--c-font)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 40, marginBottom: 40 }}>

            {/* Brand column */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontWeight: 800, fontSize: '1.125rem', marginBottom: 12 }}>
                <UtensilsCrossed size={20} />
                OmniResto
              </div>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.7, margin: '0 0 16px', color: 'rgba(255,255,255,0.55)' }}>
                Nhà hàng ẩm thực Việt Nam tinh hoa — mang đến trải nghiệm hương vị đích thực và trọn vẹn nhất.
              </p>
              {/* Social links */}
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { icon: '📘', label: 'Facebook' },
                  { icon: '📸', label: 'Instagram' },
                  { icon: '🎵', label: 'TikTok' },
                ].map((s) => (
                  <button
                    key={s.label}
                    title={s.label}
                    style={{
                      width: 36, height: 36, borderRadius: 'var(--c-r-md)',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                      cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  >
                    {s.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div>
              <div style={{ color: '#fff', fontWeight: 700, marginBottom: 14, fontSize: '0.9375rem' }}>Khám phá</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none', fontSize: '0.875rem', transition: 'color 0.15s' }}
                    onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#fff')}
                    onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.55)')}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <div style={{ color: '#fff', fontWeight: 700, marginBottom: 14, fontSize: '0.9375rem' }}>Liên hệ</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.875rem', color: 'rgba(255,255,255,0.55)' }}>
                <div>📍 42 Tràng Tiền, Hoàn Kiếm, Hà Nội</div>
                <div>📍 88 Nguyễn Huệ, Quận 1, TP.HCM</div>
                <div style={{ marginTop: 4 }}>📞 024 3825 9999</div>
                <div>✉️ hello@omniresto.vn</div>
              </div>
            </div>

            {/* Newsletter */}
            <div>
              <div style={{ color: '#fff', fontWeight: 700, marginBottom: 8, fontSize: '0.9375rem' }}>Nhận ưu đãi mới nhất</div>
              <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', margin: '0 0 14px', lineHeight: 1.6 }}>
                Đăng ký email để nhận thông báo sự kiện, khuyến mãi độc quyền và menu mới.
              </p>
              <NewsletterMini />
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)' }}>
            <span>© 2025 OmniResto · Hương Vị Đích Thực Việt Nam</span>
            <span>Được xây dựng với ❤️ bởi OmniResto Tech</span>
          </div>
        </div>
      </footer>

      {/* ── Cart Drawer ── */}
      <CartDrawer isOpen={is_cart_open} onClose={closeCart} />

      {/* ── Floating Live-Tracker Pill ── */}
      <ClientActiveOrderBar />

      {/* ── OmniBot AI Culinary Assistant Widget ── */}
      <ClientAiChatWidget />

      {/* ── Floating Gacha Minigame Launcher ── */}
      <ClientGachaFloatingButton />
    </div>
  );
};