import React, { useEffect } from 'react';
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useClientStore, selectTotalItems, selectTotalAmount } from '../store/clientStore';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * CartDrawer — Slide-in cart panel from right
 *
 * UX Principles:
 * - Figure-Ground: Backdrop blur + dim separates drawer from content
 * - Fitts's Law: +/- buttons 36px, CTA 52px full-width
 * - Anchoring: Total always visible in sticky footer
 * - Progressive Disclosure: Drawer → Cart page → Checkout
 * - Gestalt Proximity: Item info grouped, price right-aligned
 */
export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const navigate    = useNavigate();
  const { cart, updateQuantity, removeFromCart, selectedBranchName } = useClientStore();
  const totalItems  = useClientStore(selectTotalItems);
  const totalAmount = useClientStore(selectTotalAmount);

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleCheckout = () => {
    onClose();
    navigate('/client/cart');
  };

  return (
    <>
      {/* ── Backdrop — Figure-Ground principle ── */}
      <div
        className="cart-backdrop"
        style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(24, 16, 10, 0.45)',
          backdropFilter: 'blur(4px)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Drawer Panel ── */}
      <aside
        role="dialog"
        aria-label="Giỏ hàng của bạn"
        aria-modal="true"
        style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0,
          width: 'min(420px, 100vw)',
          zIndex: 301,
          background: 'var(--c-surface)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 40px rgba(100, 50, 20, 0.18)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          fontFamily: 'var(--c-font)',
        }}
      >
        {/* ── Drawer Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px', borderBottom: '1px solid var(--c-border-light)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShoppingBag size={20} color="var(--c-primary)" strokeWidth={2.2} />
            <div>
              <strong style={{ fontSize: '1rem', color: 'var(--c-text-main)' }}>
                Giỏ hàng
              </strong>
              {totalItems > 0 && (
                <span style={{
                  marginLeft: 8, fontSize: '0.75rem', fontWeight: 700,
                  background: 'var(--c-primary-light)', color: 'var(--c-primary)',
                  padding: '2px 8px', borderRadius: 'var(--c-r-full)',
                }}>
                  {totalItems} món
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng giỏ hàng"
            style={{
              width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--c-border)',
              background: 'var(--c-surface-warm)', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', transition: 'all var(--c-t-fast)',
              color: 'var(--c-text-muted)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--c-error-bg)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--c-error)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--c-error)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--c-surface-warm)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--c-text-muted)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--c-border)';
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Branch context */}
        {selectedBranchName && (
          <div style={{
            padding: '10px 20px', background: 'var(--c-surface-warm)',
            borderBottom: '1px solid var(--c-border-light)',
            fontSize: '0.8125rem', color: 'var(--c-text-muted)',
          }}>
            📍 Chi nhánh: <strong style={{ color: 'var(--c-text-body)' }}>{selectedBranchName}</strong>
          </div>
        )}

        {/* ── Items List ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          {cart.length === 0 ? (
            /* Empty state */
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', gap: 16,
              padding: '40px 24px', textAlign: 'center',
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'var(--c-surface-warm)', border: '2px dashed var(--c-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ShoppingBag size={32} color="var(--c-text-light)" strokeWidth={1.5} />
              </div>
              <div>
                <strong style={{ color: 'var(--c-text-main)', display: 'block', marginBottom: 6 }}>
                  Giỏ hàng trống
                </strong>
                <span style={{ fontSize: '0.875rem', color: 'var(--c-text-muted)' }}>
                  Thêm món ăn yêu thích vào giỏ nhé!
                </span>
              </div>
              <button
                className="c-btn c-btn-outline c-btn-sm"
                onClick={() => { onClose(); navigate('/client/menu'); }}
              >
                Xem thực đơn
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.menuItemId}
                style={{
                  display: 'flex', gap: 12, padding: '12px 20px',
                  borderBottom: '1px solid var(--c-border-light)',
                  transition: 'background var(--c-t-fast)',
                }}
              >
                {/* Item image */}
                <img
                  src={item.image}
                  alt={item.name}
                  style={{
                    width: 60, height: 60, borderRadius: 'var(--c-r-md)',
                    objectFit: 'cover', flexShrink: 0,
                    border: '1px solid var(--c-border-light)',
                  }}
                />

                {/* Item info — Gestalt Proximity: name+price together */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{
                    fontSize: '0.875rem', fontWeight: 700,
                    color: 'var(--c-text-main)', lineHeight: 1.3,
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {item.name}
                  </span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--c-primary)' }}>
                    {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)' }}>
                    {item.price.toLocaleString('vi-VN')}đ / món
                  </span>
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                  {/* Remove */}
                  <button
                    onClick={() => removeFromCart(item.menuItemId)}
                    aria-label={`Xóa ${item.name}`}
                    style={{
                      width: 28, height: 28, borderRadius: 6,
                      border: '1px solid var(--c-border)', background: 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: 'var(--c-text-muted)',
                      transition: 'all var(--c-t-fast)',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--c-error)';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--c-error)';
                      (e.currentTarget as HTMLButtonElement).style.background = 'var(--c-error-bg)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--c-text-muted)';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--c-border)';
                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    }}
                  >
                    <Trash2 size={13} />
                  </button>

                  {/* Quantity stepper — Fitts's Law: min 32px each */}
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    border: '1.5px solid var(--c-primary)', borderRadius: 8, overflow: 'hidden',
                  }}>
                    <button
                      onClick={() => updateQuantity(item.menuItemId, -1)}
                      aria-label="Giảm"
                      style={{
                        width: 30, height: 30, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', background: 'transparent', border: 'none',
                        cursor: 'pointer', color: 'var(--c-primary)',
                      }}
                    >
                      <Minus size={13} strokeWidth={2.5} />
                    </button>
                    <span style={{
                      width: 28, textAlign: 'center', fontSize: '0.875rem',
                      fontWeight: 800, color: 'var(--c-primary)', fontFamily: 'var(--c-font)',
                    }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.menuItemId, +1)}
                      aria-label="Tăng"
                      style={{
                        width: 30, height: 30, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', background: 'var(--c-primary)', border: 'none',
                        cursor: 'pointer', color: '#fff',
                      }}
                    >
                      <Plus size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Sticky Footer — Anchoring: total always visible ── */}
        {cart.length > 0 && (
          <div style={{
            padding: '16px 20px', borderTop: '1px solid var(--c-border)',
            background: 'var(--c-surface)', flexShrink: 0,
            boxShadow: '0 -4px 20px rgba(100,50,20,0.08)',
          }}>
            {/* Summary row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--c-text-muted)', fontWeight: 500 }}>
                Tạm tính ({totalItems} món)
              </span>
              <strong style={{ fontSize: '1.125rem', color: 'var(--c-primary)' }}>
                {totalAmount.toLocaleString('vi-VN')}đ
              </strong>
            </div>

            {/* Checkout CTA — Fitts's Law: full-width, 52px tall */}
            <button
              id="cart-checkout-btn"
              className="c-btn c-btn-primary c-btn-lg c-btn-block"
              onClick={handleCheckout}
            >
              Đặt hàng ngay
              <ArrowRight size={18} strokeWidth={2.2} />
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--c-text-muted)', marginTop: 10 }}>
              Chưa bao gồm phí giao hàng
            </p>
          </div>
        )}
      </aside>
    </>
  );
};
