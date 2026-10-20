import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ShoppingCart, Unlock, Volume2, VolumeX, X } from 'lucide-react';
import { useAdminStore } from '../../../admin/store/adminStore';
import { useClientStore } from '../../store/clientStore';
import type { MenuItem } from '../../../shared/types/admin';
import './ClientGacha.css';
import { GachaAudio } from '../../utils/GachaAudio';

// Kích thước chuẩn để tính toán trượt (Chiều rộng thẻ 160px + Margin 20px)
const ITEM_WIDTH = 180;
const WINNING_INDEX = 50; // Vị trí món ăn trúng thưởng trong mảng băng chuyền
const TOTAL_ITEMS = 65;   // Tổng số phần tử kết xuất để băng chuyền không bị cụt

const ClientGacha: React.FC = () => {
    const { menuItems } = useAdminStore();
    const { addToCart, openCart } = useClientStore();

    const availableItems = useMemo(() => {
        return menuItems.filter(m => m.status === 'AVAILABLE' || m.status === 'available');
    }, [menuItems]);

    const [isSpinning, setIsSpinning] = useState(false);
    const [spinTrack, setSpinTrack] = useState<MenuItem[]>([]);
    const [winner, setWinner] = useState<MenuItem | null>(null);
    const [offset, setOffset] = useState(0);
    const [isResetting, setIsResetting] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<GachaAudio | null>(null);

    // 1. Khởi tạo Audio Manager khi trang được tải
    useEffect(() => {
        audioRef.current = new GachaAudio();
        audioRef.current.preload();

        return () => {
            audioRef.current?.dispose(); // Dọn dẹp bộ nhớ khi rời trang
        };
    }, []);

    // 2. Khởi tạo băng chuyền ngẫu nhiên ban đầu
    useEffect(() => {
        if (availableItems.length > 0) {
            generateTrack();
        }
    }, [availableItems]);

    const generateTrack = (forcedWinner?: MenuItem) => {
        const track: MenuItem[] = [];
        for (let i = 0; i < TOTAL_ITEMS; i++) {
            if (i === WINNING_INDEX && forcedWinner) {
                track.push(forcedWinner);
            } else {
                track.push(availableItems[Math.floor(Math.random() * availableItems.length)]);
            }
        }
        setSpinTrack(track);
    };

    const handleOpenCase = () => {
        if (isSpinning || availableItems.length === 0 || !containerRef.current) return;

        // Bắt buộc gọi unlock() ngay khi user click để trình duyệt cho phép phát âm thanh
        audioRef.current?.unlock();
        audioRef.current?.play('gacha_open');

        setIsSpinning(true);
        setWinner(null);
        setIsResetting(true);
        setOffset(0);

        const winningItem = availableItems[Math.floor(Math.random() * availableItems.length)];
        generateTrack(winningItem);

        setTimeout(() => {
            setIsResetting(false);

            setTimeout(() => {
                if (!containerRef.current) return;
                const containerWidth = containerRef.current.clientWidth;

                const randomOffset = Math.floor(Math.random() * 100) - 50;
                const targetOffset = (WINNING_INDEX * ITEM_WIDTH) - (containerWidth / 2) + (ITEM_WIDTH / 2) + randomOffset;

                setOffset(-targetOffset);

                // Logic mô phỏng tiếng "Tick" giảm dần tốc độ theo gia tốc CSS
                let tickTime = 0;
                let tickInterval = 50; 
                const playTick = () => {
                    if (!audioRef.current || tickTime >= 6000) return;
                    audioRef.current.play('gacha_tick');
                    
                    tickTime += tickInterval;
                    // Tăng khoảng cách giữa các tiếng tick ở những giây cuối
                    if (tickTime > 3000) tickInterval += 20; 
                    if (tickTime > 4500) tickInterval += 50;
                    if (tickTime > 5500) tickInterval += 100;
                    
                    setTimeout(playTick, tickInterval);
                };
                playTick();

                setTimeout(() => {
                    setIsSpinning(false);
                    setWinner(winningItem);
                    audioRef.current?.play('gacha_win'); // Phát tiếng chúc mừng khi kết thúc
                }, 6000);

            }, 50);
        }, 50);
    };

    const handleOrder = () => {
        if (winner) {
            addToCart({
                menuItemId: winner.id,
                name: winner.name,
                price: winner.basePrice,
                image: winner.image || '',
                category: winner.category
            }, 1);
            openCart();
            setWinner(null); // Đóng Modal sau khi chốt đơn
        }
    };

    const toggleMute = () => {
        const newState = !isMuted;
        setIsMuted(newState);
        audioRef.current?.setMuted(newState);
    };

    if (availableItems.length === 0) return <div style={{ textAlign: 'center', padding: '40px' }}>Chưa có dữ liệu menu.</div>;

    return (
        <div className="gacha-pro-wrapper" style={{ position: 'relative' }}>
            
            {/* Nút tắt/bật âm thanh góc trên cùng bên phải */}
            <button 
                onClick={toggleMute}
                className="c-btn c-btn-ghost"
                style={{ 
                    position: 'absolute', top: '20px', right: '20px', 
                    padding: '8px', borderRadius: '50%',
                    background: 'var(--c-surface)', border: '1px solid var(--c-border)',
                    boxShadow: 'var(--c-shadow-sm)'
                }}
                title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
            >
                {isMuted ? <VolumeX size={24} color="var(--c-text-muted)" /> : <Volume2 size={24} color="var(--c-primary)" />}
            </button>

            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>Hôm Nay Ăn Gì?</h1>
            <p style={{ color: 'var(--c-text-muted)', marginBottom: '32px' }}>Để vòng quay nhân phẩm quyết định bữa ăn của bạn!</p>

            {/* Lồng quay Gacha */}
            <div className="case-container" ref={containerRef}>
                <div className="case-center-line"></div>
                <div
                    className={`case-track ${isResetting ? 'resetting' : ''}`} style={{ transform: `translateX(${offset}px)` }}
                >
                    {spinTrack.map((item, idx) => (
                        <div key={idx} className={`case-item ${idx > WINNING_INDEX + 5 ? 'mystery' : ''}`}>
                            {idx > WINNING_INDEX + 5 ? (
                                <>
                                    <div style={{ fontSize: '3rem', color: 'var(--c-error)', marginBottom: '12px' }}>?</div>
                                    <div className="item-name" style={{ color: 'var(--c-error)' }}>★ MÓN BÍ ẨN</div>
                                </>
                            ) : (
                                <>
                                    <img src={item.image} alt={item.name} onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150')} />
                                    <div className="item-name">{item.name}</div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Nút hành động */}
            <button
                className={`c-btn c-btn-primary ${isSpinning ? 'disabled' : ''}`}
                onClick={handleOpenCase}
                disabled={isSpinning}
                style={{
                    padding: '16px 40px', fontSize: '1.2rem', fontWeight: 800,
                    borderRadius: 'var(--c-r-full)', textTransform: 'uppercase', letterSpacing: '1px'
                }}
            >
                {isSpinning ? 'Đang quay...' : 'QUAY MÓN NGAY'} <Unlock size={20} style={{ display: 'inline', marginLeft: '8px' }} />
            </button>

            {/* MODAL Hiển thị kết quả nổi giữa màn hình */}
            {winner && !isSpinning && (
                <div className="gacha-modal-overlay" onClick={() => setWinner(null)}>
                    {/* onClick chặn nổi bọt để không bị đóng modal khi click vào bên trong form */}
                    <div className="gacha-modal-content" onClick={(e) => e.stopPropagation()}>
                        
                        {/* Nút tắt Modal */}
                        <button className="gacha-modal-close" onClick={() => setWinner(null)}>
                            <X size={24} strokeWidth={2.5} />
                        </button>

                        <h2 style={{ color: 'var(--c-primary)', marginBottom: '20px', fontWeight: 800, fontSize: '1.5rem' }}>
                            🎉 MÓN NGON DÀNH CHO BẠN 🎉
                        </h2>
                        
                        <img 
                            src={winner.image} 
                            alt={winner.name} 
                            style={{ width: '140px', height: '140px', objectFit: 'cover', borderRadius: '50%', border: '4px solid var(--c-primary)', marginBottom: '20px', boxShadow: 'var(--c-shadow-sm)' }} 
                        />
                        
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'var(--c-text-main)', lineHeight: 1.3 }}>
                            {winner.name}
                        </h3>
                        
                        <p style={{ fontSize: '1.5rem', color: 'var(--c-primary)', fontWeight: '900', marginBottom: '28px' }}>
                            {winner.basePrice.toLocaleString('vi-VN')}đ
                        </p>
                        
                        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                            <button
                                className="c-btn"
                                onClick={() => setWinner(null)}
                                style={{
                                    background: 'var(--c-surface-warm)', color: 'var(--c-text-main)', 
                                    border: '1px solid var(--c-border)', padding: '14px 0', 
                                    fontSize: '1rem', borderRadius: 'var(--c-r-full)', 
                                    cursor: 'pointer', fontWeight: 'bold', flex: 1
                                }}
                            >
                                Hủy bỏ
                            </button>

                            <button
                                className="c-btn"
                                onClick={handleOrder}
                                style={{
                                    background: 'var(--c-success)', color: '#fff', 
                                    padding: '14px 0', fontSize: '1rem', border: 'none',
                                    borderRadius: 'var(--c-r-full)', cursor: 'pointer', fontWeight: 'bold',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flex: 1.5
                                }}
                            >
                                <ShoppingCart size={20} /> Chốt đơn
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientGacha;