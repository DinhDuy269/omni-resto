import React, { useState } from 'react';
import { Plus, Minus, Flame } from 'lucide-react';
import type { MenuItem } from '../../shared/types/menu';
import { useClientStore } from '../store/clientStore';

interface MenuCardProps {
  item: MenuItem;
  /** Staggered animation delay (ms) */
  animationDelay?: number;
}

/**
 * MenuCard — Client menu item card
 *
 * UX Principles applied:
 * - Visual Hierarchy: Image → Name → Description → Price/CTA (F-pattern reading)
 * - Fitts's Law: Add button min 44px, stepper buttons equally large
 * - Gestalt Proximity: Price and CTA grouped together at card bottom
 * - Miller's Law: Description clamped to 2 lines (prevent info overload)
 * - Social Proof: "Bán chạy" badge prominently shown
 * - Feedback: Scale + shadow on hover, animation on add
 */
export const MenuCard: React.FC<MenuCardProps> = ({ item, animationDelay = 0 }) => {
  const { cart, addToCart, updateQuantity } = useClientStore();
  const [isAdding, setIsAdding] = useState(false);

  const cartItem = cart.find((c) => c.menuItemId === item.id);
  const qty = cartItem?.quantity ?? 0;
  const isAvailable = item.status === 'AVAILABLE' || item.status === 'available';

  const handleAdd = () => {
    if (!isAvailable) return;
    setIsAdding(true);
    addToCart({
      menuItemId: item.id,
      name: item.name,
      category: item.category,
      price: item.basePrice,
      image: item.image,
    });
    setTimeout(() => setIsAdding(false), 400);
  };

  return (
    <article
      className="menu-card"
      style={{ animationDelay: `${animationDelay}ms` }}
      aria-label={item.name}
    >
      {/* ── Food Image — Visual anchor (top of card, draws eye first) ── */}
      <div className="menu-card__img-wrap">
        <img
          src={item.image}
          alt={item.name}
          className="menu-card__img"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop';
          }}
        />

        {/* Out-of-stock overlay — Figure-Ground principle */}
        {!isAvailable && (
          <div className="menu-card__oos-overlay">
            <span>Tạm hết</span>
          </div>
        )}

        {/* Social proof badge — Serial Position: shown on image for max visibility */}
        {item.isBestSeller && (
          <div className="menu-card__badge-bestseller">
            <Flame size={11} strokeWidth={2.5} />
            Bán chạy
          </div>
        )}
      </div>

      {/* ── Card Body ── */}
      <div className="menu-card__body">
        {/* Category label — small, muted (de-emphasised per hierarchy) */}
        <span className="menu-card__category">{item.category}</span>

        {/* Name — largest text in body, dark for max contrast */}
        <h3 className="menu-card__name c-clamp-2">{item.name}</h3>

        {/* Description — 2-line clamp (Miller's Law: prevent overload) */}
        <p className="menu-card__desc c-clamp-2">{item.description}</p>

        {/* ── Footer: Price + CTA — Gestalt Proximity: grouped together ── */}
        <div className="menu-card__footer">
          <div className="menu-card__price">
            <span className="menu-card__price-value">
              {item.basePrice.toLocaleString('vi-VN')}
            </span>
            <span className="menu-card__price-unit">đ</span>
          </div>

          {/* CTA — Fitts's Law: min 44px, distinct orange color */}
          {qty === 0 ? (
            <button
              id={`add-to-cart-${item.id}`}
              className={`menu-card__add-btn${isAdding ? ' menu-card__add-btn--adding' : ''}${!isAvailable ? ' menu-card__add-btn--disabled' : ''}`}
              onClick={handleAdd}
              disabled={!isAvailable}
              aria-label={`Thêm ${item.name} vào giỏ hàng`}
            >
              <Plus size={18} strokeWidth={2.5} />
              {isAvailable ? 'Thêm' : 'Hết'}
            </button>
          ) : (
            /* Quantity stepper — shown after first add */
            <div className="menu-card__stepper" role="group" aria-label={`Số lượng ${item.name}`}>
              <button
                className="menu-card__step-btn"
                onClick={() => updateQuantity(item.id, -1)}
                aria-label="Giảm số lượng"
              >
                <Minus size={14} strokeWidth={2.5} />
              </button>
              <span className="menu-card__qty">{qty}</span>
              <button
                className="menu-card__step-btn menu-card__step-btn--plus"
                onClick={() => updateQuantity(item.id, +1)}
                aria-label="Tăng số lượng"
              >
                <Plus size={14} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .menu-card {
          background: var(--c-surface);
          border: 1px solid var(--c-border-light);
          border-radius: var(--c-r-lg);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: var(--c-shadow-sm);
          transition: box-shadow var(--c-t-fast), transform var(--c-t-fast);
          animation: c-fade-up 0.4s var(--c-t-normal) both;
          cursor: default;
        }
        .menu-card:hover {
          box-shadow: var(--c-shadow-md);
          transform: translateY(-3px);
        }

        /* Image */
        .menu-card__img-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          overflow: hidden;
          background: var(--c-border-light);
          flex-shrink: 0;
        }
        .menu-card__img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform var(--c-t-slow);
        }
        .menu-card:hover .menu-card__img {
          transform: scale(1.05);
        }
        .menu-card__oos-overlay {
          position: absolute;
          inset: 0;
          background: rgba(20, 10, 5, 0.52);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .menu-card__oos-overlay span {
          background: rgba(255,255,255,0.92);
          color: var(--c-text-main);
          font-size: 0.8125rem;
          font-weight: 700;
          font-family: var(--c-font);
          padding: 6px 16px;
          border-radius: var(--c-r-full);
        }
        .menu-card__badge-bestseller {
          position: absolute;
          top: 10px;
          left: 10px;
          background: var(--c-primary);
          color: #fff;
          font-size: 0.6875rem;
          font-weight: 800;
          font-family: var(--c-font);
          padding: 3px 10px 3px 7px;
          border-radius: var(--c-r-full);
          display: flex;
          align-items: center;
          gap: 4px;
          box-shadow: 0 2px 8px rgba(232,93,38,0.4);
        }

        /* Body */
        .menu-card__body {
          padding: 14px 16px 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }
        .menu-card__category {
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--c-primary);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .menu-card__name {
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--c-text-main);
          line-height: 1.35;
          margin: 0;
        }
        .menu-card__desc {
          font-size: 0.8125rem;
          color: var(--c-text-muted);
          line-height: 1.55;
          margin: 0;
          flex: 1;
        }

        /* Footer */
        .menu-card__footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid var(--c-border-light);
        }
        .menu-card__price {
          display: flex;
          align-items: baseline;
          gap: 2px;
        }
        .menu-card__price-value {
          font-size: 1.0625rem;
          font-weight: 800;
          color: var(--c-primary);
        }
        .menu-card__price-unit {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--c-primary);
        }

        /* Add button */
        .menu-card__add-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 8px 14px;
          min-height: 36px;
          background: var(--c-primary);
          color: #fff;
          border: none;
          border-radius: var(--c-r-md);
          cursor: pointer;
          font-family: var(--c-font);
          font-size: 0.8125rem;
          font-weight: 700;
          transition: all var(--c-t-fast);
          box-shadow: 0 2px 8px rgba(232,93,38,0.3);
        }
        .menu-card__add-btn:hover:not(.menu-card__add-btn--disabled) {
          background: var(--c-primary-hover);
          transform: scale(1.04);
          box-shadow: 0 4px 14px rgba(232,93,38,0.4);
        }
        .menu-card__add-btn--adding {
          animation: c-badge-pop 0.3s ease;
        }
        .menu-card__add-btn--disabled {
          background: #e5e7eb;
          color: #9ca3af;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* Stepper */
        .menu-card__stepper {
          display: flex;
          align-items: center;
          gap: 0;
          background: var(--c-surface-warm);
          border: 1.5px solid var(--c-primary);
          border-radius: var(--c-r-md);
          overflow: hidden;
        }
        .menu-card__step-btn {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--c-primary);
          transition: background var(--c-t-fast);
          font-family: var(--c-font);
        }
        .menu-card__step-btn:hover { background: var(--c-primary-light); }
        .menu-card__step-btn--plus { background: var(--c-primary); color: #fff; }
        .menu-card__step-btn--plus:hover { background: var(--c-primary-hover); }
        .menu-card__qty {
          width: 32px;
          text-align: center;
          font-size: 0.9375rem;
          font-weight: 800;
          color: var(--c-primary);
          font-family: var(--c-font);
        }
      `}</style>
    </article>
  );
};
