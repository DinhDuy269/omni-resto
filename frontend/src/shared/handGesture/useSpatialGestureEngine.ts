import { useState, useEffect, useRef, useCallback } from 'react';
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import type {
  GestureType,
  SpatialGestureState,
  SpatialActionType,
  HandSpatialZone,
  GestureSpeedMode,
} from './types';
import { playSpatialSound } from './audioFeedback';

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

// Cấu hình các mức độ nhạy & phản hồi (Speed Profiles)
export const SPEED_PROFILES: Record<GestureSpeedMode, {
  fistHoldMs: number;
  thumbHoldMs: number;
  initialReadingPauseMs: number;
  continuousScrollStepMs: number;
  rightEnterBoundary: number;
  rightExitBoundary: number;
  leftEnterBoundary: number;
  leftExitBoundary: number;
}> = {
  fast: {
    fistHoldMs: 160,
    thumbHoldMs: 360,
    initialReadingPauseMs: 450,
    continuousScrollStepMs: 420,
    rightEnterBoundary: 0.58,
    rightExitBoundary: 0.52,
    leftEnterBoundary: 0.42,
    leftExitBoundary: 0.48,
  },
  balanced: {
    fistHoldMs: 220,
    thumbHoldMs: 450,
    initialReadingPauseMs: 600,
    continuousScrollStepMs: 550,
    rightEnterBoundary: 0.62,
    rightExitBoundary: 0.54,
    leftEnterBoundary: 0.38,
    leftExitBoundary: 0.46,
  },
  relaxed: {
    fistHoldMs: 320,
    thumbHoldMs: 600,
    initialReadingPauseMs: 800,
    continuousScrollStepMs: 700,
    rightEnterBoundary: 0.66,
    rightExitBoundary: 0.56,
    leftEnterBoundary: 0.34,
    leftExitBoundary: 0.44,
  },
};

export interface UseSpatialGestureOptions {
  onSwipeNext?: () => void;
  onSwipePrev?: () => void;
  onGrabDish?: () => void;
  onThumbConfirm?: () => void;
  onSwitchCategory?: () => void;
  initialSpeedMode?: GestureSpeedMode;
}

