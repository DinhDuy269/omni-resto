import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { SpatialMenuDeck } from './SpatialMenuDeck';
import './HandGestureWidget.css';

interface HandGestureWidgetProps {
  /** Cho phép mở sẵn thực đơn không gian khi component mount */
  defaultOpen?: boolean;
}

/**
 * HandGestureWidget: Bộ điều khiển thực đơn không gian cử chỉ AI (Zero-Cursor Spatial Menu Deck).
 * Đã thay thế hoàn toàn mô hình con trỏ chuột ảo 2D trễ/rung lắc bằng trải nghiệm 3D Carousel
 * nhận diện Macro-Gesture qua Google MediaPipe Vision 60 FPS.
 */
export const HandGestureWidget: React.FC<HandGestureWidgetProps> = ({ defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Phím tắt bàn phím: bấm phím 'g' hoặc 'G' (khi không gõ văn bản) để mở nhanh thực đơn không gian
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === 'g' || e.key === 'G') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          setIsOpen((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* ── 1. Floating Launcher Pill Trigger (Góc dưới bên trái) ── */}
      <button
        id="spatial-menu-toggle-btn"
        className={`gesture-fab-trigger${isOpen ? ' gesture-fab-trigger--active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        title="Khám phá thực đơn 3D không gian - Điều khiển rảnh tay bằng cử chỉ AI (Zero-Cursor)"
        aria-label="Thực đơn cử chỉ AI"
      >
        <div className="gesture-fab-icon-box">
          <Sparkles size={16} />
          <span className="gesture-fab-status-dot" />
        </div>
        <div className="gesture-fab-content">
          <span className="gesture-fab-label">Thực đơn cử chỉ AI</span>
          <span className="gesture-fab-badge">3D Vision</span>
        </div>
      </button>

      {/* ── 2. Immersive 3D Spatial Menu Deck (Minority Report / Vision Pro Style) ── */}
      <SpatialMenuDeck isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
