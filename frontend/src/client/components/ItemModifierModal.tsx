import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Check, Flame, Leaf, ShieldAlert, Sparkles } from 'lucide-react';
import type { MenuItem } from '../../shared/types/menu';
import { useClientStore } from '../store/clientStore';

interface ItemModifierModalProps {
  item: MenuItem | null;
  onClose: () => void;
}

export const ItemModifierModal: React.FC<ItemModifierModalProps> = ({ item, onClose }) => {
  const { addToCart } = useClientStore();

  const [selectedSize, setSelectedSize] = useState<{ name: string; extraPrice: number }>({
    name: 'Khẩu phần Chuẩn (Vừa)',
    extraPrice: 0,
  });

  const [selectedToppings, setSelectedToppings] = useState<Array<{ name: string; price: number }>>([]);
  const [specialNote, setSpecialNote] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Reset selections each time a new item is opened (must be before early return)
  useEffect(() => {
    setSelectedSize({ name: 'Khẩu phần Chuẩn (Vừa)', extraPrice: 0 });
    setSelectedToppings([]);
    setSpecialNote('');
    setQuantity(1);
  }, [item?.id]);

  if (!item) return null;

  const sizes = [
    { name: 'Khẩu phần Chuẩn (Vừa)', extraPrice: 0 },
    { name: 'Khẩu phần Đầy Đặn (Lớn)', extraPrice: 15000 },
    { name: 'Khẩu phần Đặc Biệt (Full Op)', extraPrice: 25000 },
  ];

  const availableToppings = [
    { name: 'Trứng Chần Lòng Đào', price: 6000 },
    { name: 'Phô Mai Viên Tan Chảy', price: 12000 },
    { name: 'Quẩy Giòn Rụm (Đĩa 3 cái)', price: 8000 },
    { name: 'Thêm Sốt Đặc Biệt OmniResto', price: 10000 },
  ];

  const toggleTopping = (topping: { name: string; price: number }) => {
    if (selectedToppings.some((t) => t.name === topping.name)) {
      setSelectedToppings(selectedToppings.filter((t) => t.name !== topping.name));
    } else {
      setSelectedToppings([...selectedToppings, topping]);
    }
  };

  const toppingsPrice = selectedToppings.reduce((sum, t) => sum + t.price, 0);
  const unitPrice = item.basePrice + selectedSize.extraPrice + toppingsPrice;
  const totalPrice = unitPrice * quantity;

  const handleConfirmAdd = () => {
    const noteSuffix = specialNote.trim() ? ` [Ghi chú: ${specialNote.trim()}]` : '';
    const customizedName = `${item.name} (${selectedSize.name}${
      selectedToppings.length > 0 ? ' + ' + selectedToppings.map((t) => t.name).join(', ') : ''
    })${noteSuffix}`;

    for (let i = 0; i < quantity; i++) {
      addToCart({
        menuItemId: `${item.id}-${selectedSize.name}-${selectedToppings.map((t) => t.name).join('-')}`,
        name: customizedName,
        category: item.category,
        price: unitPrice,
        image: item.image,
      });
    }

    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(20, 10, 5, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="animate-fade-in"
        style={{
          background: 'var(--c-surface)',
          borderRadius: '24px',
          maxWidth: '520px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
          border: '1px solid var(--c-border-light)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Hero Image */}
        <div style={{ position: 'relative', width: '100%', height: '200px', flexShrink: 0 }}>
          <img
            src={item.image}
            alt={item.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.6)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
          {item.isBestSeller && (
            <span
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                background: 'var(--c-primary)',
                color: '#fff',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Flame size={12} /> Bán chạy nhất
            </span>
          )}
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--c-text-main)', margin: '0 0 6px' }}>
              {item.name}
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--c-text-muted)', margin: 0, lineHeight: 1.5 }}>
              {item.description}
            </p>
            <div style={{ marginTop: '8px', fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-primary)' }}>
              {unitPrice.toLocaleString('vi-VN')} đ
            </div>
          </div>

          {/* Ingredients & Allergens info */}
          {item.ingredients && item.ingredients.trim() && (
            <div
              style={{
                background: 'rgba(232, 93, 38, 0.04)',
                border: '1px solid rgba(232, 93, 38, 0.15)',
                borderRadius: '16px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 800, color: 'var(--c-primary)' }}>
                  <Leaf size={15} />
                  <span>Thành phần & Nguyên liệu chính:</span>
                </div>
                <span style={{ fontSize: '0.725rem', color: 'var(--c-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldAlert size={12} /> Lưu ý dị ứng
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {item.ingredients.split(',').map((ing, idx) => {
                  const cleanIng = ing.trim();
                  return (
                    <button
                      key={idx}
                      type="button"
                      title={`Bấm để thêm yêu cầu "Không lấy ${cleanIng}" vào ghi chú bếp`}
                      onClick={() => {
                        const noteToAdd = `Không lấy ${cleanIng}`;
                        if (!specialNote.includes(noteToAdd)) {
                          setSpecialNote((prev) => (prev ? `${prev}, ${noteToAdd}` : noteToAdd));
                        }
                      }}
                      style={{
                        background: 'var(--c-surface)',
                        border: '1.5px solid var(--c-border-light)',
                        color: 'var(--c-text-main)',
                        fontSize: '0.775rem',
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--c-primary)';
                        e.currentTarget.style.background = 'var(--c-primary-light)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--c-border-light)';
                        e.currentTarget.style.background = 'var(--c-surface)';
                      }}
                    >
                      <Sparkles size={11} color="var(--c-primary)" />
                      {cleanIng}
                    </button>
                  );
                })}
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)', lineHeight: 1.4 }}>
                💡 <em>Mẹo: Bạn có thể bấm vào nguyên liệu để nhanh chóng dặn nhà bếp bỏ bớt nguyên liệu không dùng.</em>
              </div>
            </div>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid var(--c-border-light)', margin: 0 }} />

          {/* Section 1: Size Selector */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <strong style={{ fontSize: '0.95rem', color: 'var(--c-text-main)' }}>1. Chọn Kích Cỡ (Size)</strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--c-primary)', fontWeight: 700 }}>Bắt buộc</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sizes.map((sz) => {
                const isSelected = selectedSize.name === sz.name;
                return (
                  <div
                    key={sz.name}
                    onClick={() => setSelectedSize(sz)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: `1.5px solid ${isSelected ? 'var(--c-primary)' : 'var(--c-border-light)'}`,
                      background: isSelected ? 'var(--c-primary-light)' : 'var(--c-surface)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: `2px solid ${isSelected ? 'var(--c-primary)' : '#9ca3af'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isSelected && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--c-primary)' }} />}
                      </div>
                      <span style={{ fontSize: '0.875rem', fontWeight: isSelected ? 700 : 500, color: 'var(--c-text-main)' }}>
                        {sz.name}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--c-primary)' }}>
                      {sz.extraPrice === 0 ? 'Miễn phí' : `+${sz.extraPrice.toLocaleString('vi-VN')}đ`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Toppings */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <strong style={{ fontSize: '0.95rem', color: 'var(--c-text-main)' }}>2. Topping Ăn Kèm (Tùy chọn)</strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)' }}>Chọn nhiều</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {availableToppings.map((top) => {
                const isChecked = selectedToppings.some((t) => t.name === top.name);
                return (
                  <div
                    key={top.name}
                    onClick={() => toggleTopping(top)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: `1.5px solid ${isChecked ? 'var(--c-primary)' : 'var(--c-border-light)'}`,
                      background: isChecked ? 'var(--c-primary-light)' : 'var(--c-surface)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          border: `2px solid ${isChecked ? 'var(--c-primary)' : '#9ca3af'}`,
                          background: isChecked ? 'var(--c-primary)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isChecked && <Check size={12} color="#fff" strokeWidth={3} />}
                      </div>
                      <span style={{ fontSize: '0.875rem', fontWeight: isChecked ? 700 : 500, color: 'var(--c-text-main)' }}>
                        {top.name}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--c-primary)' }}>
                      +{top.price.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Notes for kitchen */}
          <div>
            <strong style={{ fontSize: '0.95rem', color: 'var(--c-text-main)', display: 'block', marginBottom: '8px' }}>
              3. Ghi Chú Đặc Biệt Cho Nhà Bếp
            </strong>
            <input
              type="text"
              placeholder="Ví dụ: Ít cay, Không lấy hành lá, Nước dùng đậm đà..."
              value={specialNote}
              onChange={(e) => setSpecialNote(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1.5px solid var(--c-border-light)',
                fontFamily: 'var(--c-font)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--c-border-light)',
            background: 'var(--c-surface-warm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            position: 'sticky',
            bottom: 0,
          }}
        >
          {/* Quantity Stepper */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: '#fff',
              border: '1.5px solid var(--c-border)',
              borderRadius: '12px',
              padding: '4px',
            }}
          >
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Minus size={16} />
            </button>
            <span style={{ width: '28px', textAlign: 'center', fontWeight: 800, fontSize: '0.95rem' }}>{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--c-primary)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Add Button */}
          <button
            onClick={handleConfirmAdd}
            style={{
              flex: 1,
              padding: '14px 20px',
              borderRadius: '14px',
              background: 'var(--c-primary)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: 'var(--c-shadow-orange)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Thêm Vào Giỏ</span>
            <span>{totalPrice.toLocaleString('vi-VN')} đ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
