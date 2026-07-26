import React, { useEffect, useState } from 'react';
import { ServerOff, RefreshCw, Terminal, ShieldAlert, Cpu, AlertTriangle } from 'lucide-react';
import { checkBackendConnection, API_BASE_URL, apiService } from '../../api/client';
import { useAdminStore } from '../../store/adminStore';

interface Props {
  children: React.ReactNode;
}

export const BackendConnectionGate: React.FC<Props> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const { setBranches, setMenuItems, setOrders, setStaffList } = useAdminStore();

  const verifyAndLoadData = async () => {
    setIsChecking(true);
    const connected = await checkBackendConnection();

    if (connected) {
      try {
        // Fetch live data from Spring Boot backend APIs
        const [branches, menuItems, orders, users] = await Promise.all([
          apiService.getBranches(),
          apiService.getMenuItems(),
          apiService.getOrders(),
          apiService.getUsers(),
        ]);

        if (branches.length > 0) setBranches(branches);
        if (menuItems.length > 0) setMenuItems(menuItems);
        if (orders.length > 0) setOrders(orders);
        if (users.length > 0) setStaffList(users);
      } catch (err) {
        console.warn('Backend connected but failed fetching initial collections:', err);
      }

      setIsConnected(true);
    } else {
      setIsConnected(false);
    }

    setIsChecking(false);
  };

  useEffect(() => {
    verifyAndLoadData();
  }, []);

  // 1. Loading State during Health Check
  if (isChecking) {
    return (
      <div
        style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          color: '#0f172a',
          fontFamily: 'var(--font-family)',
          gap: '20px',
        }}
      >
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, var(--primary), #f59e0b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 8px 24px rgba(217, 119, 6, 0.3)',
          }}
        >
          <Cpu size={32} className="animate-spin" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Đang Kiểm Tra Kết Nối Backend Spring Boot...</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '6px' }}>
            Kết nối tới địa chỉ: <code style={{ backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '4px' }}>{API_BASE_URL}</code>
          </p>
        </div>
      </div>
    );
  }

  // 2. MÀN HÌNH BÁO LỖI KHI CHƯA BẬT BACKEND LOCAL (Strict Blocking Error Screen)
  if (!isConnected) {
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          padding: '24px',
          boxSizing: 'border-box',
          fontFamily: 'var(--font-family)',
        }}
      >
        <div
          className="card animate-fade-in"
          style={{
            maxWidth: '680px',
            width: '100%',
            padding: '40px',
            display: 'flex',
            flexDirection: 'column',
            gap: '28px',
            borderTop: '6px solid var(--danger)',
            boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.12)',
            backgroundColor: '#ffffff',
          }}
        >
          {/* Header Error Icon & Badge */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '18px',
                  backgroundColor: 'var(--danger-bg)',
                  border: '1px solid var(--danger-border)',
                  color: 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ServerOff size={34} />
              </div>
              <div>
                <span
                  style={{
                    fontSize: '0.78125rem',
                    fontWeight: 800,
                    color: 'var(--danger)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <ShieldAlert size={15} /> KẾT NỐI SERVER THẤT BẠI
                </span>
                <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', margin: '4px 0 0 0' }}>
                  Backend Chưa Được Khởi Chạy!
                </h2>
              </div>
            </div>

            <span
              style={{
                backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger)',
                border: '1px solid var(--danger-border)',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8125rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AlertTriangle size={14} /> SERVER OFFLINE
            </span>
          </div>

          {/* Detailed Error Description */}
          <p style={{ color: 'var(--text-body)', fontSize: '0.95rem', lineHeight: '1.65', margin: 0 }}>
            Bạn đang chạy ứng dụng Frontend trên môi trường <strong>Local</strong>. Tuy nhiên, hệ thống chưa kết nối được với Server Backend Spring Boot tại địa chỉ <code style={{ backgroundColor: '#f1f5f9', color: 'var(--primary-active)', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>{API_BASE_URL}</code>.
            <br />
            <span style={{ color: 'var(--danger)', fontWeight: 700, marginTop: '6px', display: 'block' }}>
              ⚠️ Giao diện quản trị sẽ tạm khóa cho đến khi Server Backend được bật để đảm bảo dữ liệu toàn vẹn.
            </span>
          </p>

          {/* Terminal Command Guide Box */}
          <div
            style={{
              backgroundColor: '#0f172a',
              color: '#f8fafc',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontSize: '0.925rem', fontWeight: 800 }}>
              <Terminal size={20} /> Hướng Dẫn Bật Server Backend Tại Local:
            </div>

            <ol style={{ paddingLeft: '20px', margin: 0, fontSize: '0.875rem', color: '#cbd5e1', lineHeight: '1.9' }}>
              <li>
                Mở Terminal/CMD mới tại thư mục Backend:
                <div style={{ fontFamily: 'monospace', color: '#38bdf8', fontWeight: 700, marginTop: '2px' }}>
                  cd c:\omni-resto\backend
                </div>
              </li>
              <li>
                Chạy lệnh khởi động Spring Boot Java Server:
                <div
                  style={{
                    backgroundColor: '#1e293b',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    marginTop: '6px',
                    fontFamily: 'monospace',
                    color: '#4ade80',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    borderLeft: '4px solid #4ade80',
                  }}
                >
                  .\mvnw.cmd spring-boot:run
                </div>
              </li>
            </ol>
          </div>

          {/* Action Retry Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', marginTop: '4px' }}>
            <button
              className="btn btn-primary"
              onClick={verifyAndLoadData}
              style={{ padding: '13px 32px', fontSize: '1rem', fontWeight: 800 }}
            >
              <RefreshCw size={19} className={isChecking ? 'animate-spin' : ''} />
              Thử Kết Nối Lại Ngay (Retry Connection)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Render App UI when Backend Connection is Established
  return <>{children}</>;
};
