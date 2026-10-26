import { useState, useEffect, useRef, useCallback } from 'react';
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import type { HandGestureState, HandCursor, GestureType, ActiveMode, GestureActionFeedback } from './types';
import { OneEuroFilter2D } from './OneEuroFilter';

// 21 Khớp xương bàn tay
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Ngón cái
  [0, 5], [5, 6], [6, 7], [7, 8],       // Ngón trỏ
  [5, 9], [9, 10], [10, 11], [11, 12],   // Ngón giữa
  [9, 13], [13, 14], [14, 15], [15, 16], // Ngón áp út
  [13, 17], [17, 18], [18, 19], [19, 20],// Ngón út
  [0, 17],                               // Cạnh bàn tay
];

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';

// Vùng hoạt động trong camera (FOV Active Box: 14% lề)
const ACTIVE_BOX_MARGIN_X = 0.14;
const ACTIVE_BOX_MARGIN_Y = 0.14;

export interface UseHandGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onPinchClick?: (x: number, y: number, target: Element | null) => void;
  initialMode?: ActiveMode;
  isMinimized?: boolean;
}

export function useHandGestureEngine(options: UseHandGestureOptions = {}) {
  const { onSwipeLeft, onSwipeRight, onPinchClick, initialMode = 'all', isMinimized = false } = options;

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
    isHoveringClickable: false,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Bộ lọc 1-Euro Filter 2D
  const euroFilterRef = useRef(new OneEuroFilter2D(1.0, 0.009, 1.0));

  // Tọa độ tham chiếu
  const cursorCoordinatesRef = useRef<HandCursor>({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    rawX: 0.5,
    rawY: 0.5,
  });

  // Chống trôi khi pinch
  const pinchLockedPosRef = useRef<{ x: number; y: number } | null>(null);

  // Ngưỡng Hysteresis cho Pinch Click
  const isPinchingRef = useRef(false);
  const PINCH_TRIGGER_THRESHOLD = 0.34;
  const PINCH_RELEASE_THRESHOLD = 0.46;

  // Quản lý debounce & thời gian MediaPipe
  const lastClickTimeRef = useRef(0);
  const lastSwipeTimeRef = useRef(0);
  const lastFeedbackTimerRef = useRef<any>(null);
  const positionHistoryRef = useRef<{ x: number; time: number }[]>([]);
  const edgeDwellTimeRef = useRef<{ edge: 'top' | 'bottom' | null; startTime: number }>({ edge: null, startTime: 0 });

  // Theo dõi timestamp & video time để tránh lỗi MediaPipe
  const lastTimestampRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);

  // Theo dõi hover
  const lastHoveredElementRef = useRef<Element | null>(null);
  const lastStateThrottleTimeRef = useRef(0);

  // Hiển thị feedback nhanh
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

  // Khởi tạo MediaPipe GestureRecognizer với độ nhạy cao (confidence = 0.35)
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
        minHandDetectionConfidence: 0.35,
        minHandPresenceConfidence: 0.35,
        minTrackingConfidence: 0.35,
      });
      recognizerRef.current = recognizer;
      setState((prev) => ({ ...prev, isLoading: false }));
      return recognizer;
    } catch (err: any) {
      console.warn('[HandGesture] GPU delegate failed, trying CPU fallback:', err);
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.35,
          minHandPresenceConfidence: 0.35,
          minTrackingConfidence: 0.35,
        });
        recognizerRef.current = recognizer;
        setState((prev) => ({ ...prev, isLoading: false }));
        return recognizer;
      } catch (cpuErr: any) {
        console.error('[HandGesture] Failed to init MediaPipe on both GPU & CPU:', cpuErr);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Không thể tải mô hình AI nhận diện tay: ' + (cpuErr.message || ''),
        }));
        return null;
      }
    }
  }, []);

  // Thực hiện click chuẩn xác tại vị trí con trỏ
  const executeVirtualClick = useCallback(
    (screenX: number, screenY: number) => {
      const now = Date.now();
      if (now - lastClickTimeRef.current < 400) return;
      lastClickTimeRef.current = now;

      const targetElement = document.elementFromPoint(screenX, screenY);

      if (targetElement) {
        const clickable =
          targetElement.closest<HTMLElement>(
            'button, a, input, select, textarea, [role="button"], [data-clickable="true"], .clickable, label, .client-menu-card, .client-cart-btn'
          ) || (targetElement as HTMLElement);

        clickable.focus?.();
        clickable.click?.();

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

      // 1. Đường nối xương ngón tay
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = isPinch ? '#10b981' : '#f59e0b';

      HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];
        if (!start || !end) return;

        // Lưu ý: canvas đã được lật ngang (mirror) bằng ctx.drawImage,
        // nhưng tọa độ landmark từ MediaPipe là unmirrored (x = 0 bên trái webcam).
        // Khi vẽ lật gương: x_canvas = (1 - x) * width
        const x1 = (1 - start.x) * width;
        const y1 = start.y * height;
        const x2 = (1 - end.x) * width;
        const y2 = end.y * height;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      // 2. Đường ngón cái - ngón trỏ (Pinch meter)
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      if (thumbTip && indexTip) {
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = isPinch ? 4 : 2;
        ctx.strokeStyle = isPinch ? '#22c55e' : '#ec4899';
        ctx.moveTo((1 - thumbTip.x) * width, thumbTip.y * height);
        ctx.lineTo((1 - indexTip.x) * width, indexTip.y * height);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 3. Các khớp ngón tay
      landmarks.forEach((pt, idx) => {
        const x = (1 - pt.x) * width;
        const y = pt.y * height;

        ctx.beginPath();
        const isTip = idx === 4 || idx === 8;
        const radius = isTip ? 6.5 : 4;
        ctx.arc(x, y, radius, 0, 2 * Math.PI);

        if (idx === 8) {
          ctx.fillStyle = '#38bdf8'; // Đầu ngón trỏ
        } else if (idx === 4) {
          ctx.fillStyle = isPinch ? '#22c55e' : '#f43f5e'; // Đầu ngón cái
        } else {
          ctx.fillStyle = '#ffffff';
        }
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#000000';
        ctx.stroke();
      });
    },
    []
  );

  // Vòng lặp xử lý video frame (60 - 120 FPS)
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const recognizer = recognizerRef.current;
    const canvas = canvasRef.current;
    const cursorEl = cursorRef.current;

    // Kiểm tra điều kiện video sẵn sàng
    if (!video || !recognizer || video.readyState < 2 || video.paused || video.videoWidth === 0) {
      animFrameIdRef.current = requestAnimationFrame(processFrame);
      return;
    }

    try {
      const nowInMs = performance.now();

      // MediaPipe yêu cầu timestamp tăng dần nghiêm ngặt và chỉ xử lý khi video có frame mới
      if (nowInMs > lastTimestampRef.current && video.currentTime !== lastVideoTimeRef.current) {
        lastTimestampRef.current = nowInMs;
        lastVideoTimeRef.current = video.currentTime;

        const results = recognizer.recognizeForVideo(video, Math.round(nowInMs));
        const hasHands = results.landmarks && results.landmarks.length > 0;

        if (hasHands) {
          const landmarks = results.landmarks[0];
          const gestures = results.gestures && results.gestures[0];
          const topGesture = ((gestures && gestures[0]?.categoryName) as GestureType) || 'None';

          const indexTip = landmarks[8];
          const thumbTip = landmarks[4];
          const wrist = landmarks[0];
          const indexMcp = landmarks[5];

          // Lật trục X (mirroring)
          const rawMirroredX = 1 - indexTip.x;
          const rawMirroredY = indexTip.y;

          // BƯỚC 1: Hiệu chuẩn Active Box (FOV Calibration)
          const mappedX = Math.max(0, Math.min(1, (rawMirroredX - ACTIVE_BOX_MARGIN_X) / (1 - 2 * ACTIVE_BOX_MARGIN_X)));
          const mappedY = Math.max(0, Math.min(1, (rawMirroredY - ACTIVE_BOX_MARGIN_Y) / (1 - 2 * ACTIVE_BOX_MARGIN_Y)));

          const targetScreenX = mappedX * window.innerWidth;
          const targetScreenY = mappedY * window.innerHeight;

          // BƯỚC 2: 1-Euro Filter 2D
          const filteredPos = euroFilterRef.current.filter(targetScreenX, targetScreenY, nowInMs);

          // BƯỚC 3: Tính toán khoảng cách chụm ngón (Pinch)
          const handScale = Math.hypot(wrist.x - indexMcp.x, wrist.y - indexMcp.y) || 0.2;
          const rawPinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
          const normalizedPinchDist = rawPinchDist / handScale;

          let isCurrentlyPinching = isPinchingRef.current;
          if (!isPinchingRef.current && normalizedPinchDist < PINCH_TRIGGER_THRESHOLD) {
            isCurrentlyPinching = true;
          } else if (isPinchingRef.current && normalizedPinchDist > PINCH_RELEASE_THRESHOLD) {
            isCurrentlyPinching = false;
          }

          const pinchStrength = Math.max(0, Math.min(1, (PINCH_RELEASE_THRESHOLD - normalizedPinchDist) / (PINCH_RELEASE_THRESHOLD - PINCH_TRIGGER_THRESHOLD)));

          // BƯỚC 4: Chống trôi vị trí (Pinch Drift Anchor)
          let finalScreenX = filteredPos.x;
          let finalScreenY = filteredPos.y;

          if (pinchStrength > 0.7) {
            if (!pinchLockedPosRef.current) {
              pinchLockedPosRef.current = { x: filteredPos.x, y: filteredPos.y };
            }
            finalScreenX = pinchLockedPosRef.current.x;
            finalScreenY = pinchLockedPosRef.current.y;
          } else {
            pinchLockedPosRef.current = null;
          }

          // BƯỚC 5: Nam châm hút mục tiêu (Magnetic Snapping)
          let isHovering = false;
          const hoveredEl = document.elementFromPoint(finalScreenX, finalScreenY);
          if (hoveredEl) {
            const clickable = hoveredEl.closest<HTMLElement>(
              'button, a, input, select, textarea, [role="button"], [data-clickable="true"], .clickable, label, .client-menu-card'
            );
            if (clickable) {
              isHovering = true;
              if (lastHoveredElementRef.current !== clickable) {
                lastHoveredElementRef.current?.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
                clickable.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                lastHoveredElementRef.current = clickable;
              }

              const rect = clickable.getBoundingClientRect();
              if (rect.width < 140 && rect.height < 90) {
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const distToCenter = Math.hypot(finalScreenX - centerX, finalScreenY - centerY);
                if (distToCenter < 35 && pinchStrength < 0.7) {
                  finalScreenX += (centerX - finalScreenX) * 0.22;
                  finalScreenY += (centerY - finalScreenY) * 0.22;
                }
              }
            } else {
              if (lastHoveredElementRef.current) {
                lastHoveredElementRef.current.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
                lastHoveredElementRef.current = null;
              }
            }
          }

          // Cập nhật tọa độ tham chiếu
          cursorCoordinatesRef.current = {
            x: finalScreenX,
            y: finalScreenY,
            rawX: mappedX,
            rawY: mappedY,
          };

          // BƯỚC 6: Trực tiếp điều khiển DOM (Direct DOM Manipulation 60-120fps)
          if (cursorEl) {
            cursorEl.style.transform = `translate3d(${finalScreenX}px, ${finalScreenY}px, 0)`;
          }

          // Kích hoạt Click khi chụm ngón
          if (state.mode !== 'gesture_only') {
            if (isCurrentlyPinching && !isPinchingRef.current) {
              executeVirtualClick(finalScreenX, finalScreenY);
            }
          }
          isPinchingRef.current = isCurrentlyPinching;

          // BƯỚC 7: Phương án B - Cuộn trang thông minh & Vẫy tay chuyển trang
          if (state.mode !== 'cursor_only') {
            const isPointing = topGesture === 'Pointing_Up';
            const scrollMarginTop = 0.16;
            const scrollMarginBottom = 0.84;

            const now = Date.now();

            if (mappedY < scrollMarginTop && !isPointing) {
              if (edgeDwellTimeRef.current.edge !== 'top') {
                edgeDwellTimeRef.current = { edge: 'top', startTime: now };
              } else if (now - edgeDwellTimeRef.current.startTime > 120) {
                const speedFactor = (scrollMarginTop - mappedY) / scrollMarginTop;
                const intensity = Math.min(32, Math.max(8, speedFactor * 40));
                window.scrollBy({ top: -intensity, behavior: 'auto' });
                setFeedback('scroll_up', 'Đang cuộn lên ↑');
              }
            } else if (mappedY > scrollMarginBottom) {
              if (edgeDwellTimeRef.current.edge !== 'bottom') {
                edgeDwellTimeRef.current = { edge: 'bottom', startTime: now };
              } else if (now - edgeDwellTimeRef.current.startTime > 120) {
                const speedFactor = (mappedY - scrollMarginBottom) / (1 - scrollMarginBottom);
                const intensity = Math.min(32, Math.max(8, speedFactor * 40));
                window.scrollBy({ top: intensity, behavior: 'auto' });
                setFeedback('scroll_down', 'Đang cuộn xuống ↓');
              }
            } else {
              edgeDwellTimeRef.current = { edge: null, startTime: 0 };
            }

            // Vẫy tay trái / phải
            const palmX = 1 - wrist.x;
            const history = positionHistoryRef.current;
            history.push({ x: palmX, time: now });

            const recentHistory = history.filter((pt) => now - pt.time <= 280);
            positionHistoryRef.current = recentHistory;

            if (recentHistory.length >= 4 && now - lastSwipeTimeRef.current > 850) {
              const oldest = recentHistory[0];
              const deltaX = palmX - oldest.x;
              const deltaTime = now - oldest.time;
              const velocity = deltaX / Math.max(1, deltaTime);

              if (deltaX > 0.16 && velocity > 0.0008) {
                lastSwipeTimeRef.current = now;
                setFeedback('swipe_right', 'Vẫy sang phải → (Next)');
                if (onSwipeRight) {
                  onSwipeRight();
                } else {
                  window.history.forward();
                }
              } else if (deltaX < -0.16 && velocity < -0.0008) {
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

          // BƯỚC 8: Vẽ trực tiếp cả video camera và skeleton lên Canvas
          if (!isMinimized && canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
              }

              // 1. Vẽ camera lật ngang (Mirror)
              ctx.save();
              ctx.scale(-1, 1);
              ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
              ctx.restore();

              // 2. Lớp phủ tối nhẹ để khung xương nổi bật
              ctx.fillStyle = 'rgba(10, 12, 18, 0.2)';
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              // 3. Vẽ bộ xương tay
              drawHandSkeleton(ctx, landmarks, isCurrentlyPinching);
            }
          }

          // BƯỚC 9: Cập nhật React State có kiểm soát (Throttle ~15 FPS)
          const shouldUpdateState =
            nowInMs - lastStateThrottleTimeRef.current > 65 ||
            state.handDetected !== true ||
            state.isPinching !== isCurrentlyPinching ||
            state.isHoveringClickable !== isHovering ||
            state.detectedGesture !== topGesture;

          if (shouldUpdateState) {
            lastStateThrottleTimeRef.current = nowInMs;
            setState((prev) => ({
              ...prev,
              handDetected: true,
              cursor: { ...cursorCoordinatesRef.current },
              isPinching: isCurrentlyPinching,
              pinchStrength,
              detectedGesture: topGesture,
              isHoveringClickable: isHovering,
            }));
          }
        } else {
          // Không có tay trong frame
          euroFilterRef.current.reset();
          pinchLockedPosRef.current = null;

          // Vẫn vẽ video camera lên canvas để người dùng thấy camera đang chạy
          if (!isMinimized && canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx && video.videoWidth > 0) {
              if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
              }
              ctx.save();
              ctx.scale(-1, 1);
              ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
              ctx.restore();
            }
          }

          if (state.handDetected) {
            setState((prev) => ({
              ...prev,
              handDetected: false,
              isPinching: false,
              pinchStrength: 0,
              detectedGesture: 'None',
              isHoveringClickable: false,
            }));
          }
        }
      }
    } catch (err) {
      console.warn('[HandGesture] Frame processing error:', err);
    }

    animFrameIdRef.current = requestAnimationFrame(processFrame);
  }, [
    drawHandSkeleton,
    executeVirtualClick,
    isMinimized,
    onSwipeLeft,
    onSwipeRight,
    setFeedback,
    state.detectedGesture,
    state.handDetected,
    state.isHoveringClickable,
    state.isPinching,
    state.mode,
  ]);

  // Bật camera
  const startCamera = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const recognizer = await initRecognizer();
      if (!recognizer) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
          frameRate: { ideal: 60, min: 30 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch((err) => {
          console.warn('[HandGesture] video.play error:', err);
        });

        if (canvasRef.current && video.videoWidth > 0) {
          canvasRef.current.width = video.videoWidth;
          canvasRef.current.height = video.videoHeight;
        }
      }

      euroFilterRef.current.reset();
      pinchLockedPosRef.current = null;
      lastTimestampRef.current = 0;
      lastVideoTimeRef.current = -1;

      // Khởi động vòng lặp xử lý nếu chưa chạy
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      animFrameIdRef.current = requestAnimationFrame(processFrame);

      setState((prev) => ({ ...prev, isActive: true, isLoading: false, error: null }));
    } catch (err: any) {
      console.error('[HandGesture] Cannot access camera:', err);
      setState((prev) => ({
        ...prev,
        isActive: false,
        isLoading: false,
        error:
          err.name === 'NotAllowedError'
            ? 'Trình duyệt chưa được cấp quyền Camera. Vui lòng bấm vào biểu tượng camera/ổ khóa trên thanh địa chỉ URL để cho phép.'
            : 'Không thể mở Camera trên thiết bị này: ' + (err.message || ''),
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

    euroFilterRef.current.reset();
    pinchLockedPosRef.current = null;

    setState((prev) => ({
      ...prev,
      isActive: false,
      isLoading: false,
      handDetected: false,
      isPinching: false,
      detectedGesture: 'None',
      actionFeedback: null,
      isHoveringClickable: false,
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
    cursorRef,
    toggleCamera,
    startCamera,
    stopCamera,
    setMode,
  };
}
