import { create } from 'zustand';
import type { ChatMessage, ChatPromptChip, ChatRecommendedDish } from '../types/chat';
import { apiClient, API_BASE_URL } from '../../shared/api/client';
import { useClientStore } from './clientStore';

// Dọn dẹp key cũ trong localStorage nếu từng lưu
try {
  localStorage.removeItem('omniresto_gemini_api_key');
  localStorage.removeItem('omniresto_gemini_model');
} catch {
  // Ignore storage access error
}

const STORAGE_PREFIX = 'omni_chat_session_';

const QUICK_CHIPS: ChatPromptChip[] = [
  { id: 'chip-best', icon: 'crown', label: 'Món ngon nhất quán', prompt: 'Món nào ngon và đặc sắc nhất của quán mà tôi nhất định phải thử?' },
  { id: 'chip-cheap', icon: 'percent', label: 'Món rẻ & tiết kiệm', prompt: 'Quán có những món nào rẻ nhất và bình dân nhất?' },
  { id: 'chip-veg', icon: 'leaf', label: 'Món chay thanh đạm', prompt: 'Tôi muốn tìm các món chay thanh đạm hoặc món ăn nhẹ nhàng tốt cho sức khỏe.' },
  { id: 'chip-kid', icon: 'smile', label: 'Món thanh vị, không cay', prompt: 'Quán có những món nào vị ngọt thanh tự nhiên, không cay dễ ăn không ạ?' },
  { id: 'chip-combo', icon: 'users', label: 'Combo 3 - 4 người', prompt: 'Nhóm mình đi 3 đến 4 người thì nên gọi những món gì để ăn no và tròn vị?' },
  { id: 'chip-drink', icon: 'glass-water', label: 'Đồ uống & giải nhiệt', prompt: 'Quán có những loại thức uống hoặc món giải nhiệt nào đặc sắc?' },
  { id: 'chip-qr', icon: 'credit-card', label: 'Thanh toán VietQR', prompt: 'Hướng dẫn tôi cách thanh toán qua quét mã VietQR tại bàn.' },
];

