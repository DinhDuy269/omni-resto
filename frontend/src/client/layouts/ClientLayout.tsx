import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShoppingCart, MapPin, UtensilsCrossed, LogIn, UserPlus } from 'lucide-react'; // [SỬA] thêm UserPlus cho nút Đăng ký
import { useClientStore, selectTotalItems, selectTotalAmount } from '../store/clientStore';
import { CartDrawer } from '../components/CartDrawer';
import './ClientLayout.css';

export const ClientLayout: React.FC = () => {
  const { selectedBranchName, isCartOpen, openCart, closeCart } = useClientStore();
  const totalItems  = useClientStore(selectTotalItems);
  const totalAmount = useClientStore(selectTotalAmount);

  return (
    <div className="client-layout client-scope">
      {/* ── Sticky Header ── */}
      <header className="client-header">
        <div className="client-header-inner">
          {/* Logo — Z-Pattern: điểm neo ánh nhìn top-left */}
          <Link to="/client" className="client-logo" aria-label="OmniResto - Trang chủ">
            <UtensilsCrossed size={22} strokeWidth={2.5} />
            OmniResto
          </Link>

          {/* Branch context — middle anchor */}
          {selectedBranchName && (
            <div className="client-branch-badge" title={selectedBranchName}>
              <MapPin size={13} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedBranchName}</span>
            </div>
          )}

          <div className="client-header-actions">
            {/* Cart — Fitts's Law: large, right-aligned CTA */}
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

            {/* Nút Đăng ký, nằm bên phải nút giỏ hàng */}
            <Link to="/register" className="client-auth-btn">
              <UserPlus size={17} strokeWidth={2.2} />
              <span>Đăng ký</span>
            </Link>

            {/* Nút Đăng nhập */}
            <Link to="/login" className="client-auth-btn">
              <LogIn size={17} strokeWidth={2.2} />
              <span>Đăng nhập</span>
            </Link>
          </div>
        </div>
      </header>
      {/* [XÓA] đã bỏ đoạn </div></div></header> bị thừa ở đây */}

      {/* ── Main Content (Outlet) ── */}
      <main className="client-main">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="client-footer">
        <div className="client-footer-inner">
          <div className="client-footer-brand">
            <UtensilsCrossed size={17} />
            OmniResto
          </div>
          <p>© 2025 OmniResto · Hương Vị Đích Thực Việt Nam</p>
        </div>
      </footer>

      {/* ── Cart Drawer (Slide-in from right) ── */}
      <CartDrawer isOpen={isCartOpen} onClose={closeCart} />
    </div>
  );
};