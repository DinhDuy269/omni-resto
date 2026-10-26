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
  Crosshair,
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
    cursorRef,
    toggleCamera,
    setMode,
  } = useHandGestureEngine({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    isMinimized,
  });

  return (
    <>
      {/* ── 0. Video Element ngầm (Luôn gắn trong DOM để stream camera không bao giờ bị ngắt hay null) ── */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        style={{
          position: 'fixed',
          top: -9999,
          left: -9999,
          width: 640,
          height: 480,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />

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
        <div className={`gesture-pip-window${isMinimized ? ' gesture-pip-window--minimized' : ''}`}>
          {/* Header */}
          <div className="gesture-pip-header">
            <div className="gesture-pip-title">
              <Sparkles size={14} color="#f59e0b" />
              <span>{isMinimized ? 'Cử chỉ tay AI' : 'Camera Nhận Diện Tay'}</span>
              {state.handDetected && (
                <span className="gesture-live-pill">LIVE 60FPS</span>
              )}
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
                title={isMinimized ? 'Mở rộng khung camera' : 'Thu nhỏ khung camera'}
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
                {/* Canvas hiển thị đồng thời cả video camera lẫn khung xương bàn tay đồng bộ 100% */}
                <canvas ref={canvasRef} className="gesture-canvas" />

                <div className="gesture-viewport-overlay" />

                {/* Loading state */}
                {state.isLoading && (
                  <div className="gesture-loading-overlay">
                    <div className="gesture-spinner" />
                    <span>Đang nạp mô hình Vision AI...</span>
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
                    👋 Giơ bàn tay vào khung hình để bắt đầu
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
                    <span className="gesture-pinch-label">
                      {state.isHoveringClickable ? '🎯 Đã nhắm mục tiêu' : 'Lực chụm:'}
                    </span>
                    <div className="gesture-pinch-track">
                      <div
                        className={`gesture-pinch-fill${state.isPinching ? ' gesture-pinch-fill--active' : ''}`}
                        style={{ width: `${Math.round(state.pinchStrength * 100)}%` }}
                      />
                    </div>
                    <span className="gesture-pinch-val">
                      {state.isPinching ? '👌 CLICK' : `${Math.round(state.pinchStrength * 100)}%`}
                    </span>
                  </div>
                )}

                {/* Hướng dẫn thao tác nhanh */}
                {showHelp && (
                  <div className="gesture-help-tips">
                    <div>• 👆 <b>Ngón trỏ</b>: Di chuyển chuột (Bộ lọc 1-Euro chống rung)</div>
                    <div>• 🤏 <b>Chụm 2 ngón</b>: Bấm chuột (Tự động khóa tọa độ chống trượt)</div>
                    <div>• 🎯 <b>Nam châm</b>: Con trỏ tự hút nhẹ vào nút/món ăn gần nhất</div>
                    <div>• ⬆️ <b>Đưa tay lên mép trên</b>: Tự động cuộn lên</div>
                    <div>• ⬇️ <b>Hạ tay xuống mép dưới</b>: Tự động cuộn xuống</div>
                    <div>• 👋 <b>Vẫy tay trái/phải</b>: Quay lại (Back) / Đi tiếp (Next)</div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── 3. Full-Screen Virtual Cursor Overlay (Direct DOM 60-120FPS) ── */}
      {state.isActive && state.handDetected && state.mode !== 'gesture_only' && (
        <div className="gesture-cursor-container">
          <div
            ref={cursorRef}
            className={`gesture-virtual-cursor${
              state.isPinching ? ' gesture-virtual-cursor--pinching' : ''
            }${state.isHoveringClickable ? ' gesture-virtual-cursor--hovering' : ''}`}
            style={{
              transform: `translate3d(${state.cursor.x}px, ${state.cursor.y}px, 0)`,
            }}
          >
            {/* Vòng nhắm ngoài (Reticle Ring) */}
            <div className="gesture-cursor-ring">
              {state.isHoveringClickable && <Crosshair size={14} className="gesture-reticle-icon" />}
            </div>

            {/* Chấm tâm con trỏ */}
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
