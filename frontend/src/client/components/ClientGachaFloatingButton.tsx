import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dices, Sparkles } from 'lucide-react';
import './ClientGachaFloatingButton.css';

export const ClientGachaFloatingButton: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);

  // Ẩn nút nếu đang ở chính trang Gacha
  if (location.pathname === '/client/gacha') {
    return null;
  }

  return (
    <aside
      className="omni-gacha-float-launcher"
      aria-label="Vòng quay món ngon Gacha"
    >
      {/* Tooltip gợi ý */}
      <div className={`omni-gacha-float-tooltip ${isHovered ? 'visible' : ''}`}>
        <span>🎲 Hôm nay ăn gì? <strong>Quay ngay!</strong></span>
      </div>

      {/* Nút bấm tròn nổi bật */}
      <button
        type="button"
        className="omni-gacha-float-btn"
        onClick={() => navigate('/client/gacha')}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title="Quay món ngẫu nhiên - Omni Gacha"
        aria-label="Mở vòng quay chọn món ngẫu nhiên"
      >
        <div className="omni-gacha-float-glow" />
        <Dices size={26} className="omni-gacha-dice-icon" />
        <span className="omni-gacha-sparkle-badge">
          <Sparkles size={11} />
        </span>
      </button>
    </aside>
  );
};

export default ClientGachaFloatingButton;
