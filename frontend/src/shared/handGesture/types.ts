export interface HandCursor {
  x: number;
  y: number;
  rawX: number;
  rawY: number;
}

export type GestureType =
  | 'None'
  | 'Closed_Fist'
  | 'Open_Palm'
  | 'Pointing_Up'
  | 'Thumb_Down'
  | 'Thumb_Up'
  | 'Victory'
  | 'ILoveYou';

export type ActiveMode = 'all' | 'cursor_only' | 'gesture_only';

export interface GestureActionFeedback {
  type: 'click' | 'scroll_up' | 'scroll_down' | 'swipe_left' | 'swipe_right' | 'fist_hold';
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
  pinchStrength: number; // 0 (xa) to 1 (chạm)
  detectedGesture: GestureType;
  actionFeedback: GestureActionFeedback | null;
  mode: ActiveMode;
  isHoveringClickable: boolean;
}