export function useSpatialGestureEngine(options: UseSpatialGestureOptions = {}) {
  const {
    onSwipeNext,
    onSwipePrev,
    onGrabDish,
    onThumbConfirm,
    onSwitchCategory,
    initialSpeedMode = 'balanced',
  } = options;

  const [speedMode, setSpeedModeState] = useState<GestureSpeedMode>(initialSpeedMode);
  const speedModeRef = useRef<GestureSpeedMode>(speedMode);
  speedModeRef.current = speedMode;

  const [state, setState] = useState<SpatialGestureState>({
    isActive: false,
    isLoading: false,
    error: null,
    handDetected: false,
    currentGesture: 'None',
    recentAction: null,
    fistProgress: 0,
    thumbProgress: 0,
    handZone: null,
    isBraking: false,
    palmX: 0.5,
    isRvfcActive: false,
    speedMode: initialSpeedMode,
  });

  const setSpeedMode = useCallback((mode: GestureSpeedMode) => {
    speedModeRef.current = mode;
    setSpeedModeState(mode);
    setState((prev) => ({ ...prev, speedMode: mode }));
  }, []);

  // Lưu callbacks vào refs để vòng lặp processFrame không bao giờ bị re-create
  const onSwipeNextRef = useRef(onSwipeNext);
  onSwipeNextRef.current = onSwipeNext;
  const onSwipePrevRef = useRef(onSwipePrev);
  onSwipePrevRef.current = onSwipePrev;
  const onGrabDishRef = useRef(onGrabDish);
  onGrabDishRef.current = onGrabDish;
  const onThumbConfirmRef = useRef(onThumbConfirm);
  onThumbConfirmRef.current = onThumbConfirm;
  const onSwitchCategoryRef = useRef(onSwitchCategory);
  onSwitchCategoryRef.current = onSwitchCategory;

  // Trạng thái theo dõi nội bộ trong vòng lặp (100% độc lập với React State)
  const handDetectedRef = useRef(false);
  const currentGestureRef = useRef<GestureType>('None');
  const fistProgressRef = useRef(0);
  const thumbProgressRef = useRef(0);
  const handZoneRef = useRef<HandSpatialZone | null>(null);
  const isBrakingRef = useRef(false);
  const palmXRef = useRef(0.5);
  const lostFramesCountRef = useRef(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const videoCallbackIdRef = useRef<number | null>(null);
  const isUsingRvfcRef = useRef<boolean>(false);
  const processFrameRef = useRef<(frameNow?: number, metadata?: any) => void>(() => {});
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Biểu quyết cử chỉ khử nhiễu
  const gestureHistoryRef = useRef<GestureType[]>([]);
  const stableGestureRef = useRef<GestureType>('None');

  // Điều tốc không gian
  const zoneEnterTimeRef = useRef(0);
  const lastScrollTickTimeRef = useRef(0);
  const hasTriggeredInitialStepRef = useRef(false);
  const lastBrakeSoundTimeRef = useRef(0);

  // Bộ đếm thời gian giữ cử chỉ (Hold timers)
  const fistStartTimeRef = useRef<number | null>(null);
  const thumbStartTimeRef = useRef<number | null>(null);
  const victoryStartTimeRef = useRef<number | null>(null);
  const lastGrabTimeRef = useRef(0);
  const lastThumbTimeRef = useRef(0);
  const lastCategoryTimeRef = useRef(0);

  const lastTimestampRef = useRef<number>(0);
  const lastInferenceTimeRef = useRef<number>(0);
  const lastStateThrottleTimeRef = useRef<number>(0);
  const feedbackTimerRef = useRef<any>(null);

  const triggerFeedback = useCallback((type: SpatialActionType, message: string) => {
    setState((prev) => ({
      ...prev,
      recentAction: { type, message, timestamp: Date.now() },
    }));

    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, recentAction: null }));
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
      console.warn('[SpatialGesture] GPU delegate failed, trying CPU fallback:', err);
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
        console.error('[SpatialGesture] Init failed:', cpuErr);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Không thể mở mô hình AI nhận diện tay: ' + (cpuErr.message || ''),
        }));
        return null;
      }
    }
  }, []);

  // Vẽ bộ xương tay và hướng dẫn 3 vùng trên camera mini HUD
  const drawHandSkeleton = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      landmarks: { x: number; y: number }[],
      gesture: GestureType,
      fistProgress: number,
      thumbProgress: number,
      currentZone: HandSpatialZone | null,
      isBraking: boolean,
      palmX: number,
      isRvfc: boolean,
      leftEnter: number,
      rightEnter: number
    ) => {
      const width = ctx.canvas.width;
      const height = ctx.canvas.height;

      // 1. Vẽ các đường phân chia 3 vùng không gian (Deadband guides)
      const xLeft = leftEnter * width;
      const xRight = rightEnter * width;

      // Tracker Pip vị trí bàn tay trên đỉnh HUD
      const pipX = Math.max(4, Math.min(width - 4, palmX * width));
      ctx.fillStyle = isBraking ? '#eab308' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(pipX, 4, 3, 0, 2 * Math.PI);
      ctx.fill();

      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';

      ctx.beginPath();
      ctx.moveTo(xLeft, 0);
      ctx.lineTo(xLeft, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(xRight, 0);
      ctx.lineTo(xRight, height);
      ctx.stroke();

      // Highlight vùng đang hoạt động
      ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
      if (currentZone === 'left') {
        ctx.fillRect(0, 0, xLeft, height);
      } else if (currentZone === 'right') {
        ctx.fillRect(xRight, 0, width - xRight, height);
      }
      ctx.restore();

      // 2. Vẽ khung xương bàn tay
      ctx.lineWidth = 3;
      ctx.strokeStyle =
        isBraking
          ? '#eab308' // Vàng khi phanh
          : gesture === 'Closed_Fist'
          ? '#22c55e' // Xanh lá khi nắm
          : gesture === 'Thumb_Up'
          ? '#38bdf8' // Xanh dương khi giơ cái
          : currentZone === 'right'
          ? '#34d399' // Xanh ngọc khi tiến
          : currentZone === 'left'
          ? '#fb923c' // Cam khi lùi
          : '#94a3b8'; // Xám khi ở giữa

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

      landmarks.forEach((pt, idx) => {
        const x = (1 - pt.x) * width;
        const y = pt.y * height;

        ctx.beginPath();
        const isTip = [4, 8, 12, 16, 20].includes(idx);
        ctx.arc(x, y, isTip ? 4.5 : 3, 0, 2 * Math.PI);
        ctx.fillStyle = isTip ? '#38bdf8' : '#ffffff';
        ctx.fill();
      });

      // 3. Vòng tròn laser tiến độ khi Nắm tay hoặc Giơ ngón cái
      if (fistProgress > 0 || thumbProgress > 0) {
        const progress = Math.max(fistProgress, thumbProgress);
        const center = landmarks[9] || landmarks[0];
        const cx = (1 - center.x) * width;
        const cy = center.y * height;

        ctx.beginPath();
        ctx.arc(cx, cy, 26, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, 26, -Math.PI / 2, -Math.PI / 2 + progress * 2 * Math.PI);
        ctx.strokeStyle = fistProgress > 0 ? '#22c55e' : '#38bdf8';
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      // 4. Nhãn trạng thái cử chỉ trên mini HUD
      ctx.save();
      ctx.font = 'bold 9.5px sans-serif';
      let label = '🎯 GIỮA (NGHỈ)';
      let badgeColor = '#94a3b8';

      if (isBraking) {
        label = '✋ PHANH DỪNG';
        badgeColor = '#eab308';
      } else if (fistProgress > 0) {
        label = `✊ NẮM (${Math.round(fistProgress * 100)}%)`;
        badgeColor = '#22c55e';
      } else if (thumbProgress > 0) {
        label = `👍 THOÁT (${Math.round(thumbProgress * 100)}%)`;
        badgeColor = '#38bdf8';
      } else if (gesture === 'Victory') {
        label = '✌️ ĐỔI MỤC';
        badgeColor = '#a855f7';
      } else if (currentZone === 'right') {
        label = '👉 TIẾN MÓN';
        badgeColor = '#34d399';
      } else if (currentZone === 'left') {
        label = '👈 LÙI MÓN';
        badgeColor = '#fb923c';
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(4, height - 20, 92, 16);
      ctx.fillStyle = badgeColor;
      ctx.fillText(label, 8, height - 8);

      // 5. Huy hiệu chuẩn API (rVFC vs rAF) ở góc trên bên phải
      ctx.font = 'bold 8px monospace';
      if (isRvfc) {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.95)';
        ctx.fillText('⚡ 0ms rVFC', width - 56, 12);
      } else {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
        ctx.fillText('🔄 rAF 30F', width - 52, 12);
      }
      ctx.restore();
    },
    []
  );

  // Đăng ký nhận frame tiếp theo (ưu tiên rVFC từ hardware, fallback về rAF)
  const scheduleNextFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !mediaStreamRef.current) return;

    if ('requestVideoFrameCallback' in video) {
      isUsingRvfcRef.current = true;
      videoCallbackIdRef.current = (video as any).requestVideoFrameCallback(
        (now: number, meta: any) => {
          processFrameRef.current(now, meta);
        }
      );
    } else {
      isUsingRvfcRef.current = false;
      animFrameIdRef.current = requestAnimationFrame(() => {
        processFrameRef.current(performance.now());
      });
    }
  }, []);

  // Vòng lặp nhận diện cử chỉ (Tối ưu hóa: requestVideoFrameCallback 0ms latency + rAF Fallback)
  const processFrame = useCallback(
    (frameNow?: number, metadata?: any) => {
      const video = videoRef.current;
      const recognizer = recognizerRef.current;
      const canvas = canvasRef.current;

      if (!video || !recognizer || video.readyState < 2 || video.paused || video.videoWidth === 0) {
        scheduleNextFrame();
        return;
      }

      try {
        const profile = SPEED_PROFILES[speedModeRef.current] || SPEED_PROFILES.balanced;
        const nowInMs = metadata?.presentationTime ?? frameNow ?? performance.now();
        const isRvfc = isUsingRvfcRef.current;

        // Nếu rVFC hoạt động: đây là frame mới toanh từ hardware sensor (chạy đúng tốc độ webcam ~30-60 FPS).
        // Nếu dùng rAF: throttle >= 30ms để tránh quét frame trùng lặp gây tốn GPU.
        const timeSinceLastInference = nowInMs - lastInferenceTimeRef.current;
        if (isRvfc || timeSinceLastInference >= 30) {
          lastInferenceTimeRef.current = nowInMs;
          const timestamp = Math.max(lastTimestampRef.current + 1, Math.round(nowInMs));
          lastTimestampRef.current = timestamp;

          const results = recognizer.recognizeForVideo(video, timestamp);
          const hasHands = results.landmarks && results.landmarks.length > 0;
          const now = Date.now();

          if (hasHands) {
            lostFramesCountRef.current = 0;
            const landmarks = results.landmarks[0];
            const rawTopGesture = ((results.gestures?.[0]?.[0]?.categoryName) as GestureType) || 'None';

            // 1. Biểu quyết cử chỉ trong 3 frame để khử nhiễu nhanh
            gestureHistoryRef.current.push(rawTopGesture);
            if (gestureHistoryRef.current.length > 3) {
              gestureHistoryRef.current.shift();
            }
            const counts: Record<string, number> = {};
            for (const g of gestureHistoryRef.current) {
              counts[g] = (counts[g] || 0) + 1;
            }
            let stableGesture: GestureType = 'None';
            let maxCount = 0;
            for (const [g, count] of Object.entries(counts)) {
              if (count > maxCount && count >= 2) {
                maxCount = count;
                stableGesture = g as GestureType;
              }
            }
            if (maxCount >= 2) {
              stableGestureRef.current = stableGesture;
            } else {
              stableGesture = stableGestureRef.current;
            }

            // 2. Xác định vị trí trọng tâm bàn tay với Hysteresis chống chớp mép theo profile
            const handCenterX = (landmarks[0].x + landmarks[9].x) / 2;
            const palmX = 1 - handCenterX; // 0 = trái, 1 = phải
            palmXRef.current = palmX;

            let currentZone: HandSpatialZone = handZoneRef.current || 'center';
            if (currentZone === 'center') {
              if (palmX > profile.rightEnterBoundary) currentZone = 'right';
              else if (palmX < profile.leftEnterBoundary) currentZone = 'left';
            } else if (currentZone === 'right') {
              // Cần lùi sâu vào trong mới về lại center
              if (palmX < profile.rightExitBoundary) currentZone = 'center';
            } else if (currentZone === 'left') {
              // Cần đưa sâu vào trong mới về lại center
              if (palmX > profile.leftExitBoundary) currentZone = 'center';
            }

            // Theo dõi thời điểm chuyển vùng
            if (currentZone !== handZoneRef.current) {
              zoneEnterTimeRef.current = now;
              hasTriggeredInitialStepRef.current = false;
            }

            // ── PHÂN CẤP ƯU TIÊN CỬ CHỈ (GESTURE HIERARCHY) ──

            let isBraking = false;
            let currentFistProgress = 0;
            let currentThumbProgress = 0;

            // ƯU TIÊN 1: ✋ XÒE BÀN TAY (Open_Palm) -> Phanh khẩn cấp, dừng cuộn để quan sát
            const isOpenPalm = stableGesture === 'Open_Palm' || rawTopGesture === 'Open_Palm';
            if (isOpenPalm) {
              isBraking = true;
              fistStartTimeRef.current = null;
              thumbStartTimeRef.current = null;
              hasTriggeredInitialStepRef.current = false;

              if (now - lastBrakeSoundTimeRef.current > 1400) {
                lastBrakeSoundTimeRef.current = now;
                playSpatialSound('brake');
                triggerFeedback('palm_pause', '✋ Đã phanh dừng để ngắm món');
              }
            }
            // ƯU TIÊN 2: ✊ NẮM TAY (Closed_Fist) -> Nhặt món vào giỏ hàng
            else if (stableGesture === 'Closed_Fist' || rawTopGesture === 'Closed_Fist') {
              isBraking = true;
              thumbStartTimeRef.current = null;

              if (fistStartTimeRef.current === null) {
                fistStartTimeRef.current = now;
              } else {
                const elapsed = now - fistStartTimeRef.current;
                currentFistProgress = Math.min(1, elapsed / profile.fistHoldMs);
                if (currentFistProgress >= 1.0 && now - lastGrabTimeRef.current > 850) {
                  lastGrabTimeRef.current = now;
                  fistStartTimeRef.current = null;
                  currentFistProgress = 0;
                  playSpatialSound('grab');
                  triggerFeedback('grab_dish', '✨ Đã nhặt vào giỏ hàng!');
                  onGrabDishRef.current?.();
                }
              }
            }
            // ƯU TIÊN 3: 👍 GIƠ NGÓN CÁI (Thumb_Up) -> Thoát giao diện / Mở giỏ hàng
            else if (stableGesture === 'Thumb_Up' || rawTopGesture === 'Thumb_Up') {
              isBraking = true;
              fistStartTimeRef.current = null;

              if (thumbStartTimeRef.current === null) {
                thumbStartTimeRef.current = now;
              } else {
                const elapsed = now - thumbStartTimeRef.current;
                currentThumbProgress = Math.min(1, elapsed / profile.thumbHoldMs);
                if (currentThumbProgress >= 1.0 && now - lastThumbTimeRef.current > 1200) {
                  lastThumbTimeRef.current = now;
                  thumbStartTimeRef.current = null;
                  currentThumbProgress = 0;
                  playSpatialSound('confirm');
                  triggerFeedback('thumb_confirm', '👍 Đóng giao diện & Mở giỏ hàng');
                  onThumbConfirmRef.current?.();
                }
              }
            }
            // ƯU TIÊN 4: ✌️ KÝ HIỆU CHỮ V (Victory) -> Đổi danh mục món
            else if (stableGesture === 'Victory' || rawTopGesture === 'Victory') {
              isBraking = true;
              fistStartTimeRef.current = null;
              thumbStartTimeRef.current = null;

              if (victoryStartTimeRef.current === null) {
                victoryStartTimeRef.current = now;
              } else if (now - victoryStartTimeRef.current > 300 && now - lastCategoryTimeRef.current > 800) {
                lastCategoryTimeRef.current = now;
                victoryStartTimeRef.current = null;
                playSpatialSound('category');
                triggerFeedback('switch_category', '✌️ Đổi danh mục món');
                onSwitchCategoryRef.current?.();
              }
            }
            // ƯU TIÊN 5: 👈 👉 BỘ HÀNH TRÌNH KHÔNG GIAN (SPATIAL CRUISE CONTROL)
            else {
              fistStartTimeRef.current = null;
              thumbStartTimeRef.current = null;
              victoryStartTimeRef.current = null;

              // ── ĐƯA TAY SANG VÙNG PHẢI: Tiến món ──
              if (currentZone === 'right') {
                if (!hasTriggeredInitialStepRef.current) {
                  hasTriggeredInitialStepRef.current = true;
                  lastScrollTickTimeRef.current = now;
                  playSpatialSound('whoosh');
                  triggerFeedback('swipe_next', '👉 Sang món tiếp theo');
                  onSwipeNextRef.current?.();
                } else {
                  const timeInZone = now - zoneEnterTimeRef.current;
                  if (timeInZone >= profile.initialReadingPauseMs) {
                    if (now - lastScrollTickTimeRef.current >= profile.continuousScrollStepMs) {
                      lastScrollTickTimeRef.current = now;
                      playSpatialSound('tick');
                      triggerFeedback('swipe_next', '👉 Đang lướt sang phải...');
                      onSwipeNextRef.current?.();
                    }
                  }
                }
              }
              // ── ĐƯA TAY SANG VÙNG TRÁI: Lùi món ──
              else if (currentZone === 'left') {
                if (!hasTriggeredInitialStepRef.current) {
                  hasTriggeredInitialStepRef.current = true;
                  lastScrollTickTimeRef.current = now;
                  playSpatialSound('whoosh');
                  triggerFeedback('swipe_prev', '👈 Lùi về món trước');
                  onSwipePrevRef.current?.();
                } else {
                  const timeInZone = now - zoneEnterTimeRef.current;
                  if (timeInZone >= profile.initialReadingPauseMs) {
                    if (now - lastScrollTickTimeRef.current >= profile.continuousScrollStepMs) {
                      lastScrollTickTimeRef.current = now;
                      playSpatialSound('tick');
                      triggerFeedback('swipe_prev', '👈 Đang lùi sang trái...');
                      onSwipePrevRef.current?.();
                    }
                  }
                }
              }
              // ── TAY Ở VÙNG GIỮA: Dừng yên an toàn ──
              else {
                hasTriggeredInitialStepRef.current = false;
              }
            }

            // 3. Vẽ camera, khung xương và hướng dẫn lên mini-canvas HUD
            if (canvas) {
              const ctx = canvas.getContext('2d');
              if (ctx) {
                if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                  canvas.width = video.videoWidth;
                  canvas.height = video.videoHeight;
                }
                ctx.save();
                ctx.scale(-1, 1);
                ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
                ctx.restore();

                ctx.fillStyle = 'rgba(10, 15, 26, 0.28)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                drawHandSkeleton(
                  ctx,
                  landmarks,
                  stableGesture,
                  currentFistProgress,
                  currentThumbProgress,
                  currentZone,
                  isBraking,
                  palmX,
                  isRvfc,
                  profile.leftEnterBoundary,
                  profile.rightEnterBoundary
                );
              }
            }

            // 4. CẬP NHẬT REACT STATE CÓ CHỌN LỌC (Chỉ re-render khi thực sự đổi trạng thái)
            // Giảm từ 22 lần/giây xuống còn < 1-2 lần/giây để giải phóng 100% CPU/GPU cho web animation
            const zoneChanged = handZoneRef.current !== currentZone;
            const brakeChanged = isBrakingRef.current !== isBraking;
            const gestureChanged = currentGestureRef.current !== stableGesture;
            const fistThresholdCrossed = Math.round(fistProgressRef.current * 4) !== Math.round(currentFistProgress * 4);
            const thumbThresholdCrossed = Math.round(thumbProgressRef.current * 4) !== Math.round(currentThumbProgress * 4);

            const shouldUpdateReact =
              !handDetectedRef.current ||
              zoneChanged ||
              brakeChanged ||
              gestureChanged ||
              fistThresholdCrossed ||
              thumbThresholdCrossed ||
              nowInMs - lastStateThrottleTimeRef.current > 250;

            if (shouldUpdateReact) {
              lastStateThrottleTimeRef.current = nowInMs;
              handDetectedRef.current = true;
              currentGestureRef.current = stableGesture;
              handZoneRef.current = currentZone;
              isBrakingRef.current = isBraking;
              fistProgressRef.current = currentFistProgress;
              thumbProgressRef.current = currentThumbProgress;

              setState((prev) => ({
                ...prev,
                handDetected: true,
                currentGesture: stableGesture,
                handZone: currentZone,
                isBraking,
                fistProgress: currentFistProgress,
                thumbProgress: currentThumbProgress,
                palmX,
                isRvfcActive: isRvfc,
              }));
            }
          } else {
            // Dung sai mất dấu 6 frame (~200ms)
            lostFramesCountRef.current += 1;

            if (lostFramesCountRef.current > 6) {
              gestureHistoryRef.current = [];
              stableGestureRef.current = 'None';
              fistStartTimeRef.current = null;
              thumbStartTimeRef.current = null;
              victoryStartTimeRef.current = null;
              hasTriggeredInitialStepRef.current = false;

              if (canvas && video.videoWidth > 0) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
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

              if (handDetectedRef.current) {
                handDetectedRef.current = false;
                currentGestureRef.current = 'None';
                handZoneRef.current = null;
                isBrakingRef.current = false;
                fistProgressRef.current = 0;
                thumbProgressRef.current = 0;

                setState((prev) => ({
                  ...prev,
                  handDetected: false,
                  currentGesture: 'None',
                  handZone: null,
                  isBraking: false,
                  fistProgress: 0,
                  thumbProgress: 0,
                }));
              }
            }
          }
        }
      } catch (err) {
        console.warn('[SpatialGesture] Frame error:', err);
      }

      scheduleNextFrame();
    },
    [drawHandSkeleton, triggerFeedback, scheduleNextFrame]
  );

  useEffect(() => {
    processFrameRef.current = processFrame;
  }, [processFrame]);

  // Bật camera (Hoàn toàn ổn định, không phụ thuộc dynamic state)
  const startCamera = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const recognizer = await initRecognizer();
      if (!recognizer) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 480 },
          height: { ideal: 360 },
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
          console.warn('[SpatialGesture] Play error:', err);
        });

        if (canvasRef.current && video.videoWidth > 0) {
          canvasRef.current.width = video.videoWidth;
          canvasRef.current.height = video.videoHeight;
        }
      }

      gestureHistoryRef.current = [];
      stableGestureRef.current = 'None';
      lastTimestampRef.current = 0;
      lastInferenceTimeRef.current = 0;
      lostFramesCountRef.current = 0;
      hasTriggeredInitialStepRef.current = false;

      // Hủy bỏ bất kỳ frame callback cũ nào trước khi bắt đầu
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      if (videoCallbackIdRef.current !== null && video && 'cancelVideoFrameCallback' in video) {
        (video as any).cancelVideoFrameCallback(videoCallbackIdRef.current);
        videoCallbackIdRef.current = null;
      }

      const hasRvfc = Boolean(video && 'requestVideoFrameCallback' in video);
      isUsingRvfcRef.current = hasRvfc;

      setState((prev) => ({
        ...prev,
        isActive: true,
        isLoading: false,
        error: null,
        isRvfcActive: hasRvfc,
      }));

      scheduleNextFrame();
    } catch (err: any) {
      console.error('[SpatialGesture] Camera error:', err);
      setState((prev) => ({
        ...prev,
        isActive: false,
        isLoading: false,
        error:
          err.name === 'NotAllowedError'
            ? 'Trình duyệt chưa được cấp quyền Camera. Vui lòng bấm vào biểu tượng ổ khóa/camera trên URL để cho phép.'
            : 'Không thể mở Camera: ' + (err.message || ''),
      }));
    }
  }, [initRecognizer, scheduleNextFrame]);

  // Tắt camera và dọn dẹp tài nguyên
  const stopCamera = useCallback(() => {
    if (videoCallbackIdRef.current !== null && videoRef.current && 'cancelVideoFrameCallback' in videoRef.current) {
      (videoRef.current as any).cancelVideoFrameCallback(videoCallbackIdRef.current);
      videoCallbackIdRef.current = null;
    }

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

    gestureHistoryRef.current = [];
    stableGestureRef.current = 'None';
    fistStartTimeRef.current = null;
    thumbStartTimeRef.current = null;
    victoryStartTimeRef.current = null;
    lostFramesCountRef.current = 0;
    hasTriggeredInitialStepRef.current = false;

    handDetectedRef.current = false;
    currentGestureRef.current = 'None';
    handZoneRef.current = null;
    isBrakingRef.current = false;
    fistProgressRef.current = 0;
    thumbProgressRef.current = 0;

    setState((prev) => ({
      ...prev,
      isActive: false,
      isLoading: false,
      handDetected: false,
      currentGesture: 'None',
      recentAction: null,
      fistProgress: 0,
      thumbProgress: 0,
      handZone: null,
      isBraking: false,
      palmX: 0.5,
      isRvfcActive: false,
    }));
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, [stopCamera]);

  return {
    state,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    speedMode,
    setSpeedMode,
  };
}
