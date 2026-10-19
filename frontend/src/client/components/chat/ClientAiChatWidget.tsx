import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, RotateCcw, ChefHat } from 'lucide-react';
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

  return (
    <>
      {/* ── 1. Floating Launcher Button ── */}
      <div className="omni-chat-launcher">
        {!isOpen && (
          <div className="omni-chat-pill-tooltip" onClick={openChat}>
            <Sparkles size={14} color="#e11d48" />
            <span>Hỏi OmniBot chọn món!</span>
          </div>
        )}

        <button
          className="omni-chat-trigger-btn"
          onClick={toggleChat}
          title={isOpen ? 'Đóng trợ lý ẩm thực' : 'Mở trợ lý ẩm thực OmniBot'}
        >
          <div className="omni-chat-pulse" />
          {isOpen ? <X size={26} /> : <Bot size={28} />}
          <div className="omni-chat-badge" />
        </button>
      </div>

      {/* ── 2. Chat Window ── */}
      {isOpen && (
        <div className="omni-chat-window">
          {/* Header */}
          <div className="omni-chat-header">
            <div className="omni-chat-header-info">
              <div className="omni-chat-avatar">
                <ChefHat size={22} color="#ffffff" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  OmniBot <span style={{ fontSize: '0.6875rem', background: '#e11d48', padding: '1px 6px', borderRadius: 10 }}>AI</span>
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                  Trợ lý ẩm thực OmniResto
                </div>
              </div>
            </div>

            <div className="omni-chat-header-actions">
              <button
                className="omni-chat-btn-icon"
                onClick={clearChat}
                title="Làm mới cuộc trò chuyện"
              >
                <RotateCcw size={15} />
              </button>
              <button
                className="omni-chat-btn-icon"
                onClick={closeChat}
                title="Thu nhỏ"
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
                className="omni-chat-chip"
                onClick={() => handleChipClick(chip.prompt)}
                disabled={isLoading}
              >
                <span>{chip.icon}</span>
                <span>{chip.label}</span>
              </button>
            ))}
          </div>

          {/* Messages Body */}
          <div className="omni-chat-body">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`omni-chat-bubble ${
                  msg.sender === 'user' ? 'omni-chat-bubble-user' : 'omni-chat-bubble-bot'
                }`}
              >
                <div style={{ whiteSpace: 'pre-line' }}>{msg.text}</div>

                {/* Render Thẻ Món Ăn Tương Tác */}
                {msg.recommended_dishes && msg.recommended_dishes.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      ✨ Món ăn gợi ý dành cho bạn:
                    </div>
                    {msg.recommended_dishes.map((dish) => (
                      <RecommendedDishCard key={dish.id} dish={dish} />
                    ))}
                  </div>
                )}

                <div className="omni-chat-time">{msg.timestamp}</div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="omni-typing-indicator">
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginRight: 4, fontWeight: 500 }}>
                  OmniBot đang chọn món
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
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
