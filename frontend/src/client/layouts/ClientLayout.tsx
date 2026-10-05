import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, MapPin, UtensilsCrossed, User, LogOut, ChevronDown } from 'lucide-react';
import { useClientStore, selectTotalItems, selectTotalAmount } from '../store/clientStore';
import { CartDrawer } from '../components/CartDrawer';
import './ClientLayout.css';

interface ClientUser {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
}

export const ClientLayout: React.FC = () => {
  const navigate = useNavigate();
  const { selectedBranchName, isCartOpen, openCart, closeCart } = useClientStore();
  const totalItems = useClientStore(selectTotalItems);
  const totalAmount = useClientStore(selectTotalAmount);

  // Đọc thông tin phiên đăng nhập từ localStorage
  const [currentUser, setCurrentUser] = useState<ClientUser | null>(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? (JSON.parse(savedUser) as ClientUser) : null;
    } catch {
      return null;
    }
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Xử lý Đăng xuất
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    setIsDropdownOpen(false);
    navigate('/client');
  };

  const displayName = currentUser?.fullName || currentUser?.name || currentUser?.phone || 'Khách hàng';

  return (
    <div className="client-layout">
      {/* ── Sticky Header ── */}
      <header className="client-header">
        <div className="client-header-inner">
          {/* Cụm Trái: Logo + Chi nhánh */}
          <div className="client-header-left">
            <Link to="/client" className="client-logo">
              <span className="client-logo-icon">
                <UtensilsCrossed size={20} strokeWidth={2.4} />
              </span>
              <span className="client-logo-text">OmniResto</span>
            </Link>

            {selectedBranchName && (
              <div className="client-branch-pill" title={selectedBranchName}>
                <MapPin size={13} />
                <span>{selectedBranchName}</span>
              </div>
            )}
          </div>

          {/* Cụm Phải: Giỏ hàng + Tài khoản */}
          <div className="client-header-right">
            {/* Nút Giỏ Hàng */}
            <button
              type="button"
              className={`client-cart-pill ${totalItems > 0 ? 'client-cart-pill--active' : ''}`}
              onClick={openCart}
            >
              <ShoppingCart size={18} strokeWidth={2.2} />
              {totalItems > 0 ? (
                <>
                  <span className="client-cart-price">{totalAmount.toLocaleString('vi-VN')}đ</span>
                  <span className="client-cart-badge">{totalItems}</span>
                </>
              ) : (
                <span className="client-cart-label">Giỏ hàng</span>
              )}
            </button>

            {/* Tài Khoản / Nút Đăng nhập */}
            {currentUser ? (
              <div className="client-user-wrapper" ref={dropdownRef}>
                <button
                  type="button"
                  className={`client-user-trigger ${isDropdownOpen ? 'client-user-trigger--active' : ''}`}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <div className="client-user-avatar">
                    <User size={15} strokeWidth={2.4} />
                  </div>
                  <span className="client-user-label">{displayName}</span>
                  <ChevronDown
                    size={14}
                    className={`client-chevron ${isDropdownOpen ? 'client-chevron--open' : ''}`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="client-menu-dropdown">
                    <div className="client-menu-header">
                      <p className="client-menu-name">{displayName}</p>
                      <p className="client-menu-sub">
                        {currentUser.email || currentUser.phone || 'Hội viên OmniResto'}
                      </p>
                    </div>
                    <div className="client-menu-divider" />
                    <button
                      type="button"
                      className="client-menu-logout"
                      onClick={handleLogout}
                    >
                      <LogOut size={15} />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="client-auth-link">
                <User size={16} strokeWidth={2.2} />
                <span>Đăng ký / Đăng nhập</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Nội Dung Trang ── */}
      <main className="client-main">
        <Outlet />
      </main>

      {/* ── Chân Trang ── */}
      <footer className="client-footer">
        <div className="client-footer-inner">
          <div className="client-footer-brand">
            <UtensilsCrossed size={16} />
            <span>OmniResto</span>
          </div>
          <p>© 2026 OmniResto · Hệ thống F&B Ẩm Thực Việt</p>
        </div>
      </footer>

      {/* Giỏ Hàng Trượt (Cart Drawer) */}
      <CartDrawer isOpen={isCartOpen} onClose={closeCart} />
    </div>
  );
};