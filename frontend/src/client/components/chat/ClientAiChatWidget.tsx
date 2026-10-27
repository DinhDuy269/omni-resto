import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  RotateCcw,
  ChefHat,
  Crown,
  Percent,
  Leaf,
  Smile,
  Users,
  GlassWater,
  CreditCard,
} from 'lucide-react';
import { useAiChatStore } from '../../store/aiChatStore';
import { RecommendedDishCard } from './RecommendedDishCard';
import './ClientAiChatWidget.css';

export const ClientAiChatWidget: React.FC = () => {
  const {
    isOpen,
    isLoading,
    messages,
    chips,
    openChat,
    closeChat,
    toggleChat,
    sendMessage,
    clearChat,
  } = useAiChatStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cuộn xuống tin nhắn mới nhất
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, isLoading]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    const msg = input;
    setInput('');
    sendMessage(msg);
  };

  const handleChipClick = (prompt: string) => {
    sendMessage(prompt);
  };

  const renderChipIcon = (iconName: string) => {
    switch (iconName) {
      case 'crown':
        return <Crown size={14} style={{ color: '#d97706' }} />;
      case 'percent':
      case 'badge-percent':
        return <Percent size={13} style={{ color: '#059669' }} />;
      case 'leaf':
        return <Leaf size={14} style={{ color: '#16a34a' }} />;
      case 'smile':
        return <Smile size={14} style={{ color: '#0284c7' }} />;
      case 'users':
        return <Users size={14} style={{ color: '#4f46e5' }} />;
      case 'glass-water':
        return <GlassWater size={14} style={{ color: '#0d9488' }} />;
      case 'credit-card':
        return <CreditCard size={14} style={{ color: '#2563eb' }} />;
      default:
        return <Sparkles size={14} style={{ color: '#ea580c' }} />;
    }
  };

  // Xác định xem bot đã bắt đầu stream nội dung chưa
  const lastMessage = messages[messages.length - 1];
  const isWaitingInitialResponse =
    isLoading && (!lastMessage || lastMessage.sender === 'user' || lastMessage.text.length === 0);

  return (
    <>
      {/* ── 1. Floating Launcher Button ── */}
      <div className="omni-chat-launcher">
        {!isOpen && (
          <button
            type="button"
            className="omni-chat-pill-teaser"
            onClick={openChat}
            aria-label="Mở trợ lý ẩm thực OmniBot"
          >
            <Sparkles size={14} className="omni-chat-teaser-sparkle" />
            <span>Hỏi OmniBot chọn món</span>
          </button>
        )}

        <button
          type="button"
          className={`omni-chat-trigger-btn${isOpen ? ' active' : ''}`}
          onClick={toggleChat}
          title={isOpen ? 'Đóng trợ lý ẩm thực' : 'Mở trợ lý ẩm thực OmniBot AI'}
          aria-label={isOpen ? 'Đóng trợ lý ẩm thực' : 'Mở trợ lý ẩm thực OmniBot AI'}
        >
          <div className="omni-chat-glow" />
          {isOpen ? <X size={22} strokeWidth={2.4} /> : <Sparkles size={22} strokeWidth={2.2} />}
          <span className="omni-chat-status-dot" title="OmniBot trực tuyến" />
        </button>
      </div>

      {/* ── 2. Chat Window ── */}
      {isOpen && (
        <div className="omni-chat-window" role="dialog" aria-label="Khung trò chuyện OmniBot">
          {/* Header */}
          <div className="omni-chat-header">
            <div className="omni-chat-header-info">
              <div className="omni-chat-avatar">
                <ChefHat size={20} color="#ffffff" strokeWidth={2.2} />
              </div>
              <div>
                <div className="omni-chat-title">
                  OmniBot <span className="omni-chat-badge-ai">AI SOMMELIER</span>
                </div>
                <div className="omni-chat-status">
                  <span className="omni-chat-status-indicator" />
                  Trợ lý ẩm thực cao cấp
                </div>
              </div>
            </div>

            <div className="omni-chat-header-actions">
              <button
                type="button"
                className="omni-chat-btn-icon"
                onClick={clearChat}
                title="Làm mới cuộc trò chuyện"
                aria-label="Làm mới cuộc trò chuyện"
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                className="omni-chat-btn-icon"
                onClick={closeChat}
                title="Thu nhỏ"
                aria-label="Thu nhỏ khung trò chuyện"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Quick Chips Carousel */}
          <div className="omni-chat-chips-container">
            {chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className="omni-chat-chip"
                onClick={() => handleChipClick(chip.prompt)}
                disabled={isLoading}
              >
                <span className="omni-chat-chip-icon">{renderChipIcon(chip.icon)}</span>
                <span>{chip.label}</span>
              </button>
            ))}
          </div>

          {/* Messages Body */}
          <div className="omni-chat-body">
            {messages.map((msg, idx) => {
              const isCurrentStreamingMsg =
                isLoading && msg.sender === 'bot' && idx === messages.length - 1;

              // Ẩn bubble bot rỗng nếu vừa mới khởi tạo chưa có text
              if (msg.sender === 'bot' && !msg.text && isWaitingInitialResponse) {
                return null;
              }

              return (
                <div
                  key={msg.id}
                  className={`omni-chat-bubble ${
                    msg.sender === 'user' ? 'omni-chat-bubble-user' : 'omni-chat-bubble-bot'
                  }`}
                >
                  <div className="omni-chat-msg-content">
                    {msg.sender === 'user' ? (
                      <div style={{ whiteSpace: 'pre-line' }}>{msg.text}</div>
                    ) : (
                      <div>
                        {msg.text.split('\n').map((line, lIdx) => {
                          const trimmedLine = line.trim();
                          if (trimmedLine.startsWith('━━━') || trimmedLine.startsWith('---') || trimmedLine.startsWith('═══')) {
                            return <div key={lIdx} className="omni-chat-msg-divider" />;
                          }
                          if (!trimmedLine) {
                            return <div key={lIdx} className="omni-chat-empty-line" />;
                          }

                          // Parse **bold** and _italic_
                          const inlineTokens = line.split(/(\*\*.*?\*\*|_.*?_)/g);
                          return (
                            <div key={lIdx} className="omni-chat-line">
                              {inlineTokens.map((token, tIdx) => {
                                if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
                                  return (
                                    <strong key={tIdx} className="omni-chat-bold">
                                      {token.slice(2, -2)}
                                    </strong>
                                  );
                                }
                                if (token.startsWith('_') && token.endsWith('_') && token.length >= 2) {
                                  return (
                                    <em key={tIdx} className="omni-chat-em">
                                      {token.slice(1, -1)}
                                    </em>
                                  );
                                }
                                return token;
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {isCurrentStreamingMsg && <span className="omni-stream-cursor" />}
                  </div>

                  {/* Render Thẻ Món Ăn Tương Tác */}
                  {msg.recommended_dishes && msg.recommended_dishes.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#ea580c',
                          marginBottom: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Sparkles size={12} />
                        <span>Món gợi ý dành riêng cho bạn:</span>
                      </div>
                      {msg.recommended_dishes.map((dish) => (
                        <RecommendedDishCard key={dish.id} dish={dish} />
                      ))}
                    </div>
                  )}

                  <div className="omni-chat-time">{msg.timestamp}</div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isWaitingInitialResponse && (
              <div className="omni-typing-indicator">
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginRight: 4, fontWeight: 500 }}>
                  OmniBot đang soạn câu trả lời...
                </span>
                <div className="omni-dot" />
                <div className="omni-dot" />
                <div className="omni-dot" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <div className="omni-chat-footer">
            <form onSubmit={handleSend} className="omni-chat-input-form">
              <input
                ref={inputRef}
                type="text"
                className="omni-chat-input"
                placeholder="Hỏi về món ngon, món rẻ, món không cay..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="submit"
                className="omni-chat-send-btn"
                disabled={!input.trim() || isLoading}
                title="Gửi câu hỏi"
                aria-label="Gửi câu hỏi"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
