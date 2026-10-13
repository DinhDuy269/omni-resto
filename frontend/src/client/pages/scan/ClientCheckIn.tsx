import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, Utensils, AlertTriangle, ArrowRight, ArrowLeftRight, QrCode, ShoppingCart, RotateCcw, Lock } from 'lucide-react';
import { useClientStore } from '../../store/clientStore';
import type { TableSession } from '../../../shared/types/client';

export const ClientCheckIn: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const checkInWithQrToken = useClientStore((s) => s.checkInWithQrToken);
  const existingSession = useClientStore((s) => s.tableSession);

  const isChangeMode = searchParams.get('change') === 'true';
  const tokenParam = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<TableSession | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [switchedFrom, setSwitchedFrom] = useState<string | null>(null);

  const executeCheckIn = async (token: string, fromTableNo?: string) => {
    try {
      setLoading(true);
      setError(null);
      const sess = await checkInWithQrToken(token);
      setSession(sess);
      if (fromTableNo && fromTableNo !== sess.tableNo) {
        setSwitchedFrom(fromTableNo);
      } else {
        setSwitchedFrom(null);
      }
      // Clean up sensitive token from URL bar (Security Principle)
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Mã QR bàn không hợp lệ hoặc đã hết hạn!';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (tokenParam) {
      const prev = existingSession?.tableNo;
      executeCheckIn(tokenParam, isChangeMode || (prev && prev !== '') ? prev : undefined);
    } else {
      const timer = setTimeout(() => {
        if (!isMounted) return;
        if (isChangeMode) {
          setSession(null);
        } else if (existingSession) {
          setSession(existingSession);
        }
        setLoading(false);
      }, 0);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [tokenParam, isChangeMode, existingSession]);

  return (
    <div style={{
      fontFamily: 'var(--c-font, sans-serif)',
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'var(--c-bg, #fafafa)',
    }}>
      <div style={{
        maxWidth: 490,
        width: '100%',
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        border: '1px solid #eee',
        padding: '36px 28px',
        textAlign: 'center',
      }}>
        {loading ? (
          <div>
            <div style={{ fontSize: '3rem', marginBottom: 16 }} className="animate-spin">🔄</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111', margin: '0 0 8px' }}>
              Đang xác thực mã QR bàn...
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#666', margin: 0 }}>
              Hệ thống đang kết nối bảo mật với bàn ăn của quý khách.
            </p>
          </div>
        ) : session ? (
          /* TRƯỜNG HỢP: ĐÃ CHECK-IN THÀNH CÔNG (MỚI HOẶC ĐÃ ĐỔI XONG) */
          <div>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: '#ecfdf5', color: '#10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <CheckCircle2 size={40} />
            </div>

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              padding: '4px 12px', borderRadius: 999,
              fontSize: '0.75rem', color: '#166534', fontWeight: 700,
              marginBottom: 12,
            }}>
              <ShieldCheck size={14} />
              {switchedFrom ? 'Chuyển bàn thành công' : 'Phiên đặt bàn bảo mật kích hoạt'}
            </div>

            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#111', margin: '0 0 6px' }}>
              {switchedFrom
                ? `Quý khách đã chuyển sang ${session.tableNo}!`
                : `Chào mừng quý khách đến ${session.tableNo}!`}
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#666', margin: '0 0 24px' }}>
              {switchedFrom
                ? `Hệ thống đã cập nhật phiên từ ${switchedFrom} sang ${session.tableNo}. Mọi món trong giỏ hàng đã được bảo lưu an toàn.`
                : 'Quý khách có thể tự do chọn món trong thực đơn. Đơn đặt sẽ được tự động gửi thẳng về bếp của bàn này.'}
            </p>

            <div style={{
              background: '#fafafa', border: '1px dashed #ddd',
              borderRadius: 14, padding: '16px', marginBottom: 24, textAlign: 'left',
              display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Vị trí bàn mới:</span>
                <strong style={{ color: '#047857' }}>{session.tableNo}</strong>
              </div>
              {switchedFrom && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>Bàn cũ trước đó:</span>
                  <span style={{ color: '#888', textDecoration: 'line-through' }}>{switchedFrom}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Chế độ phục vụ:</span>
                <span style={{ color: '#ea580c', fontWeight: 700 }}>
                  {session.mode === 'PAY_FIRST' ? 'Thanh toán trước' : 'Dùng bữa trước, thanh toán tại quầy'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Hiệu lực phiên:</span>
                <span style={{ color: '#059669', fontWeight: 600 }}>Tự động đóng khi dọn bàn</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => navigate('/client/cart')}
                style={{
                  width: '100%', padding: '14px 20px', borderRadius: 12,
                  background: '#ea580c', color: '#fff', border: 'none',
                  fontWeight: 800, fontSize: '1rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  boxShadow: '0 6px 20px rgba(234, 88, 12, 0.3)',
                }}
              >
                <ShoppingCart size={18} />
                <span>Quay lại Giỏ Hàng để Gọi Món</span>
                <ArrowRight size={18} />
              </button>

              <button
                onClick={() => navigate('/client/menu')}
                style={{
                  width: '100%', padding: '12px 20px', borderRadius: 12,
                  background: '#fff', color: '#444', border: '1px solid #ddd',
                  fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Utensils size={16} />
                <span>Xem Thêm Thực Đơn</span>
              </button>
            </div>
          </div>
        ) : isChangeMode ? (
          /* TRƯỜNG HỢP: KHÁCH ĐANG Ở CHẾ ĐỘ ĐỔI BÀN (THEO GÓP Ý CỦA USER) */
          <div>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: '#fef3c7', color: '#d97706',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <ArrowLeftRight size={38} />
            </div>

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#fffbeb', border: '1px solid #fde68a',
              padding: '4px 12px', borderRadius: 999,
              fontSize: '0.75rem', color: '#b45309', fontWeight: 700,
              marginBottom: 12,
            }}>
              <QrCode size={14} /> Chế độ chuyển bàn
            </div>

            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#111', margin: '0 0 6px' }}>
              Quý khách đang yêu cầu đổi bàn
            </h1>

            {existingSession && (
              <div style={{
                background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: 10, padding: '10px 14px', marginBottom: 18,
                fontSize: '0.85rem', color: '#475569',
              }}>
                Bàn hiện tại của bạn: <strong style={{ color: '#0f172a' }}>{existingSession.tableNo}</strong>
              </div>
            )}

            {/* Khung thông báo quan trọng theo yêu cầu */}
            <div style={{
              background: '#fff7ed',
              border: '1.5px solid #fdba74',
              borderRadius: 14,
              padding: '16px',
              marginBottom: 20,
              textAlign: 'left',
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.4rem' }}>📱</span>
                <div>
                  <strong style={{ fontSize: '0.92rem', color: '#9a3412', display: 'block', lineHeight: 1.4 }}>
                    Vui lòng quét mã QR tại bàn bạn muốn chuyển để tiếp tục sử dụng dịch vụ.
                  </strong>
                  <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#c2410c', lineHeight: 1.45 }}>
                    Dùng camera điện thoại quét mã QR được dán trên mặt bàn mới, hoặc nhập mã bí mật của bàn mới bên dưới. Giỏ hàng sẽ được tự động đồng bộ sang bàn mới.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
                padding: '10px 14px', borderRadius: 10, fontSize: '0.85rem', marginBottom: 16, textAlign: 'left',
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Ô nhập mã bàn mới */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualToken.trim()) {
                  executeCheckIn(manualToken.trim(), existingSession?.tableNo);
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}
            >
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Nhập mã QR của bàn mới (hoặc gõ Bàn 02, Bàn 03, Bàn 05)..."
                style={{
                  padding: '12px 14px', borderRadius: 10, border: '1.5px solid #cbd5e1',
                  fontSize: '0.875rem', textAlign: 'center', outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '13px 20px', borderRadius: 10,
                  background: '#ea580c', color: '#fff', border: 'none',
                  fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <ArrowLeftRight size={16} />
                <span>Xác nhận chuyển sang bàn này</span>
              </button>
            </form>

            {/* Quick Test Chips để thử nghiệm ngay */}
            <div style={{
              background: '#f8fafc', borderRadius: 12, padding: '12px',
              marginBottom: 20, textAlign: 'left', border: '1px solid #e2e8f0',
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>
                Thử nhanh mã bàn demo:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { name: 'Bàn 02', token: 'qr-token-tbl-02-b2c3d4e5f6g7' },
                  { name: 'Bàn 03', token: 'qr-token-tbl-03-c3d4e5f6g7h8' },
                  { name: 'Bàn 05', token: 'qr-token-tbl-05-e5f6g7h8i9j0' },
                ].map((demo) => (
                  <button
                    key={demo.token}
                    type="button"
                    onClick={() => {
                      setManualToken(demo.token);
                      executeCheckIn(demo.token, existingSession?.tableNo);
                    }}
                    style={{
                      background: '#fff', border: '1px solid #cbd5e1',
                      borderRadius: 6, padding: '5px 10px', fontSize: '0.78rem',
                      fontWeight: 600, color: '#334155', cursor: 'pointer',
                    }}
                  >
                    Chuyển sang {demo.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Nút hủy đổi bàn */}
            <button
              type="button"
              onClick={() => navigate('/client/cart')}
              style={{
                width: '100%', padding: '12px', background: 'none',
                border: '1px solid #cbd5e1', borderRadius: 10,
                color: '#475569', fontSize: '0.875rem', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <RotateCcw size={16} />
              <span>Hủy đổi bàn & Giữ nguyên {existingSession?.tableNo || 'bàn hiện tại'}</span>
            </button>
          </div>
        ) : (
          /* TRƯỜNG HỢP: CHƯA CÓ BÀN NÀO HOẶC BÀN ĐÃ BỊ KHÓA BỞI THIẾT BỊ KHÁC */
          <div>
            {(() => {
              const isLocked = Boolean(
                error && (error.includes('khóa') || error.includes('thiết bị khác') || error.includes('1 thiết bị'))
              );

              return (
                <>
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: isLocked ? '#fff7ed' : '#fef2f2',
                    color: isLocked ? '#ea580c' : '#ef4444',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px',
                  }}>
                    {isLocked ? <Lock size={38} /> : <AlertTriangle size={40} />}
                  </div>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111', margin: '0 0 8px' }}>
                    {isLocked ? 'Bàn đang được bảo vệ bởi thiết bị khác' : 'Chưa nhận diện được mã bàn'}
                  </h2>

                  <div style={{
                    background: isLocked ? '#fffbeb' : '#fef2f2',
                    border: `1px solid ${isLocked ? '#fde68a' : '#fecaca'}`,
                    borderRadius: 12, padding: '14px 16px',
                    fontSize: '0.85rem', color: isLocked ? '#92400e' : '#dc2626',
                    textAlign: 'left', lineHeight: 1.5, marginBottom: 20,
                  }}>
                    {error || 'Quý khách vui lòng quét mã QR được dán trực tiếp trên mặt bàn ăn để kích hoạt phiên gọi món an toàn.'}
                  </div>

                  {isLocked ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <button
                        onClick={() => navigate('/client/menu')}
                        style={{
                          width: '100%', padding: '13px 20px', borderRadius: 12,
                          background: '#ea580c', color: '#fff', border: 'none',
                          fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}
                      >
                        <Utensils size={16} />
                        <span>Xem Thực Đơn (Chế độ xem món)</span>
                      </button>

                      <div style={{
                        fontSize: '0.78rem', color: '#64748b', padding: '8px',
                        background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0',
                      }}>
                        💡 Bạn đi cùng nhóm hoặc cần đổi điện thoại? Vui lòng báo nhân viên phục vụ để được bấm "Mở khóa bàn" trên quầy thu ngân.
                      </div>
                    </div>
                  ) : (
                    <>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (manualToken.trim()) executeCheckIn(manualToken.trim());
                        }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                      >
                        <input
                          type="text"
                          value={manualToken}
                          onChange={(e) => setManualToken(e.target.value)}
                          placeholder="Nhập mã QR bàn (hoặc thử qr-token-tbl-05-e5f6g7h8i9j0)..."
                          style={{
                            padding: '12px 14px', borderRadius: 10, border: '1px solid #ccc',
                            fontSize: '0.875rem', textAlign: 'center',
                          }}
                        />
                        <button
                          type="submit"
                          style={{
                            padding: '12px 20px', borderRadius: 10,
                            background: '#ea580c', color: '#fff', border: 'none',
                            fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                          }}
                        >
                          Kích hoạt phiên bàn
                        </button>
                      </form>

                      {/* Quick Test Chips for Desktop/Testing */}
                      <div style={{
                        marginTop: 16, background: '#f8fafc', borderRadius: 12, padding: '12px',
                        textAlign: 'left', border: '1px solid #e2e8f0',
                      }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>
                          ⚡ Test nhanh (Bấm để vào bàn ngay):
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {[
                            { name: 'Bàn 01', token: 'qr-sec-tbl01-a1b2c3d4e5f6' },
                            { name: 'Bàn 03', token: 'qr-sec-tbl03-c3d4e5f6g7h8' },
                            { name: 'Bàn 04', token: 'qr-sec-tbl04-d4e5f6g7h8i9' },
                            { name: 'Bàn 07', token: 'qr-sec-tbl07-g7h8i9j0k1l2' },
                          ].map((demo) => (
                            <button
                              key={demo.token}
                              type="button"
                              onClick={() => {
                                setManualToken(demo.token);
                                executeCheckIn(demo.token);
                              }}
                              style={{
                                background: '#fff', border: '1px solid #cbd5e1',
                                borderRadius: 6, padding: '5px 10px', fontSize: '0.8rem',
                                fontWeight: 700, color: '#ea580c', cursor: 'pointer',
                              }}
                            >
                              Vào {demo.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => navigate('/client/menu')}
                        style={{
                          marginTop: 16, background: 'none', border: 'none',
                          color: '#666', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline',
                        }}
                      >
                        Bỏ qua và xem thực đơn mang về/giao tận nơi
                      </button>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientCheckIn;
