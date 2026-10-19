import React, { useEffect, useState } from 'react';
import { checkBackendConnection } from '../api/client';

interface Props {
  children: React.ReactNode;
}

export const BackendConnectionGate: React.FC<Props> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const verifyConnection = async () => {
      const ok = await checkBackendConnection();
      if (!isMounted) return;

      if (ok) {
        setIsConnected(true);
      } else {
        // Chỉ thử lại định kỳ 3 giây/lần khi Backend chưa bật
        retryTimer = setTimeout(verifyConnection, 3000);
      }
    };

    verifyConnection();

    return () => {
      isMounted = false;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, []);

  // KHI BACKEND CHƯA CHẠY: HIỂN THỊ SPINNER KÈM NÚT VÀO XEM CHẾ ĐỘ DEMO
  if (!isConnected) {
    return (
      <div
        style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          gap: 14,
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e2e8f0',
            borderTopColor: '#ea580c',
            borderRadius: '50%',
            animation: 'spin 0.75s linear infinite',
          }}
        />
        <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>
          Đang kết nối tới OmniResto Backend...
        </div>
        <button
          id="offline-demo-btn"
          onClick={() => setIsConnected(true)}
          style={{
            marginTop: 6,
            padding: '8px 18px',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            background: '#f8fafc',
            color: '#0f172a',
            fontSize: '0.825rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
          }}
        >
          ✨ Tiếp tục với dữ liệu mẫu (Chế độ Demo)
        </button>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
};