const INITIAL_GREETING: ChatMessage = {
  id: 'msg-welcome',
  sender: 'bot',
  text: 'Dạ xin chào quý khách! Em là **OmniBot** — Trợ lý ẩm thực cao cấp của OmniResto.\n\nEm có thể tư vấn món theo sở thích, món thanh đạm, hoặc gợi ý combo theo ngân sách và số lượng người. Quý khách cần em hỗ trợ gì hôm nay ạ?',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

const getStorageKey = (): string => {
  const session = useClientStore.getState().table_session;
  const sessionId = session?.id || session?.table_no || session?.tableNo || 'default';
  return `${STORAGE_PREFIX}${sessionId}`;
};

const getClientId = (): string => {
  try {
    let cid = sessionStorage.getItem('omni_client_uuid');
    if (!cid) {
      cid = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('omni_client_uuid', cid);
    }
    return cid;
  } catch {
    return 'anon-client';
  }
};

const loadSavedMessages = (): ChatMessage[] => {
  try {
    const raw = sessionStorage.getItem(getStorageKey());
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Ignore storage parse error
  }
  return [INITIAL_GREETING];
};

const persistMessages = (msgs: ChatMessage[]) => {
  try {
    sessionStorage.setItem(getStorageKey(), JSON.stringify(msgs));
  } catch {
    // Ignore storage quota error
  }
};

interface AiChatState {
  isOpen: boolean;
  isLoading: boolean;
  messages: ChatMessage[];
  chips: ChatPromptChip[];
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
}

export const useAiChatStore = create<AiChatState>((set, get) => ({
  isOpen: false,
  isLoading: false,
  messages: loadSavedMessages(),
  chips: QUICK_CHIPS,

  openChat: () => set({ isOpen: true }),
  closeChat: () => set({ isOpen: false }),
  toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),

  clearChat: () => {
    const fresh = [
      {
        ...INITIAL_GREETING,
        id: `msg-welcome-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    persistMessages(fresh);
    set({ messages: fresh });
  },

  sendMessage: async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || get().isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const currentMessages = [...get().messages, userMsg];
    set({ messages: currentMessages, isLoading: true });
    persistMessages(currentMessages);

    // Chuẩn bị lịch sử hội thoại gần nhất (tối đa 4 câu)
    const history = currentMessages.slice(-5, -1).map((m) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      content: m.text,
    }));

    const session = useClientStore.getState().table_session;
    const sessionToken = session?.session_token || session?.sessionToken;
    const tableNo = session?.table_no || session?.tableNo;

    let customerName: string | undefined;
    let memberTier: string | undefined;
    try {
      const rawCustomer = localStorage.getItem('customer');
      if (rawCustomer) {
        const cust = JSON.parse(rawCustomer);
        customerName = cust.full_name || cust.fullName;
        memberTier = cust.membership_tier;
      }
    } catch {
      // Ignore parse error
    }

    const payload = {
      message: trimmed,
      history,
      tableNo,
      customerName,
      memberTier,
    };

    const botMsgId = `msg-${Date.now()}-bot`;
    let accumulatedText = '';
    let dishes: ChatRecommendedDish[] = [];
    let streamedSuccessfully = false;

    // Helper cập nhật tin nhắn bot đang stream
    const updateBotMessage = (content: string, recDishes: ChatRecommendedDish[]) => {
      const msgs = get().messages;
      const existingIdx = msgs.findIndex((m) => m.id === botMsgId);
      const botMsg: ChatMessage = {
        id: botMsgId,
        sender: 'bot',
        text: content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommended_dishes: recDishes,
      };

      if (existingIdx >= 0) {
        const updated = [...msgs];
        updated[existingIdx] = botMsg;
        set({ messages: updated });
      } else {
        const updated = [...msgs, botMsg];
        set({ messages: updated });
      }
    };

    // ── 1. Thử nghiệm Streaming SSE với fetch + ReadableStream ──
    try {
      const streamUrl = `${API_BASE_URL}/ai/stream-chat`;
      const response = await fetch(streamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'X-Table-Session': sessionToken } : {}),
          'X-Client-Id': getClientId(),
        },
        body: JSON.stringify(payload),
      });

      if (response.headers.get('x-table-session-status')?.toUpperCase() === 'INVALID') {
        useClientStore.getState().clearTableSession();
      }

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        let currentEvent = 'chunk';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            if (trimmedLine.startsWith('event:')) {
              currentEvent = trimmedLine.replace('event:', '').trim();
            } else if (trimmedLine.startsWith('data:')) {
              const dataStr = trimmedLine.replace('data:', '').trim();
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed && typeof parsed === 'object' && typeof parsed.content === 'string') {
                  accumulatedText += parsed.content;
                  updateBotMessage(accumulatedText, dishes);
                  streamedSuccessfully = true;
                } else if (currentEvent === 'dishes' || Array.isArray(parsed)) {
                  dishes = (Array.isArray(parsed) ? parsed : []).map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    code: item.code,
                    category: item.category || '',
                    price: Number(item.price || 0),
                    description: item.description || '',
                    image_url: item.imageUrl || item.image_url,
                    is_vegetarian: item.isVegetarian ?? item.is_vegetarian,
                    spicy_level: item.spicyLevel ?? item.spicy_level,
                    allergens: item.allergens,
                    available_now: item.available_now !== undefined ? item.available_now : item.availableNow,
                    availableNow: item.available_now !== undefined ? item.available_now : item.availableNow,
                    meal_periods: item.meal_periods || item.mealPeriods || '',
                    mealPeriods: item.meal_periods || item.mealPeriods || '',
                    meal_period_note: item.meal_period_note || item.mealPeriodNote || '',
                    mealPeriodNote: item.meal_period_note || item.mealPeriodNote || '',
                  }));
                  updateBotMessage(accumulatedText, dishes);
                } else if (currentEvent === 'done' || (parsed && parsed.model)) {
                  updateBotMessage(accumulatedText, dishes);
                } else if (currentEvent === 'error' || (parsed && (parsed.reply || parsed.message))) {
                  accumulatedText = parsed.reply || parsed.message || 'Hệ thống đang xử lý nhiều lượt yêu cầu. Quý khách vui lòng đợi một chút rồi hỏi tiếp nhé!';
                  updateBotMessage(accumulatedText, dishes);
                  streamedSuccessfully = true;
                }
              } catch {
                if (currentEvent === 'chunk' || (!dataStr.startsWith('{') && !dataStr.startsWith('['))) {
                  accumulatedText += dataStr;
                  updateBotMessage(accumulatedText, dishes);
                  streamedSuccessfully = true;
                }
              }
            }
          }
        }

        if (streamedSuccessfully && accumulatedText.trim()) {
          set({ isLoading: false });
          persistMessages(get().messages);
          return;
        }
      }
    } catch (streamErr) {
      console.warn('SSE Streaming fallback to standard HTTP POST:', streamErr);
    }

    // ── 2. Fallback sang Endpoint tiêu chuẩn /api/ai/chat nếu SSE không khả dụng ──
    try {
      const res = await apiClient.post<{
        reply: string;
        recommended_dishes?: ChatRecommendedDish[];
      }>(
        '/ai/chat',
        payload,
        {
          headers: {
            ...(sessionToken ? { 'X-Table-Session': sessionToken } : {}),
            'X-Client-Id': getClientId(),
          },
          timeout: 25000,
        }
      );

      if (res.headers && (res.headers['x-table-session-status'] === 'INVALID' || res.headers['x-table-session-status'] === 'invalid')) {
        useClientStore.getState().clearTableSession();
      }

      if (res.data && res.data.reply) {
        updateBotMessage(res.data.reply, res.data.recommended_dishes || []);
        set({ isLoading: false });
        persistMessages(get().messages);
        return;
      }
    } catch (err: unknown) {
      console.warn('Backend AI chatbot request error:', err);
      let fallbackText =
        'Dạ hiện tại hệ thống tư vấn đang bận một chút, quý khách vui lòng xem thực đơn trực tiếp hoặc gọi nhân viên phục vụ để được hỗ trợ chu đáo nhất ạ!';

      const errorObj = err as { response?: { status?: number; data?: { reply?: string; message?: string } } };
      const status = errorObj?.response?.status;
      const responseData = errorObj?.response?.data;

      if (status === 401) {
        useClientStore.getState().clearTableSession();
      }

      if (status === 401 || (responseData && typeof responseData === 'object' && responseData.reply && status !== 500)) {
        fallbackText =
          responseData.reply ||
          responseData.message ||
          'Dạ để OmniBot có thể phục vụ theo đúng bàn, quý khách vui lòng quét mã QR tại bàn để bắt đầu phiên gọi món nhé!';
      } else if (status === 429) {
        fallbackText =
          responseData?.reply ||
          'Dạ quý khách gửi tin nhắn hơi nhanh hoặc hệ thống đang xử lý nhiều lượt yêu cầu. Quý khách vui lòng đợi một chút nhé!';
      }

      updateBotMessage(fallbackText, []);
      set({ isLoading: false });
      persistMessages(get().messages);
    }
  },
}));
