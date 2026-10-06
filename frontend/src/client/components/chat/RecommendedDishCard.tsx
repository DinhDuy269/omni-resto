import React, { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import type { ChatRecommendedDish } from '../../types/chat';
import { useClientStore } from '../../store/clientStore';

interface Props {
  dish: ChatRecommendedDish;
}

export const RecommendedDishCard: React.FC<Props> = ({ dish }) => {
  const [added, setAdded] = useState(false);
  const addToCart = useClientStore((state) => state.addToCart);

  const handleAddToCart = () => {
    addToCart(
      {
        menuItemId: dish.id,
        name: dish.name,
        category: dish.category,
        price: dish.price,
        image: dish.imageUrl || '',
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
        border: '1px solid #e2e8f0',
        padding: '10px',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        marginTop: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Ảnh món */}
      {dish.imageUrl ? (
        <img
          src={dish.imageUrl}
          alt={dish.name}
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
            background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            flexShrink: 0,
          }}
        >
          🍲
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
          <span style={{ fontWeight: 800, color: '#e11d48', fontSize: '0.875rem' }}>
            {dish.price.toLocaleString('vi-VN')} đ
          </span>

          {dish.isVegetarian && (
            <span
              style={{
                fontSize: '0.6875rem',
                background: '#dcfce7',
                color: '#15803d',
                padding: '2px 6px',
                borderRadius: '6px',
                fontWeight: 600,
              }}
            >
              🌱 Chay
            </span>
          )}

          {dish.spicyLevel && dish.spicyLevel > 0 ? (
            <span
              style={{
                fontSize: '0.6875rem',
                background: '#fee2e2',
                color: '#b91c1c',
                padding: '2px 6px',
                borderRadius: '6px',
                fontWeight: 600,
              }}
            >
              🌶️ Cay
            </span>
          ) : null}
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

      {/* Nút thêm vào giỏ */}
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
    </div>
  );
};
