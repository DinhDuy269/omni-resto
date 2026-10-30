export type GestureType =
  | 'None'
  | 'Closed_Fist'
  | 'Open_Palm'
  | 'Pointing_Up'
  | 'Thumb_Down'
  | 'Thumb_Up'
  | 'Victory'
  | 'ILoveYou';

export type SpatialActionType =
  | 'swipe_next'
  | 'swipe_prev'
  | 'grab_dish'
  | 'thumb_confirm'
  | 'switch_category'
  | 'palm_pause';

export interface SpatialFeedback {
  type: SpatialActionType;
  message: string;
  timestamp: number;
}

export type HandSpatialZone = 'left' | 'center' | 'right';

export type GestureSpeedMode = 'fast' | 'balanced' | 'relaxed';

export interface SpatialGestureState {
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  handDetected: boolean;
  currentGesture: GestureType;
  recentAction: SpatialFeedback | null;
  fistProgress: number; // 0 to 1 (thời gian giữ nắm tay để nhặt món)
  thumbProgress: number; // 0 to 1 (thời gian giữ ngón cái để chốt đơn / thoát)
  handZone: HandSpatialZone | null;
  isBraking: boolean; // True khi xòe bàn tay Open_Palm để phanh dừng ngắm món
  palmX: number; // Tọa độ X chuẩn hóa (0 -> 1)
  isRvfcActive?: boolean; // True nếu camera đang đồng bộ trực tiếp qua chuẩn phần cứng requestVideoFrameCallback
  speedMode?: GestureSpeedMode;
}

// ── Legacy Types (Hỗ trợ tương thích ngược cho useHandGestureEngine nếu cần) ──
export type ActiveMode = 'cursor_only' | 'gesture_only' | 'all';

export interface HandCursor {
  x: number;
  y: number;
  rawX: number;
  rawY: number;
  isPinching?: boolean;
  pinchStrength?: number;
  isClicking?: boolean;
}

export interface GestureActionFeedback {
  type: string;
  message: string;
  timestamp: number;
}

export interface HandGestureState {
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  handDetected: boolean;
  cursor: HandCursor;
  isPinching: boolean;
  pinchStrength: number;
  mode: ActiveMode;
  dwellProgress: number;
  isHoveringClickable: boolean;
  actionFeedback: GestureActionFeedback | null;
  detectedGesture?: GestureType;
}
