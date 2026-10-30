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

// ── Web Audio Synthesizer cho phản hồi âm thanh & xúc giác (Zero Asset Overhead) ──
let audioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playHapticSound(type: 'click' | 'hover') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'click') {
      // Âm thanh Click cơ học dứt khoát: 820Hz tụt xuống 200Hz trong 40ms
      osc.type = 'sine';
      osc.frequency.setValueAtTime(820, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(20);
      }
    } else if (type === 'hover') {
      // Âm thanh "tick" siêu nhẹ khi nam châm hút mục tiêu
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1150, now);
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
      osc.start(now);
      osc.stop(now + 0.02);
    }
  } catch {
    // Không chặn luồng nếu audio bị hạn chế bởi trình duyệt
  }
}

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
    dwellProgress: 0,
    detectedGesture: 'None',
    actionFeedback: null,
    mode: initialMode,
    isHoveringClickable: false,
  });

  // Đồng bộ props vào Refs để tránh re-create processFrame loop liên tục
  const modeRef = useRef<ActiveMode>(initialMode);
  modeRef.current = state.mode;
  const isMinimizedRef = useRef<boolean>(isMinimized);
  isMinimizedRef.current = isMinimized;
  const onSwipeLeftRef = useRef(onSwipeLeft);
  onSwipeLeftRef.current = onSwipeLeft;
  const onSwipeRightRef = useRef(onSwipeRight);
  onSwipeRightRef.current = onSwipeRight;
  const onPinchClickRef = useRef(onPinchClick);
  onPinchClickRef.current = onPinchClick;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Bộ lọc 1-Euro Filter 2D chuẩn quốc tế cho HCI:
  // - minCutoff = 2.8: Tần số đủ cao để loại bỏ độ trễ phản hồi ngay cả khi chuyển động chậm
  // - beta = 0.22: Mở rộng tần số cắt ngay tức thì khi vung tay, bù đắp hoàn toàn độ trễ của frame
  const euroFilterRef = useRef(new OneEuroFilter2D(2.8, 0.22, 1.0));

  // Tọa độ tham chiếu
  const cursorCoordinatesRef = useRef<HandCursor>({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    rawX: 0.5,
    rawY: 0.5,
  });

  // Chống trôi khi pinch
  const pinchLockedPosRef = useRef<{ x: number; y: number } | null>(null);

  // Ngưỡng Hysteresis cho Pinch Click siết chặt (tránh click nhầm khi di chuyển bàn tay)
  const isPinchingRef = useRef(false);
  const PINCH_TRIGGER_THRESHOLD = 0.26;
  const PINCH_RELEASE_THRESHOLD = 0.40;

  // Dwell-to-Click: Tự động bấm khi dừng yên trên nút bấm
  const dwellStartTimeRef = useRef<number | null>(null);
  const dwellProgressRef = useRef<number>(0);

  // Hàng đợi biểu quyết cử chỉ (Temporal Voting Buffer) để triệt tiêu hiện tượng flickering
  const gestureHistoryRef = useRef<GestureType[]>([]);
  const stableGestureRef = useRef<GestureType>('None');

  // Quản lý debounce & thời gian MediaPipe
  const lastClickTimeRef = useRef(0);
  const lastFeedbackTimerRef = useRef<any>(null);

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
      if (now - lastClickTimeRef.current < 450) return;
      lastClickTimeRef.current = now;

      const targetElement = document.elementFromPoint(screenX, screenY);

      if (targetElement) {
        const clickable =
          targetElement.closest<HTMLElement>(
            'button, a, input, select, textarea, [role="button"], [data-clickable="true"], .clickable, label, .client-menu-card, .client-cart-btn, .menu-card'
          ) || (targetElement as HTMLElement);

        clickable.focus?.();

        const mouseClickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: screenX,
          clientY: screenY,
        });
        clickable.dispatchEvent(mouseClickEvent);

        playHapticSound('click');
        setFeedback('click', 'Đã nhấn (Click)');
        onPinchClickRef.current?.(screenX, screenY, clickable);
      }
    },
    [setFeedback]
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

  // Vòng lặp xử lý video frame (60 - 120 FPS không nghẽn)
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
          const rawTopGesture = ((results.gestures?.[0]?.[0]?.categoryName) as GestureType) || 'None';

          // BƯỚC 0: Biểu quyết cử chỉ (Temporal Voting Buffer) để triệt tiêu hiện tượng flickering
          gestureHistoryRef.current.push(rawTopGesture);
          if (gestureHistoryRef.current.length > 5) {
            gestureHistoryRef.current.shift();
          }
          const counts: Record<string, number> = {};
          for (const g of gestureHistoryRef.current) {
            counts[g] = (counts[g] || 0) + 1;
          }
          let stableGesture: GestureType = 'None';
          let maxCount = 0;
          for (const [g, count] of Object.entries(counts)) {
            if (count > maxCount && count >= 3) {
              maxCount = count;
              stableGesture = g as GestureType;
            }
          }
          if (maxCount < 3 && gestureHistoryRef.current.length >= 3) {
            stableGesture = stableGestureRef.current;
          } else {
            stableGestureRef.current = stableGesture;
          }

          const indexTip = landmarks[8];
          const thumbTip = landmarks[4];
          const wrist = landmarks[0];
          const indexMcp = landmarks[5];
          const pinkyMcp = landmarks[17];
          const middleMcp = landmarks[9];

          // Lật trục X (mirroring)
          const rawIndexMirroredX = 1 - indexTip.x;
          const rawIndexMirroredY = indexTip.y;
          const rawThumbMirroredX = 1 - thumbTip.x;
          const rawThumbMirroredY = thumbTip.y;

          // Tính toán kích thước bàn tay chuẩn hóa 3D
          const palmWidth = Math.hypot(
            indexMcp.x - pinkyMcp.x,
            indexMcp.y - pinkyMcp.y,
            (indexMcp.z || 0) - (pinkyMcp.z || 0)
          ) || 0.15;
          const palmHeight = Math.hypot(
            wrist.x - middleMcp.x,
            wrist.y - middleMcp.y,
            (wrist.z || 0) - (middleMcp.z || 0)
          ) || 0.2;
          const handScale = (palmWidth * 1.2 + palmHeight * 0.8) / 2;

          // Tính toán khoảng cách chụm ngón (Pinch) 3D
          const rawPinchDist = Math.hypot(
            thumbTip.x - indexTip.x,
            thumbTip.y - indexTip.y,
            (thumbTip.z || 0) - (indexTip.z || 0)
          );
          const normalizedPinchDist = rawPinchDist / handScale;

          // Độ mạnh lực chụm (0 -> 1)
          const pinchStrength = Math.max(0, Math.min(1, (PINCH_RELEASE_THRESHOLD - normalizedPinchDist) / (PINCH_RELEASE_THRESHOLD - PINCH_TRIGGER_THRESHOLD)));

          // BƯỚC 1: Pinch Midpoint Blending - Chống giật ngón khi chụm
          // Khi chụm ngón, ngón trỏ sẽ tự nhiên co về phía ngón cái.
          // Ta chuyển dần tọa độ trỏ về trọng tâm (midpoint) để con trỏ đứng yên tuyệt đối không bị giật lệch.
          let rawTargetX = rawIndexMirroredX;
          let rawTargetY = rawIndexMirroredY;
          if (pinchStrength > 0.25) {
            const blend = Math.min(1, (pinchStrength - 0.25) / 0.5);
            const midX = (rawIndexMirroredX + rawThumbMirroredX) / 2;
            const midY = (rawIndexMirroredY + rawThumbMirroredY) / 2;
            rawTargetX = rawIndexMirroredX * (1 - blend) + midX * blend;
            rawTargetY = rawIndexMirroredY * (1 - blend) + midY * blend;
          }

          // BƯỚC 2: Hiệu chuẩn Active Box (FOV Calibration)
          const mappedX = Math.max(0, Math.min(1, (rawTargetX - ACTIVE_BOX_MARGIN_X) / (1 - 2 * ACTIVE_BOX_MARGIN_X)));
          const mappedY = Math.max(0, Math.min(1, (rawTargetY - ACTIVE_BOX_MARGIN_Y) / (1 - 2 * ACTIVE_BOX_MARGIN_Y)));

          const targetScreenX = mappedX * window.innerWidth;
          const targetScreenY = mappedY * window.innerHeight;

          // BƯỚC 3: 1-Euro Filter 2D với phản hồi tốc độ tức thì (minCutoff=2.8, beta=0.22)
          const filteredPos = euroFilterRef.current.filter(targetScreenX, targetScreenY, nowInMs);
          const vel = euroFilterRef.current.getVelocity();
          const speed = Math.hypot(vel.vx, vel.vy); // Tốc độ di chuyển tính bằng px/giây

          // BƯỚC 4: Bù trễ ngoại suy vận tốc (Dead Reckoning - 22ms)
          // Bù trừ độ trễ phần cứng camera 30FPS, giúp con trỏ dính sát vào bàn tay
          const PREDICT_TIME = 0.022;
          const predictedX = Math.max(0, Math.min(window.innerWidth, filteredPos.x + vel.vx * PREDICT_TIME));
          const predictedY = Math.max(0, Math.min(window.innerHeight, filteredPos.y + vel.vy * PREDICT_TIME));

          // BƯỚC 5: Hysteresis Pinch Click với chốt an toàn vận tốc
          let isCurrentlyPinching = isPinchingRef.current;
          if (!isPinchingRef.current && normalizedPinchDist < PINCH_TRIGGER_THRESHOLD) {
            // Chỉ cho phép kích hoạt pinch nếu bàn tay không vung quá nhanh (speed < 300px/s)
            if (speed < 300) {
              isCurrentlyPinching = true;
            }
          } else if (isPinchingRef.current && normalizedPinchDist > PINCH_RELEASE_THRESHOLD) {
            isCurrentlyPinching = false;
          }

          // Chống trôi vị trí (Pinch Drift Anchor khi lực chụm > 60%)
          let finalScreenX = predictedX;
          let finalScreenY = predictedY;

          if (pinchStrength > 0.6) {
            if (!pinchLockedPosRef.current) {
              pinchLockedPosRef.current = { x: predictedX, y: predictedY };
            }
            finalScreenX = pinchLockedPosRef.current.x;
            finalScreenY = pinchLockedPosRef.current.y;
          } else {
            pinchLockedPosRef.current = null;
          }

          // BƯỚC 6: Nam châm hút mục tiêu (Magnetic Snapping)
          let isHovering = false;
          let hoveredClickable: HTMLElement | null = null;
          const hoveredEl = document.elementFromPoint(finalScreenX, finalScreenY);
          if (hoveredEl) {
            hoveredClickable = hoveredEl.closest<HTMLElement>(
              'button, a, input, select, textarea, [role="button"], [data-clickable="true"], .clickable, label, .client-menu-card, .menu-card, .gesture-scroll-btn'
            );
            if (hoveredClickable) {
              isHovering = true;
              if (lastHoveredElementRef.current !== hoveredClickable) {
                lastHoveredElementRef.current?.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
                hoveredClickable.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                lastHoveredElementRef.current = hoveredClickable;
                playHapticSound('hover');
              }

              const rect = hoveredClickable.getBoundingClientRect();
              if (rect.width < 200 && rect.height < 140) {
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const distToCenter = Math.hypot(finalScreenX - centerX, finalScreenY - centerY);
                if (distToCenter < 45 && pinchStrength < 0.6) {
                  finalScreenX += (centerX - finalScreenX) * 0.30;
                  finalScreenY += (centerY - finalScreenY) * 0.30;
                }
              }
            } else {
              if (lastHoveredElementRef.current) {
                lastHoveredElementRef.current.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
                lastHoveredElementRef.current = null;
              }
            }
          }

          // BƯỚC 7: Dwell-to-Click (Giữ yên 0.6s để tự động Click)
          // Loại bỏ 100% cảm giác mỏi tay và sai sót trượt ngón khi chụm
          const currentMode = modeRef.current;
          let currentDwellProgress = 0;

          if (currentMode !== 'gesture_only' && isHovering && speed < 85 && !isCurrentlyPinching) {
            if (dwellStartTimeRef.current === null) {
              dwellStartTimeRef.current = nowInMs;
            } else {
              const elapsed = nowInMs - dwellStartTimeRef.current;
              currentDwellProgress = Math.min(1, elapsed / 600); // 600ms = 0.6 giây
              dwellProgressRef.current = currentDwellProgress;

              if (currentDwellProgress >= 1.0) {
                // Tự động kích hoạt Click!
                executeVirtualClick(finalScreenX, finalScreenY);
                dwellStartTimeRef.current = null;
                dwellProgressRef.current = 0;
                currentDwellProgress = 0;
              }
            }
          } else {
            dwellStartTimeRef.current = null;
            dwellProgressRef.current = 0;
            currentDwellProgress = 0;
          }

          // Cập nhật tọa độ tham chiếu
          cursorCoordinatesRef.current = {
            x: finalScreenX,
            y: finalScreenY,
            rawX: mappedX,
            rawY: mappedY,
          };

          // BƯỚC 8: Trực tiếp điều khiển DOM (Direct DOM Manipulation 60-120fps không lag)
          if (cursorEl) {
            cursorEl.style.transform = `translate3d(${finalScreenX}px, ${finalScreenY}px, 0)`;
          }

          // BƯỚC 9: Kích hoạt Click khi chụm ngón (Pinch Click)
          if (currentMode !== 'gesture_only') {
            if (isCurrentlyPinching && !isPinchingRef.current) {
              executeVirtualClick(finalScreenX, finalScreenY);
            }
          }
          isPinchingRef.current = isCurrentlyPinching;

          // BƯỚC 10: Vẽ trực tiếp cả video camera và skeleton lên Canvas
          if (!isMinimizedRef.current && canvas) {
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

          // BƯỚC 11: Cập nhật React State có kiểm soát (Throttle ~15 FPS cho UI badges)
          const shouldUpdateState =
            nowInMs - lastStateThrottleTimeRef.current > 65 ||
            !state.handDetected ||
            state.isPinching !== isCurrentlyPinching ||
            state.isHoveringClickable !== isHovering ||
            Math.abs(state.dwellProgress - currentDwellProgress) > 0.08 ||
            state.detectedGesture !== stableGesture;

          if (shouldUpdateState) {
            lastStateThrottleTimeRef.current = nowInMs;
            setState((prev) => ({
              ...prev,
              handDetected: true,
              cursor: { ...cursorCoordinatesRef.current },
              isPinching: isCurrentlyPinching,
              pinchStrength,
              dwellProgress: currentDwellProgress,
              detectedGesture: stableGesture,
              isHoveringClickable: isHovering,
            }));
          }
        } else {
          // Không có tay trong frame
          euroFilterRef.current.reset();
          pinchLockedPosRef.current = null;
          gestureHistoryRef.current = [];
          stableGestureRef.current = 'None';
          dwellStartTimeRef.current = null;
          dwellProgressRef.current = 0;

          if (!isMinimizedRef.current && canvas) {
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
              dwellProgress: 0,
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
    state.detectedGesture,
    state.dwellProgress,
    state.handDetected,
    state.isHoveringClickable,
    state.isPinching,
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
      gestureHistoryRef.current = [];
      stableGestureRef.current = 'None';
      dwellStartTimeRef.current = null;
      dwellProgressRef.current = 0;
      lastTimestampRef.current = 0;
      lastVideoTimeRef.current = -1;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${window.innerWidth / 2}px, ${window.innerHeight / 2}px, 0)`;
      }

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
    gestureHistoryRef.current = [];
    stableGestureRef.current = 'None';
    dwellStartTimeRef.current = null;
    dwellProgressRef.current = 0;

    setState((prev) => ({
      ...prev,
      isActive: false,
      isLoading: false,
      handDetected: false,
      isPinching: false,
      dwellProgress: 0,
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
