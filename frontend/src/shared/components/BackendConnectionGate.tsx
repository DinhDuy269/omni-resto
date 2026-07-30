import React, { useEffect, useState } from 'react';
import { checkBackendConnection } from '../api/client';

interface Props {
  children: React.ReactNode;
}

export const BackendConnectionGate: React.FC<Props> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const checkAndConnect = async () => {
      const connected = await checkBackendConnection();
      if (connected && isMounted) {
        setIsConnected(true);
      }
    };

    checkAndConnect();

    // Thử lại định kỳ 5 giây/lần cho tới khi Backend được bật thành công
    const timer = setInterval(() => {
      checkAndConnect();
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(timer);
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
