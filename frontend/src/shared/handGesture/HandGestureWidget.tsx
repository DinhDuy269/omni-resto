import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  CameraOff,
  Hand,
  Minimize2,
  Maximize2,
  Info,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { useHandGestureEngine } from './useHandGestureEngine';
import './HandGestureWidget.css';

interface HandGestureWidgetProps {
  /** Callback tùy biến khi vẫy tay sang trái */
  onSwipeLeft?: () => void;
  /** Callback tùy biến khi vẫy tay sang phải */
  onSwipeRight?: () => void;
}

export const HandGestureWidget: React.FC<HandGestureWidgetProps> = ({
  onSwipeLeft,
  onSwipeRight,
}) => {
  const navigate = useNavigate();
  const [isMinimized, setIsMinimized] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Mặc định: Vẫy sang trái = Back trang trước, Vẫy sang phải = Forward trang kế
  const handleSwipeLeft = onSwipeLeft || (() => navigate(-1));
  const handleSwipeRight = onSwipeRight || (() => navigate(1));

  const {
    state,
    videoRef,
    canvasRef,
    toggleCamera,
    setMode,
  } = useHandGestureEngine({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
  });

  return (
    <>
      {/* ── 1. Floating Trigger Button (FAB) ── */}
      <button
        id="hand-gesture-toggle-btn"
        className={`gesture-fab-trigger${state.isActive ? ' gesture-fab-trigger--active' : ''}`}
        onClick={toggleCamera}
        title={state.isActive ? 'Tắt điều khiển cử chỉ' : 'Bật điều khiển bằng camera & cử chỉ tay'}
        aria-label="Điều khiển cử chỉ tay"
      >
        <div className="gesture-fab-icon-box">
          {state.isActive ? <Hand size={16} /> : <Camera size={16} />}
          {state.isActive && state.handDetected && <span className="gesture-fab-status-dot" />}
        </div>
        <span>{state.isActive ? 'Cử chỉ: Bật' : 'Điều khiển tay'}</span>
      </button>

      {/* ── 2. Picture-in-Picture (PiP) Window ── */}
      {state.isActive && (
        <div className="gesture-pip-window">
          {/* Header */}
          <div className="gesture-pip-header">
            <div className="gesture-pip-title">
              <Sparkles size={14} color="#f59e0b" />
              <span>Camera Nhận Diện Tay</span>
            </div>
            <div className="gesture-pip-actions">
              <button
                type="button"
                className="gesture-icon-btn"
                onClick={() => setShowHelp(!showHelp)}
                title="Hướng dẫn cử chỉ"
              >
                <Info size={14} />
              </button>
              <button
                type="button"
                className="gesture-icon-btn"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}
              >
                {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>
              <button
                type="button"
                className="gesture-icon-btn"
                onClick={toggleCamera}
                title="Tắt Camera"
              >
                <CameraOff size={14} />
              </button>
            </div>
          </div>

          {/* Camera Viewport (Chỉ hiển thị khi không thu nhỏ) */}
          {!isMinimized && (
            <>
              <div className="gesture-viewport">
                <video
                  ref={videoRef}
                  className="gesture-video"
                  playsInline
                  muted
                  autoPlay
                />
                <canvas ref={canvasRef} className="gesture-canvas" />

                <div className="gesture-viewport-overlay" />

                {/* Loading state */}
                {state.isLoading && (
                  <div className="gesture-loading-overlay">
                    <div className="gesture-spinner" />
                    <span>Đang khởi động AI nhận diện...</span>
                  </div>
                )}

                {/* Báo lỗi */}
                {state.error && (
                  <div className="gesture-loading-overlay" style={{ padding: 12, textAlign: 'center' }}>
                    <AlertCircle size={24} color="#ef4444" />
                    <span style={{ color: '#fca5a5' }}>{state.error}</span>
                  </div>
                )}

                {/* Badge thông báo chưa thấy tay */}
                {!state.isLoading && !state.error && !state.handDetected && (
                  <div className="gesture-no-hand-badge">
                    👋 Giơ bàn tay vào khung hình để điều khiển
                  </div>
                )}
              </div>

              {/* Panel điều khiển & chọn chế độ */}
              <div className="gesture-pip-footer">
                {/* Chế độ hoạt động */}
                <div className="gesture-mode-tabs">
                  <button
                    type="button"
                    className={`gesture-mode-tab${state.mode === 'all' ? ' gesture-mode-tab--active' : ''}`}
                    onClick={() => setMode('all')}
                    title="Kết hợp cả chuột ảo và cử chỉ cuộn/vẫy"
                  >
                    Tất cả (A+B)
                  </button>
                  <button
                    type="button"
                    className={`gesture-mode-tab${state.mode === 'cursor_only' ? ' gesture-mode-tab--active' : ''}`}
                    onClick={() => setMode('cursor_only')}
                    title="Chỉ dùng chuột ảo & pinch click"
                  >
                    Chuột ảo (A)
                  </button>
                  <button
                    type="button"
                    className={`gesture-mode-tab${state.mode === 'gesture_only' ? ' gesture-mode-tab--active' : ''}`}
                    onClick={() => setMode('gesture_only')}
                    title="Chỉ dùng cuộn và vẫy tay"
                  >
                    Cử chỉ (B)
                  </button>
                </div>

                {/* Thanh đo lực chụm ngón (Pinch Meter) */}
                {state.mode !== 'gesture_only' && state.handDetected && (
                  <div className="gesture-pinch-indicator">
                    <span>Lực chụm:</span>
                    <div className="gesture-pinch-track">
                      <div
                        className="gesture-pinch-fill"
                        style={{ width: `${Math.round(state.pinchStrength * 100)}%` }}
                      />
                    </div>
                    <span>{state.isPinching ? '👌 CLICK' : `${Math.round(state.pinchStrength * 100)}%`}</span>
                  </div>
                )}

                {/* Hướng dẫn thao tác nhanh */}
                {showHelp && (
                  <div className="gesture-help-tips">
                    <div>• 👆 <b>Ngón trỏ</b>: Di chuyển chuột ảo</div>
                    <div>• 🤏 <b>Chụm 2 ngón</b>: Click vào nút/món ăn</div>
                    <div>• ⬆️ <b>Đưa tay lên cao</b>: Tự động cuộn lên</div>
                    <div>• ⬇️ <b>Hạ tay xuống thấp</b>: Tự động cuộn xuống</div>
                    <div>• 👋 <b>Vẫy tay trái/phải</b>: Quay lại / Đi tiếp trang</div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── 3. Full-Screen Virtual Cursor Overlay ── */}
      {state.isActive && state.handDetected && state.mode !== 'gesture_only' && (
        <div className="gesture-cursor-container">
          <div
            className={`gesture-virtual-cursor${state.isPinching ? ' gesture-virtual-cursor--pinching' : ''}`}
            style={{
              left: `${state.cursor.x}px`,
              top: `${state.cursor.y}px`,
            }}
          >
            <div className="gesture-cursor-ring" />
            <div className="gesture-cursor-dot" />

            {/* Sóng xung kích khi Click */}
            {state.isPinching && <div className="gesture-cursor-ripple" />}

            {/* Feedback Toast bám theo con trỏ */}
            {state.actionFeedback && (
              <div className="gesture-feedback-toast">
                {state.actionFeedback.message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 4. Edge Auto-Scroll Hint ── */}
      {state.isActive && state.actionFeedback?.type === 'scroll_up' && (
        <div className="gesture-scroll-hint gesture-scroll-hint--top">
          ▲ Đang cuộn lên
        </div>
      )}
      {state.isActive && state.actionFeedback?.type === 'scroll_down' && (
        <div className="gesture-scroll-hint gesture-scroll-hint--bottom">
          ▼ Đang cuộn xuống
        </div>
      )}
    </>
  );
};
