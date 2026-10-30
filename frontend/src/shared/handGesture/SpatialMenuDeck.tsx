import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAdminStore } from '../../admin/store/adminStore';
import { useClientStore, selectTotalItems, selectTotalAmount } from '../../client/store/clientStore';
import { menuApi } from '../../admin/pages/menu/menuApi';
import { useSpatialGestureEngine } from './useSpatialGestureEngine';
import './SpatialMenuDeck.css';

interface SpatialMenuDeckProps {
  isOpen: boolean;
  onClose: () => void;
}

const ALL_CATEGORY = 'Tất cả';

export const SpatialMenuDeck: React.FC<SpatialMenuDeckProps> = ({ isOpen, onClose }) => {
  const { menu_items, setMenuItems } = useAdminStore();
  const { addToCart, openCart } = useClientStore();
  const totalItems = useClientStore(selectTotalItems);
  const totalAmount = useClientStore(selectTotalAmount);

  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY);
  const [activeDishIndex, setActiveDishIndex] = useState<number>(0);
  const [flyingDish, setFlyingDish] = useState<{ image: string; id: number } | null>(null);

  // Nạp thực đơn nếu chưa có trong store
  useEffect(() => {
    if (!menu_items || menu_items.length === 0) {
      menuApi.getMenuItems()
        .then((items) => {
          if (items && items.length > 0) {
            setMenuItems(items);
          }
        })
        .catch(() => {});
    }
  }, [menu_items, setMenuItems]);

  // Danh mục món
  const categories = useMemo(() => {
    const cats = Array.from(new Set(menu_items.map((m) => m.category))).filter(Boolean) as string[];
    return [ALL_CATEGORY, ...cats];
  }, [menu_items]);

  // Danh sách món sau lọc (chấp nhận cả món có status = 'available' hoặc 'active')
  const filteredDishes = useMemo(() => {
    let list = menu_items.filter((m) => !m.status || m.status === 'available' || (m.status as string) === 'active');
    if (list.length === 0 && menu_items.length > 0) {
      list = menu_items;
    }
    if (activeCategory !== ALL_CATEGORY) {
      list = list.filter((m) => m.category === activeCategory);
    }
    return list;
  }, [menu_items, activeCategory]);

  // Reset index khi đổi danh mục
  useEffect(() => {
    setActiveDishIndex(0);
  }, [activeCategory]);

  // Chuyển món tiếp theo
  const handleNext = useCallback(() => {
    if (filteredDishes.length === 0) return;
    setActiveDishIndex((prev) => (prev + 1) % filteredDishes.length);
  }, [filteredDishes.length]);

  // Lùi về món trước
  const handlePrev = useCallback(() => {
    if (filteredDishes.length === 0) return;
    setActiveDishIndex((prev) => (prev - 1 + filteredDishes.length) % filteredDishes.length);
  }, [filteredDishes.length]);

  // Đổi danh mục tiếp theo
  const handleNextCategory = useCallback(() => {
    const currentIdx = categories.indexOf(activeCategory);
    const nextIdx = (currentIdx + 1) % categories.length;
    setActiveCategory(categories[nextIdx]);
  }, [categories, activeCategory]);

  // Nhặt món vào giỏ hàng
  const handleGrabDish = useCallback(() => {
    const currentDish = filteredDishes[activeDishIndex];
    if (!currentDish) return;

    addToCart({
      id: currentDish.id,
      menu_item_id: currentDish.id,
      name: currentDish.name,
      category: currentDish.category,
      price: Number(currentDish.base_price) || 0,
      image: currentDish.image || '',
      meal_periods: currentDish.meal_periods,
      is_available_now: true,
    }, 1);

    // Kích hoạt hiệu ứng bay vào giỏ
    setFlyingDish({ image: currentDish.image, id: Date.now() });
    setTimeout(() => {
      setFlyingDish(null);
    }, 800);
  }, [filteredDishes, activeDishIndex, addToCart]);

  // Giơ ngón cái Thumb Up -> Thoát giao diện & Xem giỏ hàng
  const handleThumbConfirm = useCallback(() => {
    openCart();
    onClose();
  }, [openCart, onClose]);

  // Khởi tạo AI Gesture Engine (Spatial Cruise Control with Dead-Man Brake + rVFC Hardware Sync)
  const {
    state,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    speedMode,
    setSpeedMode,
  } = useSpatialGestureEngine({
    onSwipeNext: handleNext,
    onSwipePrev: handlePrev,
    onGrabDish: handleGrabDish,
    onThumbConfirm: handleThumbConfirm,
    onSwitchCategory: handleNextCategory,
  });

  const toggleSpeedMode = useCallback(() => {
    if (speedMode === 'balanced') setSpeedMode('fast');
    else if (speedMode === 'fast') setSpeedMode('relaxed');
    else setSpeedMode('balanced');
  }, [speedMode, setSpeedMode]);

  // Tự động bật camera khi mở modal và giải phóng camera khi đóng
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [isOpen, startCamera, stopCamera]);

  // Hỗ trợ phím tắt bàn phím song song để luôn tiện lợi
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleGrabDish();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        handleNextCategory();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, handleGrabDish, handleNextCategory, onClose]);

  if (!isOpen) return null;

  const currentDish = filteredDishes[activeDishIndex];
  const prevDish = filteredDishes[(activeDishIndex - 1 + filteredDishes.length) % Math.max(1, filteredDishes.length)];
  const nextDish = filteredDishes[(activeDishIndex + 1) % Math.max(1, filteredDishes.length)];

  return (
    <div className={`spatial-deck-overlay spatial-speed--${speedMode}`}>
      {/* ── Video phục vụ MediaPipe AI (luôn trong viewport để duy trì 60 FPS giải mã GPU) ── */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '1px',
          height: '1px',
          opacity: 0.01,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />

      {/* ── 1. Top Header ── */}
      <header className="spatial-deck-header">
        <div className="spatial-deck-brand">
          <div className="spatial-brand-icon">
            <Sparkles size={20} color="#ffffff" />
          </div>
          <div className="spatial-brand-text">
            <h2>Thực Đơn Không Gian AI</h2>
            <span>Hands-Free Gestures • 60 FPS</span>
          </div>
        </div>

        {/* Category Pills Navigation */}
        <nav className="spatial-categories-bar">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`spatial-category-pill${activeCategory === cat ? ' spatial-category-pill--active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </nav>

        {/* Phía phải: Tùy chỉnh tốc độ, Camera HUD, Giỏ hàng, Nút đóng */}
        <div className="spatial-header-right">
          {/* Nút chuyển đổi chế độ nhạy / phản hồi */}
          <button
            type="button"
            className={`spatial-speed-pill spatial-speed-pill--${speedMode}`}
            onClick={toggleSpeedMode}
            title="Bấm để đổi độ nhạy cử chỉ: Siêu tốc (160ms) / Tiêu chuẩn (220ms) / Thư thái (320ms)"
          >
            {speedMode === 'fast' && '⚡ Siêu tốc'}
            {speedMode === 'balanced' && '🎯 Tiêu chuẩn'}
            {speedMode === 'relaxed' && '🍃 Thư thái'}
          </button>

          {/* Mini Camera HUD */}
          <div className="spatial-camera-hud" title="Camera nhận diện cử chỉ bàn tay AI">
            <canvas ref={canvasRef} className="spatial-camera-canvas" />
            {state.handDetected ? (
              <span
                className="spatial-camera-live-badge"
                style={{ background: state.isRvfcActive ? '#10b981' : '#0284c7' }}
              >
                {state.isRvfcActive ? '⚡ 0ms rVFC' : 'LIVE 60FPS'}
              </span>
            ) : (
              <span className="spatial-camera-live-badge" style={{ background: 'rgba(239, 68, 68, 0.7)' }}>ĐỢI TAY</span>
            )}
          </div>

          {/* Giỏ hàng Floating Pill */}
          <button
            type="button"
            className="spatial-cart-pill"
            onClick={() => { openCart(); onClose(); }}
            title="Xem giỏ hàng"
          >
            <ShoppingCart size={18} color="#f59e0b" />
            <span>{totalAmount.toLocaleString('vi-VN')}đ</span>
            {totalItems > 0 && (
              <span className="spatial-cart-badge">{totalItems}</span>
            )}
          </button>

          {/* Nút thoát */}
          <button
            type="button"
            className="spatial-close-btn"
            onClick={onClose}
            title="Thoát chế độ không gian (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* ── 2. Center 3D Carousel Stage ── */}
      <main className="spatial-deck-stage">
        {/* Chỉ báo Vùng Không Gian 2 bên (Spatial Zone Indicators) */}
        <div className={`spatial-zone-indicator spatial-zone-indicator--left${state.handZone === 'left' && !state.isBraking ? ' is-active' : ''}`}>
          <span>👈 LÙI MÓN</span>
        </div>
        <div className={`spatial-zone-indicator spatial-zone-indicator--right${state.handZone === 'right' && !state.isBraking ? ' is-active' : ''}`}>
          <span>👉 TIẾN MÓN</span>
        </div>

        {/* Nút mũi tên hỗ trợ bấm chuột / bàn phím */}
        <button
          type="button"
          className="spatial-nav-arrow spatial-nav-arrow--left"
          onClick={handlePrev}
          aria-label="Món trước"
        >
          <ChevronLeft size={26} />
        </button>
        <button
          type="button"
          className="spatial-nav-arrow spatial-nav-arrow--right"
          onClick={handleNext}
          aria-label="Món tiếp theo"
        >
          <ChevronRight size={26} />
        </button>

        <div className="spatial-cards-container">
          {filteredDishes.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
              <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>Chưa có món ăn trong danh mục này</p>
            </div>
          ) : (
            <>
              {/* Thẻ món phía trước (Left Dimmed Card) */}
              {prevDish && filteredDishes.length > 1 && (
                <article
                  className="spatial-dish-card spatial-dish-card--prev"
                  onClick={handlePrev}
                >
                  <div className="spatial-card-img-wrap">
                    <img src={prevDish.image} alt={prevDish.name} className="spatial-card-img" />
                  </div>
                  <div className="spatial-card-body">
                    <h3 className="spatial-card-title">{prevDish.name}</h3>
                    <div className="spatial-card-price">
                      {Number(prevDish.base_price).toLocaleString('vi-VN')}<span>đ</span>
                    </div>
                  </div>
                </article>
              )}

              {/* Thẻ món chính giữa (Center Active Card) */}
              {currentDish && (
                <article
                  className="spatial-dish-card spatial-dish-card--active"
                  onClick={handleGrabDish}
                >
                  <div className="spatial-card-img-wrap">
                    <img src={currentDish.image} alt={currentDish.name} className="spatial-card-img" />
                    {state.isBraking ? (
                      <span className="spatial-card-badge" style={{ background: 'rgba(234, 179, 8, 0.95)', color: '#000000', fontWeight: 800 }}>
                        ✋ ĐÃ PHANH DỪNG
                      </span>
                    ) : currentDish.is_best_seller ? (
                      <span className="spatial-card-badge">
                        🔥 Bán chạy
                      </span>
                    ) : null}
                  </div>

                  <div className="spatial-card-body">
                    <div>
                      <h3 className="spatial-card-title">{currentDish.name}</h3>
                      <p className="spatial-card-desc">
                        {currentDish.description || 'Hương vị thơm ngon đặc trưng, được chế biến từ nguyên liệu tươi mới mỗi ngày.'}
                      </p>
                    </div>

                    <div className="spatial-card-bottom">
                      <div className="spatial-card-price">
                        {Number(currentDish.base_price).toLocaleString('vi-VN')}<span>đ</span>
                      </div>

                      <div className="spatial-grab-cue">
                        <span>✊ Nắm tay để nhặt</span>
                      </div>
                    </div>
                  </div>
                </article>
              )}

              {/* Thẻ món phía sau (Right Dimmed Card) */}
              {nextDish && filteredDishes.length > 2 && (
                <article
                  className="spatial-dish-card spatial-dish-card--next"
                  onClick={handleNext}
                >
                  <div className="spatial-card-img-wrap">
                    <img src={nextDish.image} alt={nextDish.name} className="spatial-card-img" />
                  </div>
                  <div className="spatial-card-body">
                    <h3 className="spatial-card-title">{nextDish.name}</h3>
                    <div className="spatial-card-price">
                      {Number(nextDish.base_price).toLocaleString('vi-VN')}<span>đ</span>
                    </div>
                  </div>
                </article>
              )}
            </>
          )}
        </div>
      </main>

      {/* ── 3. Bottom Gesture HUD & Action Banners ── */}
      <footer className="spatial-deck-footer">
        {/* Banner Toast phản hồi hành động thời gian thực */}
        {state.recentAction && (
          <div className="spatial-action-banner">
            {state.recentAction.message}
          </div>
        )}

        {/* Thanh hướng dẫn 5 cử chỉ không gian theo yêu cầu */}
        <div className="spatial-gesture-dock">
          <button
            type="button"
            className={`spatial-gesture-badge${state.handZone === 'left' && !state.isBraking ? ' spatial-gesture-badge--active' : ''}`}
            onClick={handlePrev}
            title="Đưa tay sang trái để lùi món"
          >
            <span>👈</span>
            <span>Đưa tay Trái: Lùi món</span>
          </button>

          <button
            type="button"
            className={`spatial-gesture-badge${state.isBraking ? ' spatial-gesture-badge--braking' : ''}`}
            onClick={() => {}}
            title="Xòe bàn tay để phanh dừng ngắm món"
          >
            <span>✋</span>
            <span>Xòe tay: Phanh dừng</span>
          </button>

          <button
            type="button"
            className={`spatial-gesture-badge${state.currentGesture === 'Closed_Fist' || state.fistProgress > 0 ? ' spatial-gesture-badge--active' : ''}`}
            onClick={handleGrabDish}
            title="Nắm bàn tay lại để nhặt món vào giỏ hàng"
          >
            <span>✊</span>
            <span>Nắm tay: Nhặt vào giỏ {state.fistProgress > 0 ? `(${Math.round(state.fistProgress * 100)}%)` : ''}</span>
          </button>

          <button
            type="button"
            className={`spatial-gesture-badge${state.handZone === 'right' && !state.isBraking ? ' spatial-gesture-badge--active' : ''}`}
            onClick={handleNext}
            title="Đưa tay sang phải để tiến món"
          >
            <span>👉</span>
            <span>Đưa tay Phải: Tiến món</span>
          </button>

          <button
            type="button"
            className={`spatial-gesture-badge${state.currentGesture === 'Thumb_Up' || state.thumbProgress > 0 ? ' spatial-gesture-badge--active' : ''}`}
            onClick={handleThumbConfirm}
            title="Giơ ngón cái để thoát giao diện & xem giỏ hàng"
          >
            <span>👍</span>
            <span>Ngón cái: Thoát & Mở giỏ {state.thumbProgress > 0 ? `(${Math.round(state.thumbProgress * 100)}%)` : ''}</span>
          </button>
        </div>
      </footer>

      {/* ── 4. Flying Dish Animation khi nhặt vào giỏ ── */}
      {flyingDish && (
        <img
          key={flyingDish.id}
          src={flyingDish.image}
          alt="Flying Dish"
          className="spatial-flying-item"
        />
      )}
    </div>
  );
};
