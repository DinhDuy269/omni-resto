import React, { useState } from 'react';
import { Plus, Minus, Flame, ChevronRight } from 'lucide-react';
import type { MenuItem } from '../../shared/types/menu';
import { useClientStore } from '../store/clientStore';
import { ItemModifierModal } from './ItemModifierModal';

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
 * - Detail Modal: Clicking card or "Thêm" opens ItemModifierModal for customization
 */
export const MenuCard: React.FC<MenuCardProps> = ({ item, animationDelay = 0 }) => {
  const { cart, updateQuantity } = useClientStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const cartItem = cart.find((c) => (c.menu_item_id || c.id) === item.id);
  const qty = cartItem?.quantity ?? 0;
  const isStatusAvailable = item.status === 'AVAILABLE' || item.status === 'available';
  const isTimeAvailable = item.is_available_now !== false;
  const isAvailable = isStatusAvailable && isTimeAvailable;

  const openModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAvailable) return;
    setIsModalOpen(true);
  };

  return (
    <>
      <article
        className="menu-card"
        style={{ animationDelay: `${animationDelay}ms`, opacity: isAvailable ? 1 : 0.8 }}
        aria-label={item.name}
        onClick={openModal}
        role="button"
        tabIndex={isAvailable ? 0 : -1}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openModal(e as any); }}
      >
        {/* ── Food Image — Visual anchor (top of card, draws eye first) ── */}
        <div className="menu-card__img-wrap">
          <img
            src={item.image}
            alt={item.name}
            className="menu-card__img"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = '/images/food-placeholder.svg';
            }}
          />

          {/* Out-of-stock or Out-of-time overlay */}
          {!isAvailable && (
            <div className="menu-card__oos-overlay" style={{ background: !isTimeAvailable && isStatusAvailable ? 'rgba(30, 20, 10, 0.72)' : undefined }}>
              <span style={{ fontSize: '0.75rem', padding: '4px 10px', textAlign: 'center' }}>
                {!isTimeAvailable && isStatusAvailable
                  ? (item.meal_period_note ? `Chỉ bán ${item.meal_period_note}` : 'Hết giờ phục vụ')
                  : 'Tạm hết món'}
              </span>
            </div>
          )}

          {/* Social proof badge — Serial Position: shown on image for max visibility */}
          {item.is_best_seller && (
            <div className="menu-card__badge-bestseller">
              <Flame size={11} strokeWidth={2.5} />
              Bán chạy
            </div>
          )}

          {/* "Xem chi tiết" hint on hover */}
          {isAvailable && (
            <div className="menu-card__detail-hint">
              <ChevronRight size={14} strokeWidth={2.5} />
              Xem chi tiết & tuỳ chọn
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
                {item.base_price.toLocaleString('vi-VN')}
              </span>
              <span className="menu-card__price-unit">đ</span>
            </div>

            {/* CTA — Fitts's Law: min 44px, distinct orange color */}
            {qty === 0 ? (
              <button
                id={`add-to-cart-${item.id}`}
                className={`menu-card__add-btn${!isAvailable ? ' menu-card__add-btn--disabled' : ''}`}
                onClick={openModal}
                disabled={!isAvailable}
                aria-label={`Xem tuỳ chọn và thêm ${item.name} vào giỏ hàng`}
              >
                <Plus size={18} strokeWidth={2.5} />
                {isAvailable ? 'Thêm' : (!isTimeAvailable && isStatusAvailable ? 'Hết giờ' : 'Hết')}
              </button>
            ) : (
              /* Quantity stepper — shown after first add, click stops propagation */
              <div
                className="menu-card__stepper"
                role="group"
                aria-label={`Số lượng ${item.name}`}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="menu-card__step-btn"
                  onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, -1); }}
                  aria-label="Giảm số lượng"
                >
                  <Minus size={14} strokeWidth={2.5} />
                </button>
                <span className="menu-card__qty">{qty}</span>
                <button
                  className="menu-card__step-btn menu-card__step-btn--plus"
                  onClick={(e) => { e.stopPropagation(); openModal(e); }}
                  aria-label="Thêm món / tuỳ chọn"
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
            cursor: pointer;
          }
          .menu-card:hover {
            box-shadow: var(--c-shadow-md);
            transform: translateY(-3px);
          }
          .menu-card:focus-visible {
            outline: 2px solid var(--c-primary);
            outline-offset: 2px;
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
            transform: scale(1.07);
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

          /* Detail hint — appears on hover */
          .menu-card__detail-hint {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(transparent, rgba(20,10,5,0.72));
            color: #fff;
            font-size: 0.75rem;
            font-weight: 700;
            font-family: var(--c-font);
            padding: 20px 12px 10px;
            display: flex;
            align-items: center;
            gap: 4px;
            opacity: 0;
            transform: translateY(6px);
            transition: opacity var(--c-t-fast), transform var(--c-t-fast);
          }
          .menu-card:hover .menu-card__detail-hint {
            opacity: 1;
            transform: translateY(0);
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
            font-family: var(--c-font);
            font-size: 1rem;
            font-weight: 700;
            color: var(--c-text-main);
            line-height: 1.35;
            margin: 0;
          }
          .menu-card__desc {
            font-family: var(--c-font);
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
            font-family: var(--font-mono);
            font-size: 1.0625rem;
            font-weight: 700;
            color: var(--c-primary);
            font-feature-settings: 'tnum' 1;
            letter-spacing: 0.01em;
          }
          .menu-card__price-unit {
            font-family: var(--c-font);
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

      {/* Detail & Customization Modal */}
      {isModalOpen && (
        <ItemModifierModal
          item={item}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};
