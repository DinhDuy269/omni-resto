import React, { useState } from 'react';
import { Plus, Check, UtensilsCrossed, Leaf, Flame, Clock } from 'lucide-react';
import type { ChatRecommendedDish } from '../../types/chat';
import { useClientStore } from '../../store/clientStore';
import { checkIsItemAvailableNow, getMealPeriodDescription } from '../../utils/mealPeriodUtils';

interface Props {
  dish: ChatRecommendedDish;
}

export const RecommendedDishCard: React.FC<Props> = ({ dish }) => {
  const [added, setAdded] = useState(false);
  const addToCart = useClientStore((state) => state.addToCart);

  const isAvailable = checkIsItemAvailableNow({
    meal_periods: dish.meal_periods || dish.mealPeriods,
    is_available_now: dish.available_now !== undefined ? dish.available_now : dish.availableNow,
    category: dish.category,
  });

  const periodNote =
    dish.meal_period_note ||
    dish.mealPeriodNote ||
    getMealPeriodDescription(dish.meal_periods || dish.mealPeriods);

  const handleAddToCart = () => {
    if (!isAvailable) {
      alert(`⚠️ Rất tiếc, món "${dish.name}" chưa được mở bán. Quý khách vui lòng quay lại vào giờ ${periodNote} nhé!`);
      return;
    }

    addToCart(
      {
        menu_item_id: dish.id,
        name: dish.name,
        category: dish.category,
        price: dish.price,
        image: dish.image_url || '',
        meal_periods: dish.meal_periods || dish.mealPeriods,
        is_available_now: isAvailable,
      },
      1
    );

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: !isAvailable ? '1px solid #fed7aa' : '1px solid #e2e8f0',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginTop: '8px',
        boxShadow: !isAvailable ? '0 1px 4px rgba(234, 88, 12, 0.05)' : '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        {/* Ảnh món */}
        {dish.image_url ? (
        <img
          src={dish.image_url}
          alt={dish.name}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = '/images/food-placeholder.svg';
          }}
          style={{
            width: 60,
            height: 60,
            borderRadius: '8px',
            objectFit: 'cover',
            flexShrink: 0,
            border: '1px solid #f1f5f9',
          }}
        />
      ) : (
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
            border: '1px solid #fde68a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <UtensilsCrossed size={22} style={{ color: '#d97706' }} />
        </div>
      )}

      {/* Thông tin món */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: '0.875rem',
            color: '#0f172a',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={dish.name}
        >
          {dish.name}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontWeight: 800,
              color: '#e11d48',
              fontSize: '0.875rem',
              fontFamily: 'var(--c-font-numeric)',
              fontVariantNumeric: 'tabular-nums lining-nums',
            }}
          >
            {dish.price.toLocaleString('vi-VN')} đ
          </span>

          {dish.is_vegetarian && (
            <span
              style={{
                fontSize: '0.6875rem',
                background: '#dcfce7',
                color: '#15803d',
                padding: '2px 6px',
                borderRadius: '6px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <Leaf size={11} strokeWidth={2.5} />
              <span>Chay</span>
            </span>
          )}

          {dish.spicy_level && dish.spicy_level > 0 ? (
            <span
              style={{
                fontSize: '0.6875rem',
                background: '#fee2e2',
                color: '#b91c1c',
                padding: '2px 6px',
                borderRadius: '6px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <Flame size={11} strokeWidth={2.5} />
              <span>Cay</span>
            </span>
          ) : null}

          {!isAvailable && (
            <span
              style={{
                fontSize: '0.6875rem',
                background: '#f1f5f9',
                color: '#64748b',
                padding: '2px 6px',
                borderRadius: '6px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                border: '1px solid #e2e8f0',
              }}
              title={dish.meal_period_note || dish.mealPeriodNote || 'Món ăn đã hết giờ phục vụ'}
            >
              <Clock size={11} strokeWidth={2.5} />
              <span>Hết giờ</span>
            </span>
          )}
        </div>

        {dish.description && (
          <div
            style={{
              fontSize: '0.75rem',
              color: '#64748b',
              marginTop: '3px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {dish.description}
          </div>
        )}
      </div>

        {/* Nút thêm vào giỏ (CHỈ HIỂN THỊ KHI ĐANG MỞ BÁN) HOẶC Nhãn chưa mở bán */}
        {isAvailable ? (
          <button
            onClick={handleAddToCart}
            style={{
              border: 'none',
              borderRadius: '8px',
              background: added ? '#16a34a' : 'linear-gradient(135deg, #e11d48, #be123c)',
              color: '#ffffff',
              padding: '8px 12px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0,
              transition: 'all 0.2s ease',
              boxShadow: added ? '0 2px 8px rgba(22, 163, 74, 0.3)' : '0 2px 8px rgba(225, 29, 72, 0.25)',
            }}
            title="Thêm trực tiếp vào giỏ hàng"
          >
            {added ? (
              <>
                <Check size={14} />
                <span>Đã thêm</span>
              </>
            ) : (
              <>
                <Plus size={14} />
                <span>Thêm giỏ</span>
              </>
            )}
          </button>
        ) : (
          <div
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              color: '#e11d48',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0,
            }}
          >
            <Clock size={13} />
            <span>Chưa mở bán</span>
          </div>
        )}
      </div>

      {/* Dòng lưu ý món chưa được mở bán vui lòng quay lại vào giờ ... */}
      {!isAvailable && (
        <div
          style={{
            padding: '7px 10px',
            borderRadius: '8px',
            background: '#fff7ed',
            border: '1px solid #ffedd5',
            color: '#c2410c',
            fontSize: '0.73rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            lineHeight: 1.35,
          }}
        >
          <Clock size={13} style={{ flexShrink: 0, color: '#ea580c' }} />
          <span>
            Món chưa được mở bán, vui lòng quay lại vào giờ <strong>{dish.meal_period_note || dish.mealPeriodNote || getMealPeriodDescription(dish.meal_periods || dish.mealPeriods)}</strong>
          </span>
        </div>
      )}
    </div>
  );
};
