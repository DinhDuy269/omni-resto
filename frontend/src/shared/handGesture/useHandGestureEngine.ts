import { useState, useEffect, useRef, useCallback } from 'react';
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import type { HandGestureState, HandCursor, GestureType, ActiveMode, GestureActionFeedback } from './types';

// Các đường nối giữa 21 landmarks của bàn tay (Hand Skeleton)
const HAND_CONNECTIONS: [number, number][] = [
  // Cổ tay tới các gốc ngón
  [0, 1], [1, 2], [2, 3], [3, 4],       // Ngón cái
  [0, 5], [5, 6], [6, 7], [7, 8],       // Ngón trỏ
  [5, 9], [9, 10], [10, 11], [11, 12],   // Ngón giữa
  [9, 13], [13, 14], [14, 15], [15, 16], // Ngón áp út
  [13, 17], [17, 18], [18, 19], [19, 20],// Ngón út
  [0, 17],                               // Cạnh bàn tay
];

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';

export interface UseHandGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onPinchClick?: (x: number, y: number, target: Element | null) => void;
  initialMode?: ActiveMode;
}

export function useHandGestureEngine(options: UseHandGestureOptions = {}) {
  const { onSwipeLeft, onSwipeRight, onPinchClick, initialMode = 'all' } = options;

  const [state, setState] = useState<HandGestureState>({
    isActive: false,
    isLoading: false,
    error: null,
    handDetected: false,
    cursor: { x: window.innerWidth / 2, y: window.innerHeight / 2, rawX: 0.5, rawY: 0.5 },
    isPinching: false,
    pinchStrength: 0,
    detectedGesture: 'None',
    actionFeedback: null,
    mode: initialMode,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Tham chiếu lưu vị trí mượt mà (Lerp smoothing)
  const smoothedCursorRef = useRef<HandCursor>({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    rawX: 0.5,
    rawY: 0.5,
  });

  // Trạng thái theo dõi cử chỉ & chống rung (Debounce)
  const isPinchingRef = useRef(false);
  const lastClickTimeRef = useRef(0);
  const lastSwipeTimeRef = useRef(0);
  const lastFeedbackTimerRef = useRef<any>(null);
  const positionHistoryRef = useRef<{ x: number; time: number }[]>([]);

  // Hiển thị feedback nhanh cho người dùng (ví dụ: "Đã Click", "Cuộn lên", "Vẫy tay")
  const setFeedback = useCallback((type: GestureActionFeedback['type'], message: string) => {
    setState((prev) => ({
      ...prev,
      actionFeedback: { type, message, timestamp: Date.now() },
    }));

    if (lastFeedbackTimerRef.current) {
      clearTimeout(lastFeedbackTimerRef.current);
    }
    lastFeedbackTimerRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, actionFeedback: null }));
    }, 1200);
  }, []);

  // Khởi tạo MediaPipe GestureRecognizer
  const initRecognizer = useCallback(async () => {
    if (recognizerRef.current) return recognizerRef.current;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      const recognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
      });
      recognizerRef.current = recognizer;
      setState((prev) => ({ ...prev, isLoading: false }));
      return recognizer;
    } catch (err: any) {
      console.error('[HandGesture] Failed to init MediaPipe:', err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Không thể tải mô hình nhận diện tay. Vui lòng thử lại.',
      }));
      return null;
    }
  }, []);

  // Thực hiện click tại tọa độ ảo
  const executeVirtualClick = useCallback(
    (screenX: number, screenY: number) => {
      const now = Date.now();
      if (now - lastClickTimeRef.current < 450) return; // Cooldown 450ms
      lastClickTimeRef.current = now;

      // Ẩn tạm con trỏ để không bắt nhầm chính con trỏ ảo
      const targetElement = document.elementFromPoint(screenX, screenY);

      if (targetElement) {
        // Tìm element có thể tương tác gần nhất
        const clickable =
          targetElement.closest<HTMLElement>(
            'button, a, input, select, textarea, [role="button"], [data-clickable="true"], .clickable, label'
          ) || (targetElement as HTMLElement);

        clickable.focus?.();
        clickable.click?.();

        // Dispatch sự kiện click chuẩn cho cả React/Vanilla
        const mouseClickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: screenX,
          clientY: screenY,
        });
        clickable.dispatchEvent(mouseClickEvent);

        setFeedback('click', 'Đã nhấn (Click)');
        onPinchClick?.(screenX, screenY, clickable);
      }
    },
    [onPinchClick, setFeedback]
  );

  // Vẽ skeleton bàn tay lên canvas mini
  const drawHandSkeleton = useCallback(
    (ctx: CanvasRenderingContext2D, landmarks: { x: number; y: number }[], isPinch: boolean) => {
      const width = ctx.canvas.width;
      const height = ctx.canvas.height;

      ctx.clearRect(0, 0, width, height);

      // 1. Vẽ các đường nối xương ngón tay
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = isPinch ? '#10b981' : '#f59e0b'; // Xanh ngọc khi pinch, Vàng gold khi bình thường

      HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];
        if (!start || !end) return;

        // Lưu ý lật ngang (mirror): x' = (1 - x) * width
        const x1 = (1 - start.x) * width;
        const y1 = start.y * height;
        const x2 = (1 - end.x) * width;
        const y2 = end.y * height;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      // 2. Vẽ đường nối đặc biệt giữa ngón cái và ngón trỏ (để biểu thị khoảng cách pinch)
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      if (thumbTip && indexTip) {
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = isPinch ? 3 : 1.5;
        ctx.strokeStyle = isPinch ? '#22c55e' : '#ec4899';
        ctx.moveTo((1 - thumbTip.x) * width, thumbTip.y * height);
        ctx.lineTo((1 - indexTip.x) * width, indexTip.y * height);
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash
      }

      // 3. Vẽ 21 khớp xương (landmarks)
      landmarks.forEach((pt, idx) => {
        const x = (1 - pt.x) * width;
        const y = pt.y * height;

        ctx.beginPath();
        // Đầu ngón trỏ và ngón cái vẽ to hơn
        const isTip = idx === 4 || idx === 8;
        const radius = isTip ? 5.5 : 3.5;
        ctx.arc(x, y, radius, 0, 2 * Math.PI);

        if (idx === 8) {
          ctx.fillStyle = '#38bdf8'; // Đầu ngón trỏ - Con trỏ chuột (Cyan)
        } else if (idx === 4) {
          ctx.fillStyle = isPinch ? '#22c55e' : '#f43f5e'; // Đầu ngón cái (Green/Pink)
        } else {
          ctx.fillStyle = '#ffffff';
        }
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#000000';
        ctx.stroke();
      });
    },
    []
  );

  // Vòng lặp xử lý frame video bằng requestAnimationFrame
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const recognizer = recognizerRef.current;
    const canvas = canvasRef.current;

    if (!video || !recognizer || video.readyState < 2) {
      animFrameIdRef.current = requestAnimationFrame(processFrame);
      return;
    }

    try {
      const nowInMs = performance.now();
      const results = recognizer.recognizeForVideo(video, nowInMs);

      const hasHands = results.landmarks && results.landmarks.length > 0;

      if (hasHands) {
        const landmarks = results.landmarks[0];
        const gestures = results.gestures && results.gestures[0];
        const topGesture = (gestures && gestures[0]?.categoryName) as GestureType || 'None';

        // 1. Tọa độ đầu ngón trỏ (Landmark 8) làm con trỏ chuột
        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];
        const wrist = landmarks[0];
        const indexMcp = landmarks[5];

        // Lật trục X (mirroring)
        const mirroredX = 1 - indexTip.x;
        const mirroredY = indexTip.y;

        // Tọa độ màn hình đích
        const targetScreenX = mirroredX * window.innerWidth;
        const targetScreenY = mirroredY * window.innerHeight;

        // Làm mượt con trỏ bằng Lerp (Exponential Smoothing)
        const lerpFactor = 0.28;
        const currentSmoothed = smoothedCursorRef.current;
        currentSmoothed.x += (targetScreenX - currentSmoothed.x) * lerpFactor;
        currentSmoothed.y += (targetScreenY - currentSmoothed.y) * lerpFactor;
        currentSmoothed.rawX = mirroredX;
        currentSmoothed.rawY = mirroredY;

        // 2. PHƯƠNG ÁN A: Tính toán Pinch (Chụm ngón cái và ngón trỏ để Click)
        // Chuẩn hóa khoảng cách theo kích thước bàn tay (wrist -> indexMcp)
        const handScale = Math.hypot(wrist.x - indexMcp.x, wrist.y - indexMcp.y) || 0.2;
        const rawPinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
        const normalizedPinchDist = rawPinchDist / handScale;

        // Ngưỡng chụm: < 0.35 coi là chụm ngón
        const pinchThreshold = 0.38;
        const isCurrentlyPinching = normalizedPinchDist < pinchThreshold;
        const pinchStrength = Math.max(0, Math.min(1, (pinchThreshold - normalizedPinchDist) / pinchThreshold));

        // Kích hoạt click khi bắt đầu chuyển từ không chụm sang chụm
        if (state.mode !== 'gesture_only') {
          if (isCurrentlyPinching && !isPinchingRef.current) {
            executeVirtualClick(currentSmoothed.x, currentSmoothed.y);
          }
        }
        isPinchingRef.current = isCurrentlyPinching;

        // 3. PHƯƠNG ÁN B: Điều hướng tự động (Cuộn trang & Vẫy tay chuyển trang)
        if (state.mode !== 'cursor_only') {
          // B1: Tự động cuộn trang (Auto-Scroll) khi tay ở phía trên hoặc phía dưới khung hình
          const scrollMarginTop = 0.22;
          const scrollMarginBottom = 0.78;

          if (indexTip.y < scrollMarginTop) {
            const intensity = Math.min(25, Math.max(8, (scrollMarginTop - indexTip.y) * 80));
            window.scrollBy({ top: -intensity, behavior: 'auto' });
            setFeedback('scroll_up', 'Đang cuộn lên ↑');
          } else if (indexTip.y > scrollMarginBottom) {
            const intensity = Math.min(25, Math.max(8, (indexTip.y - scrollMarginBottom) * 80));
            window.scrollBy({ top: intensity, behavior: 'auto' });
            setFeedback('scroll_down', 'Đang cuộn xuống ↓');
          }

          // B2: Nhận diện cử chỉ vẫy tay trái / phải (Swipe detection)
          const now = Date.now();
          const palmX = 1 - wrist.x;
          const history = positionHistoryRef.current;
          history.push({ x: palmX, time: now });

          // Chỉ giữ lại lịch sử trong 300ms gần nhất
          const recentHistory = history.filter((pt) => now - pt.time <= 300);
          positionHistoryRef.current = recentHistory;

          if (recentHistory.length >= 4 && now - lastSwipeTimeRef.current > 900) {
            const oldest = recentHistory[0];
            const deltaX = palmX - oldest.x;
            const deltaTime = now - oldest.time;
            const velocity = deltaX / Math.max(1, deltaTime); // px/ms

            // Vẫy tay sang phải (deltaX > 0.18 và vận tốc đủ nhanh)
            if (deltaX > 0.18 && velocity > 0.0007) {
              lastSwipeTimeRef.current = now;
              setFeedback('swipe_right', 'Vẫy sang phải → (Next)');
              if (onSwipeRight) {
                onSwipeRight();
              } else {
                window.history.forward();
              }
            }
            // Vẫy tay sang trái (deltaX < -0.18 và vận tốc đủ nhanh)
            else if (deltaX < -0.18 && velocity < -0.0007) {
              lastSwipeTimeRef.current = now;
              setFeedback('swipe_left', 'Vẫy sang trái ← (Back)');
              if (onSwipeLeft) {
                onSwipeLeft();
              } else {
                window.history.back();
              }
            }
          }
        }

        // Vẽ skeleton lên canvas nếu có canvas
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            drawHandSkeleton(ctx, landmarks, isCurrentlyPinching);
          }
        }

        // Cập nhật State
        setState((prev) => ({
          ...prev,
          handDetected: true,
          cursor: { ...currentSmoothed },
          isPinching: isCurrentlyPinching,
          pinchStrength,
          detectedGesture: topGesture,
        }));
      } else {
        // Không phát hiện bàn tay
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
        setState((prev) => ({
          ...prev,
          handDetected: false,
          isPinching: false,
          pinchStrength: 0,
          detectedGesture: 'None',
        }));
      }
    } catch (err) {
      console.warn('[HandGesture] Frame processing error:', err);
    }

    animFrameIdRef.current = requestAnimationFrame(processFrame);
  }, [drawHandSkeleton, executeVirtualClick, onSwipeLeft, onSwipeRight, setFeedback, state.mode]);

  // Bật camera
  const startCamera = useCallback(async () => {
    try {
      const recognizer = await initRecognizer();
      if (!recognizer) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          if (canvasRef.current && videoRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth || 640;
            canvasRef.current.height = videoRef.current.videoHeight || 480;
          }
          animFrameIdRef.current = requestAnimationFrame(processFrame);
        };
      }

      setState((prev) => ({ ...prev, isActive: true, error: null }));
    } catch (err: any) {
      console.error('[HandGesture] Cannot access camera:', err);
      setState((prev) => ({
        ...prev,
        isActive: false,
        error:
          err.name === 'NotAllowedError'
            ? 'Trình duyệt chưa được cấp quyền sử dụng Camera. Vui lòng cho phép quyền Camera.'
            : 'Không thể mở Camera trên thiết bị này.',
      }));
    }
  }, [initRecognizer, processFrame]);

  // Tắt camera
  const stopCamera = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    setState((prev) => ({
      ...prev,
      isActive: false,
      handDetected: false,
      isPinching: false,
      detectedGesture: 'None',
      actionFeedback: null,
    }));
  }, []);

  const toggleCamera = useCallback(() => {
    if (state.isActive) {
      stopCamera();
    } else {
      startCamera();
    }
  }, [startCamera, state.isActive, stopCamera]);

  const setMode = useCallback((newMode: ActiveMode) => {
    setState((prev) => ({ ...prev, mode: newMode }));
  }, []);

  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (lastFeedbackTimerRef.current) {
        clearTimeout(lastFeedbackTimerRef.current);
      }
    };
  }, [stopCamera]);

  return {
    state,
    videoRef,
    canvasRef,
    toggleCamera,
    startCamera,
    stopCamera,
    setMode,
  };
}
