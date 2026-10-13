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

  // KHI BACKEND CHƯA CHẠY: GIỮ NGUYÊN MÀN HÌNH LOADING TRUNG TÂM, KHÔNG CHO VÀO GIAO DIỆN
  if (!isConnected) {
    return (
      <div
        style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e2e8f0',
            borderTopColor: '#0f172a',
            borderRadius: '50%',
            animation: 'spin 0.75s linear infinite',
          }}
        />
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
