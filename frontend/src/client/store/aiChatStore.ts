import { create } from 'zustand';
import type { ChatMessage, ChatPromptChip, ChatRecommendedDish } from '../types/chat';
import { apiClient } from '../../shared/api/client';
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
  { id: 'chip-best', icon: '👑', label: 'Món ngon nhất quán', prompt: 'Món nào ngon và đặc sắc nhất của quán mà tôi nhất định phải thử?' },
  { id: 'chip-cheap', icon: '💰', label: 'Món rẻ & tiết kiệm', prompt: 'Quán có những món nào rẻ nhất và bình dân nhất?' },
  { id: 'chip-veg', icon: '🌿', label: 'Món chay thanh đạm', prompt: 'Tôi muốn tìm các món chay thanh đạm hoặc món ăn nhẹ nhàng tốt cho sức khỏe.' },
  { id: 'chip-kid', icon: '👶', label: 'Món thanh vị, không cay', prompt: 'Quán có những món nào vị ngọt thanh tự nhiên, không cay dễ ăn không ạ?' },
  { id: 'chip-combo', icon: '👨‍👩‍👧', label: 'Combo 3 - 4 người', prompt: 'Nhóm mình đi 3 đến 4 người thì nên gọi những món gì để ăn no và tròn vị?' },
  { id: 'chip-drink', icon: '🍹', label: 'Đồ uống & giải nhiệt', prompt: 'Quán có những loại thức uống hoặc món giải nhiệt nào đặc sắc?' },
  { id: 'chip-qr', icon: '💳', label: 'Thanh toán VietQR', prompt: 'Hướng dẫn tôi cách thanh toán qua quét mã VietQR tại bàn.' },
];

const INITIAL_GREETING: ChatMessage = {
  id: 'msg-welcome',
  sender: 'bot',
  text: 'Dạ xin chào quý khách! Em là **OmniBot** — Trợ lý ẩm thực của OmniResto 🍲✨\n\nEm có thể tư vấn món theo sở thích, món thanh đạm, hoặc gợi ý combo theo ngân sách và số lượng người. Quý khách cần em hỗ trợ gì hôm nay ạ?',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

const getStorageKey = (): string => {
  const session = useClientStore.getState().table_session;
  const sessionId = session?.id || session?.table_no || 'default';
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
    const sessionToken = session?.session_token;

    try {
      const res = await apiClient.post<{
        reply: string;
        recommended_dishes?: ChatRecommendedDish[];
      }>(
        '/ai/chat',
        {
          message: trimmed,
          history,
        },
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
        const botMsg: ChatMessage = {
          id: `msg-${Date.now()}-bot`,
          sender: 'bot',
          text: res.data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          recommended_dishes: res.data.recommended_dishes || [],
        };
        const updated = [...get().messages, botMsg];
        set({ messages: updated, isLoading: false });
        persistMessages(updated);
        return;
      }
    } catch (err: unknown) {
      console.warn('Backend AI chatbot request error:', err);
      let fallbackText =
        'Dạ hiện tại hệ thống tư vấn đang bận một chút, quý khách vui lòng xem thực đơn trực tiếp hoặc gọi nhân viên phục vụ để được hỗ trợ chu đáo nhất ạ! 🍲✨';

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
          'Dạ để OmniBot có thể phục vụ theo đúng bàn, quý khách vui lòng quét mã QR tại bàn để bắt đầu phiên gọi món nhé! 📱✨';
      } else if (status === 429) {
        fallbackText =
          responseData?.reply ||
          'Dạ quý khách gửi tin nhắn hơi nhanh, OmniBot đang xử lý. Quý khách vui lòng đợi một chút nhé! ⏳';
      }

      const botMsg: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        sender: 'bot',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommended_dishes: [],
      };
      const updated = [...get().messages, botMsg];
      set({ messages: updated, isLoading: false });
      persistMessages(updated);
    }
  },
}));
