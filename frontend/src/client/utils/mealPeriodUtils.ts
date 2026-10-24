import type { MenuItem } from '../../shared/types/menu';

export type ClientMealPeriod = 'MORNING' | 'NOON' | 'BREAK' | 'EVENING' | 'CLOSED';

/**
 * Xác định khung giờ hiện tại của khách hàng theo múi giờ Việt Nam (UTC+7)
 */
export const getCurrentPeriodClient = (date = new Date()): ClientMealPeriod => {
  // Chuyển sang múi giờ Asia/Ho_Chi_Minh
  const vnTimeStr = date.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });

  const [hours, minutes] = vnTimeStr.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;

  if (totalMinutes >= 360 && totalMinutes < 630) {
    // 06:00 - 10:30
    return 'MORNING';
  } else if (totalMinutes >= 630 && totalMinutes < 870) {
    // 10:30 - 14:30
    return 'NOON';
  } else if (totalMinutes >= 870 && totalMinutes < 990) {
    // 14:30 - 16:30 (Giờ nghỉ bếp, chỉ quầy Bar & Đồ uống)
    return 'BREAK';
  } else if (totalMinutes >= 990 && totalMinutes < 1320) {
    // 16:30 - 22:00
    return 'EVENING';
  }
  // 22:00 - 06:00
  return 'CLOSED';
};

/**
 * Kiểm tra một món ăn có đang trong giờ phục vụ thực tế hay không
 */
export const checkIsItemAvailableNow = (
  item: {
    meal_periods?: string;
    mealPeriods?: string;
    is_available_now?: boolean;
    availableNow?: boolean;
    category?: string;
  },
  currentPeriod?: ClientMealPeriod
): boolean => {
  const period = currentPeriod || getCurrentPeriodClient();

  if (period === 'CLOSED') {
    return false;
  }

  // Nếu Backend đã tính toán availableNow / is_available_now, tôn trọng kết quả từ backend
  if (item.availableNow !== undefined) {
    return item.availableNow;
  }
  if (item.is_available_now !== undefined) {
    return item.is_available_now;
  }

  const p = (item.meal_periods || item.mealPeriods || '').toUpperCase().trim();
  const cat = (item.category || '').toLowerCase();

  const isDrinkOrDessert =
    cat.includes('uống') ||
    cat.includes('đồ uống') ||
    cat.includes('nước') ||
    cat.includes('tráng miệng') ||
    cat.includes('giải khát');

  const isExplicitAllDay =
    p.includes('ALL_DAY') ||
    p.includes('ALLDAY');

  // Trong giờ nghỉ bếp (14:30 - 16:30), chỉ đồ uống / tráng miệng và món ALL_DAY phục vụ
  if (period === 'BREAK') {
    return isDrinkOrDessert || isExplicitAllDay || p.includes('BREAK');
  }

  if (isDrinkOrDessert || isExplicitAllDay) {
    return true;
  }

  // Nếu không ghi rõ meal_periods, món ăn chính áp dụng cho các ca chính Sáng / Trưa / Tối
  if (!p) {
    return period === 'MORNING' || period === 'NOON' || period === 'EVENING';
  }

  return p.includes(period);
};

export const getMealPeriodDisplayName = (period: ClientMealPeriod): string => {
  switch (period) {
    case 'MORNING':
      return 'Buổi Sáng (06:00 - 10:30)';
    case 'NOON':
      return 'Buổi Trưa (10:30 - 14:30)';
    case 'BREAK':
      return 'Giờ Nghỉ Bếp (14:30 - 16:30)';
    case 'EVENING':
      return 'Buổi Tối (16:30 - 22:00)';
    case 'CLOSED':
      return 'Đang Đóng Cửa (22:00 - 06:00)';
    default:
      return '';
  }
};

export const getMealPeriodDescription = (mealPeriods?: string): string => {
  if (!mealPeriods || mealPeriods.trim() === '') return 'Cả ngày (06:00 - 22:00)';
  const upper = mealPeriods.toUpperCase();
  if (upper.includes('ALL_DAY') || upper.includes('ALLDAY')) return 'Cả ngày (06:00 - 22:00)';

  const parts: string[] = [];
  if (upper.includes('MORNING')) parts.push('Sáng (06:00 - 10:30)');
  if (upper.includes('NOON')) parts.push('Trưa (10:30 - 14:30)');
  if (upper.includes('BREAK')) parts.push('Giờ nghỉ (14:30 - 16:30)');
  if (upper.includes('EVENING')) parts.push('Tối (16:30 - 22:00)');

  return parts.join(', ');
};
