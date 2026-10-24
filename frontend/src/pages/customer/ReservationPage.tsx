import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { reservationApi } from '../../api/reservationApi';
import { 
  Sparkles, Armchair, Calendar, Clock, Users, Phone, User, Mail, 
  FileText, CheckCircle2, AlertCircle, ArrowLeft, Utensils, Copy, Check, 
  ShieldCheck, Search, ChevronRight, Heart, Cake, Briefcase, 
  PhoneCall, SlidersHorizontal, Wine, CheckSquare, Layers
} from 'lucide-react';
import './ReservationPage.css';

/* ── INTERFACES & DTOs (Preserving 100% Backend Contracts) ── */
interface TableItem {
  id: string;
  tableNo: string;
  capacity: number;
  status: string; // 'available' | 'reserved' | 'occupied'
  area?: string;
  highlightTag?: string;
}

interface ReservationDetail {
  id: string;
  reservationCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  partySize: number;
  reservationTime: string;
  status: string;
  tableId?: string | null;
  tableNo?: string | null;
  tableCapacity?: number | null;
  specialNotes?: string | null;
  createdAt?: string;
}

interface BookingFormState {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  partySize: number;
  reservationDate: string;
  reservationTime: string;
  occasion: string;
  specialNotes: string;
}

const OCCASIONS = [
  { id: 'date', label: 'Hẹn hò lãng mạn', icon: Heart },
  { id: 'birthday', label: 'Sinh nhật / Kỷ niệm', icon: Cake },
  { id: 'business', label: 'Tiếp khách công việc', icon: Briefcase },
  { id: 'family', label: 'Gặp gỡ gia đình', icon: Users },
  { id: 'casual', label: 'Thưởng thức ẩm thực', icon: Utensils },
];

const POPULAR_TIME_SLOTS = [
  { time: '11:30', period: 'Trưa' },
  { time: '12:00', period: 'Trưa' },
  { time: '12:30', period: 'Trưa' },
  { time: '18:00', period: 'Tối' },
  { time: '18:30', period: 'Tối' },
  { time: '19:00', period: 'Tối' },
  { time: '19:30', period: 'Tối' },
  { time: '20:00', period: 'Tối' },
];

/**
 * Phân định khu vực sảnh & điểm nhấn thị giác dựa trên quy chuẩn mặt bằng F&B
 */
function getTableMeta(tableNo: string, capacity: number): { area: string; highlightTag: string } {
  const num = parseInt(tableNo.replace(/\D/g, ''), 10) || 0;
  if (capacity >= 8 || num >= 9) {
    return { area: 'Phòng Tiệc VIP Hoàng Gia', highlightTag: 'Không gian riêng tư biệt lập' };
  } else if (num >= 5 && num <= 8) {
    return { area: 'Ban Công View Phố · Tầng 2', highlightTag: 'Tầm nhìn toàn cảnh lung linh' };
  }
  return { area: 'Sảnh Ánh Sáng · Tầng 1', highlightTag: 'Gần vườn tiểu cảnh nến thơm' };
}

function extractErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
  }
  if (err instanceof Error) return err.message;
  return 'Đặt bàn không thành công. Quý khách vui lòng thử lại hoặc gọi Hotline phục vụ!';
}

/* ═══════════════════════════════════════════════════════════════════════════
   ATMOSPHERIC CANDLELIGHT SHADER / CANVAS (GPU Compositing · Zero Reflow)
   Mô phỏng ánh sáng nến lung linh và bụi vàng lơ lửng trong không gian fine-dining
   ═══════════════════════════════════════════════════════════════════════════ */
const AmbientCandlelightCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const getSize = () => ({
      w: canvas.parentElement?.offsetWidth ?? window.innerWidth,
      h: canvas.parentElement?.offsetHeight ?? window.innerHeight,
    });

    let { w: width, h: height } = getSize();
    canvas.width = width;
    canvas.height = height;

    const handleResize = () => {
      if (!canvas) return;
      const s = getSize();
      width = canvas.width = s.w;
      height = canvas.height = s.h;
    };
    window.addEventListener('resize', handleResize, { passive: true });

    // Hạt bụi vàng lơ lửng (Fine-Dining Champagne & Gold Dust Particles)
    const PARTICLE_COUNT = 32;
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.8 + 0.6,
      speedY: -(Math.random() * 0.35 + 0.15),
      speedX: (Math.random() - 0.5) * 0.2,
      opacity: Math.random() * 0.5 + 0.2,
      fadeSpeed: Math.random() * 0.008 + 0.003,
      fadeDir: 1,
    }));

    let time = 0;
    let animId: number;

    const render = () => {
      // Dừng vòng lặp khi tab trình duyệt không kích hoạt nhằm tiết kiệm 100% pin & GPU
      if (document.hidden) {
        animId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      time += 0.015;

      // 1. Ánh nến ấm áp dao động điều hòa (Harmonic Candle Light)
      const flicker1 = Math.sin(time * 1.2) * 20 + Math.cos(time * 2.3) * 15;
      const grad1 = ctx.createRadialGradient(
        width * 0.25, height * 0.15, 0,
        width * 0.25, height * 0.15, 420 + flicker1
      );
      grad1.addColorStop(0, 'rgba(197, 168, 128, 0.09)');
      grad1.addColorStop(0.5, 'rgba(197, 168, 128, 0.025)');
      grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const flicker2 = Math.cos(time * 0.9) * 25 + Math.sin(time * 1.8) * 10;
      const grad2 = ctx.createRadialGradient(
        width * 0.8, height * 0.45, 0,
        width * 0.8, height * 0.45, 480 + flicker2
      );
      grad2.addColorStop(0, 'rgba(197, 168, 128, 0.07)');
      grad2.addColorStop(0.6, 'rgba(197, 168, 128, 0.015)');
      grad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // 2. Chuyển động hạt bụi vàng hữu cơ
      ctx.fillStyle = 'rgba(232, 215, 190, ';
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i];
        p.y += p.speedY;
        p.x += p.speedX;

        p.opacity += p.fadeSpeed * p.fadeDir;
        if (p.opacity >= 0.75) p.fadeDir = -1;
        if (p.opacity <= 0.15) p.fadeDir = 1;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }

        ctx.fillStyle = `rgba(232, 215, 190, ${p.opacity * 0.6})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="lux-ambient-canvas" aria-hidden="true" />;
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT: RESERVATION PAGE (HAUTE CUISINE CONCIERGE)
   ═══════════════════════════════════════════════════════════════════════════ */
export default function ReservationPage(): React.ReactElement {
  const navigate = useNavigate();

  // Chuyển view: 'tables' (Sơ đồ mặt bằng) | 'form' (Đặt chỗ) | 'tracking' (Tra cứu)
  const [currentView, setCurrentView] = useState<'tables' | 'form' | 'tracking'>('tables');
  
  // Dữ liệu bàn từ Backend
  const [tablesLoading, setTablesLoading] = useState<boolean>(true);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null);

  // Bộ lọc chuyên nghiệp
  const [capacityFilter, setCapacityFilter] = useState<'ALL' | '2' | '4' | '6+'>('ALL');
  const [availableOnly, setAvailableOnly] = useState<boolean>(false);
  const [searchTableQuery, setSearchTableQuery] = useState<string>('');

  // Trạng thái Form & Loading
  const [loading, setLoading] = useState<boolean>(false);
  const [successBooking, setSuccessBooking] = useState<ReservationDetail | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Ngày hiện tại định dạng YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Form State
  const [formData, setFormData] = useState<BookingFormState>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    partySize: 2,
    reservationDate: todayStr,
    reservationTime: '19:00',
    occasion: 'Hẹn hò lãng mạn',
    specialNotes: '',
  });

  // Tracking State
  const [trackCode, setTrackCode] = useState<string>('');
  const [trackResult, setTrackResult] = useState<ReservationDetail | null>(null);
  const [trackError, setTrackError] = useState<string>('');

  // Tải danh sách bàn từ Backend (100% Endpoint nguyên bản)
  useEffect(() => {
    let isCancelled = false;
    const fetchTables = async () => {
      setTablesLoading(true);
      try {
        const res = await reservationApi.getTables();
        if (!isCancelled) {
          const rawList = res.data || [];
          const normalized: TableItem[] = rawList.map((t: any) => {
            const tNo = t.tableNo || t.table_no || `Bàn ${t.id}`;
            const cap = Number(t.capacity || 2);
            const meta = getTableMeta(tNo, cap);
            return {
              id: t.id,
              tableNo: tNo,
              capacity: cap,
              status: (t.status || 'available').toLowerCase(),
              area: meta.area,
              highlightTag: meta.highlightTag,
            };
          });
          setTables(normalized);
        }
      } catch (err: unknown) {
        console.error('Không thể đồng bộ sơ đồ bàn tiệc:', extractErrorMessage(err));
      } finally {
        if (!isCancelled) setTablesLoading(false);
      }
    };
    fetchTables();
    return () => { isCancelled = true; };
  }, []);

  // Lọc danh sách bàn
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      if (availableOnly && t.status !== 'available') return false;
      if (capacityFilter === '2' && t.capacity !== 2) return false;
      if (capacityFilter === '4' && t.capacity !== 4) return false;
      if (capacityFilter === '6+' && t.capacity < 6) return false;

      if (searchTableQuery.trim()) {
        const q = searchTableQuery.toLowerCase();
        const matchesName = t.tableNo.toLowerCase().includes(q);
        const matchesArea = t.area ? t.area.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesArea) return false;
      }
      return true;
    });
  }, [tables, capacityFilter, availableOnly, searchTableQuery]);

  // Thống kê nhanh sảnh phục vụ
  const tableStats = useMemo(() => {
    const total = tables.length;
    const available = tables.filter((t) => t.status === 'available').length;
    const reserved = tables.filter((t) => t.status === 'reserved').length;
    const occupied = tables.filter((t) => t.status === 'occupied').length;
    return { total, available, reserved, occupied };
  }, [tables]);

  // Xử lý chọn bàn
  const handleSelectTable = useCallback((table: TableItem) => {
    if (table.status !== 'available') return;
    setSelectedTable(table);
    setFormData((prev) => ({
      ...prev,
      partySize: Math.min(prev.partySize || 2, table.capacity),
    }));
    setErrorMsg('');
    setCurrentView('form');
    window.scrollTo({ top: 300, behavior: 'smooth' });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Submit Đặt Bàn (Đảm bảo 100% Payload khớp Backend)
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable) return;

    if (!formData.customerName.trim()) {
      setErrorMsg('Kính đề nghị quý khách để lại Họ và tên để nhà hàng đón tiếp chu đáo.');
      return;
    }
    if (!formData.customerPhone.trim() || formData.customerPhone.trim().length < 9) {
      setErrorMsg('Vui lòng cung cấp số điện thoại liên hệ chính xác để bộ phận Concierge xác nhận.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const fullDateTime = `${formData.reservationDate}T${formData.reservationTime}:00`;
      const tableNote = `[Khách chọn: ${selectedTable.tableNo} - ${selectedTable.capacity} chỗ (${selectedTable.area})]`;
      const occasionNote = formData.occasion ? `[Dịp: ${formData.occasion}]` : '';
      const parts = [tableNote, occasionNote, formData.specialNotes].filter(Boolean);
      const combinedNotes = parts.join(' - ');

      const payload = {
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        customerEmail: formData.customerEmail.trim() || null,
        partySize: Number(formData.partySize),
        reservationTime: fullDateTime,
        specialNotes: combinedNotes,
      };

      const res = await reservationApi.createOnline(payload);
      setSuccessBooking(res.data);
      window.scrollTo({ top: 220, behavior: 'smooth' });
    } catch (err: unknown) {
      setErrorMsg(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Tra cứu mã đặt bàn
  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackCode.trim()) return;
    setLoading(true);
    setTrackError('');
    setTrackResult(null);

    try {
      const res = await reservationApi.trackByCode(trackCode.trim().toUpperCase());
      setTrackResult(res.data);
    } catch (err: unknown) {
      setTrackError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Sao chép mã đặt bàn
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2400);
  };

  return (
    <div className="lux-res-page">
      {/* ── BỀ MẶT ĐIỆN ẢNH CHIAROSCURO & ÁNH SÁNG NẾN ── */}
      <AmbientCandlelightCanvas />
      <div className="lux-mesh-texture" aria-hidden="true" />

      <div className="lux-res-container">
        {/* ══════════════════════════════════════════════════════════════
            1. HERO HEADER: HAUTE CUISINE FINE-DINING GREETING
            ══════════════════════════════════════════════════════════════ */}
        <header className="lux-hero-section">
          <div className="lux-eyebrow-pill">
            <Sparkles size={13} className="lux-eyebrow-icon" />
            <span>OMNIRESTO HAUTE CUISINE · DỊCH VỤ ĐẶT CHỖ THƯỢNG HẠNG</span>
          </div>

          <h1 className="lux-hero-title">
            Khám Phá & Đặt Bàn Tiệc
          </h1>

          <p className="lux-hero-subtitle">
            Hòa mình vào không gian ẩm thực sang trọng bậc nhất. Trải nghiệm nghệ thuật phục vụ chu đáo với đặc quyền giữ bàn ưu tiên và đón tiếp cá nhân hóa.
          </p>

          {/* Bar chỉ số sảnh phục vụ */}
          <div className="lux-metrics-strip">
            <div className="lux-metric-block">
              <span className="lux-metric-number">{tableStats.total}</span>
              <span className="lux-metric-label">Tổng Vị Trí</span>
            </div>
            <div className="lux-metric-sep" />
            <div className="lux-metric-block">
              <span className="lux-metric-number highlight-avail">{tableStats.available}</span>
              <span className="lux-metric-label">Bàn Sẵn Sàng</span>
            </div>
            <div className="lux-metric-sep" />
            <div className="lux-metric-block">
              <span className="lux-metric-number highlight-gold">15 Phút</span>
              <span className="lux-metric-label">Giữ Bàn Đảm Bảo</span>
            </div>
          </div>

          {/* Segmented Concierge Tab Switcher */}
          <div className="lux-segmented-nav">
            <button
              type="button"
              onClick={() => { setCurrentView('tables'); setSuccessBooking(null); }}
              className={`lux-nav-tab ${currentView !== 'tracking' ? 'is-active' : ''}`}
            >
              <Armchair size={15} />
              <span>Sơ Đồ Mặt Bằng & Chọn Bàn</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('tracking')}
              className={`lux-nav-tab ${currentView === 'tracking' ? 'is-active' : ''}`}
            >
              <Search size={15} />
              <span>Tra Cứu Mã Phiếu VIP</span>
            </button>
          </div>
        </header>

        {/* ══════════════════════════════════════════════════════════════
            2. VIEW 1: SƠ ĐỒ MẶT BẰNG & CHỌN BÀN TIỆC
            ══════════════════════════════════════════════════════════════ */}
        {currentView === 'tables' && (
          <section className="lux-panel-frame">
            <div className="lux-panel-header">
              <div>
                <h2 className="lux-panel-headline">Sảnh Tiệc & Bàn Ăn Khách Quý</h2>
                <p className="lux-panel-desc">Chọn vị trí ngồi yêu thích của quý khách để chuyển sang bước thông tin đón tiếp</p>
              </div>

              {/* Status Legends */}
              <div className="lux-legend-cluster">
                <span className="lux-legend-tag is-avail">
                  <span className="lux-indicator-dot dot-avail" />
                  <span>Sẵn Sàng Đón Tiếp ({tableStats.available})</span>
                </span>
                <span className="lux-legend-tag is-reserved">
                  <span className="lux-indicator-dot dot-reserved" />
                  <span>Đã Có Lịch Hẹn ({tableStats.reserved})</span>
                </span>
                <span className="lux-legend-tag is-occupied">
                  <span className="lux-indicator-dot dot-occupied" />
                  <span>Đang Dùng Bữa ({tableStats.occupied})</span>
                </span>
              </div>
            </div>

            {/* Filter Shelf */}
            <div className="lux-toolbar-shelf">
              <div className="lux-capacity-filter-row">
                <span className="lux-filter-label">
                  <SlidersHorizontal size={13} /> Sức chứa:
                </span>
                <button
                  type="button"
                  onClick={() => setCapacityFilter('ALL')}
                  className={`lux-capacity-btn ${capacityFilter === 'ALL' ? 'is-selected' : ''}`}
                >
                  Tất cả ({tables.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCapacityFilter('2')}
                  className={`lux-capacity-btn ${capacityFilter === '2' ? 'is-selected' : ''}`}
                >
                  2 Khách (Hẹn Hò)
                </button>
                <button
                  type="button"
                  onClick={() => setCapacityFilter('4')}
                  className={`lux-capacity-btn ${capacityFilter === '4' ? 'is-selected' : ''}`}
                >
                  4 Khách (Tiêu Chuẩn)
                </button>
                <button
                  type="button"
                  onClick={() => setCapacityFilter('6+')}
                  className={`lux-capacity-btn ${capacityFilter === '6+' ? 'is-selected' : ''}`}
                >
                  6-10+ Khách (Tiệc Nhóm VIP)
                </button>
              </div>

              <div className="lux-toolbar-right">
                <label className="lux-avail-toggle-label">
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(e) => setAvailableOnly(e.target.checked)}
                    className="lux-custom-checkbox"
                  />
                  <span>Chỉ hiện bàn trống</span>
                </label>

                <div className="lux-search-box">
                  <Search size={14} className="lux-search-icon" />
                  <input
                    type="text"
                    value={searchTableQuery}
                    onChange={(e) => setSearchTableQuery(e.target.value)}
                    placeholder="Tìm số bàn, khu vực..."
                    className="lux-search-input"
                  />
                </div>
              </div>
            </div>

            {/* Lưới Bàn Tiệc (Bespoke Luxury Cards) */}
            {tablesLoading ? (
              <div className="lux-state-spinner-box">
                <div className="lux-ring-spinner" />
                <p className="lux-state-spinner-text">Đang đồng bộ sơ đồ mặt bằng sảnh tiệc thời gian thực...</p>
              </div>
            ) : filteredTables.length === 0 ? (
              <div className="lux-empty-results">
                <Armchair size={48} className="lux-empty-icon" />
                <h3 className="lux-empty-title">Không tìm thấy vị trí bàn phù hợp</h3>
                <p className="lux-empty-desc">Quý khách vui lòng điều chỉnh lại bộ lọc sức chứa hoặc làm mới tìm kiếm.</p>
                <button
                  type="button"
                  onClick={() => { setCapacityFilter('ALL'); setAvailableOnly(false); setSearchTableQuery(''); }}
                  className="lux-btn-reset-filter"
                >
                  Xem Lại Toàn Bộ Sảnh Tiệc
                </button>
              </div>
            ) : (
              <div className="lux-tables-layout-grid">
                {filteredTables.map((table) => {
                  const isAvailable = table.status === 'available';
                  const isReserved = table.status === 'reserved';

                  return (
                    <div
                      key={table.id}
                      onClick={() => handleSelectTable(table)}
                      className={`lux-table-tile ${isAvailable ? 'tile-is-available' : 'tile-is-disabled'}`}
                    >
                      <div className="lux-tile-top-row">
                        <span className="lux-tile-area-tag">{table.area}</span>
                        <div className={`lux-tile-status-chip ${isAvailable ? 'chip-avail' : isReserved ? 'chip-reserved' : 'chip-occupied'}`}>
                          <span className={`lux-indicator-dot ${isAvailable ? 'dot-avail' : isReserved ? 'dot-reserved' : 'dot-occupied'}`} />
                          <span>{isAvailable ? 'Trống' : isReserved ? 'Đã giữ' : 'Có khách'}</span>
                        </div>
                      </div>

                      <div className="lux-tile-visual">
                        <div className="lux-table-emblem-wrap">
                          <Armchair size={26} strokeWidth={1.8} />
                        </div>
                        <h3 className="lux-tile-num-title">{table.tableNo}</h3>
                        <div className="lux-tile-cap-row">
                          <Users size={13} />
                          <span>Sức chứa: <strong>{table.capacity} khách</strong></span>
                        </div>
                      </div>

                      <div className="lux-tile-feature-box">
                        <Sparkles size={11} className="text-amber-400" />
                        <span>{table.highlightTag}</span>
                      </div>

                      <div className="lux-tile-cta-row">
                        {isAvailable ? (
                          <span className="lux-tile-cta-link">
                            Chọn Bàn Này <ChevronRight size={14} />
                          </span>
                        ) : (
                          <span className="lux-tile-disabled-text">
                            {isReserved ? 'Vị trí đã được đặt trước' : 'Bàn hiện đang phục vụ'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════
            3. VIEW 2: FORM ĐIỀN THÔNG TIN & PREVIEW TICKET STICKY
            ══════════════════════════════════════════════════════════════ */}
        {currentView === 'form' && selectedTable && (
          <section className="lux-form-experience">
            {successBooking ? (
              /* ── 3.1 MÀN HÌNH ĐẶT BÀN THÀNH CÔNG: VIP DINING PASS ── */
              <div className="lux-success-experience">
                <div className="lux-boarding-card">
                  <div className="lux-pass-ribbon">
                    <ShieldCheck size={16} />
                    <span>XÁC NHẬN GIỮ CHỖ THÀNH CÔNG</span>
                  </div>

                  <h2 className="lux-pass-headline">Hẹn Gặp Quý Khách Tại OmniResto!</h2>
                  <p className="lux-pass-subline">
                    Thông tin giữ chỗ đã được gửi về bộ phận lễ tân. Bàn tiệc của quý khách đã được lên lịch chuẩn bị với tiêu chuẩn khắt khe nhất.
                  </p>

                  {/* VIP Token Dock */}
                  <div className="lux-pass-token-dock">
                    <span className="lux-token-label">MÃ PHIẾU ĐẶT BÀN VIP</span>
                    <div className="lux-token-code">{successBooking.reservationCode}</div>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(successBooking.reservationCode)}
                      className="lux-btn-copy-token"
                    >
                      {copiedCode ? (
                        <>
                          <Check size={14} className="text-emerald-400" />
                          <span>Đã sao chép vào bộ nhớ tạm!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Sao Chép Mã Phiếu</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Lưới chi tiết lịch hẹn */}
                  <div className="lux-pass-grid">
                    <div className="lux-pass-cell">
                      <span className="lux-pass-cell-lbl">Khách Hàng</span>
                      <strong className="lux-pass-cell-val">{formData.customerName}</strong>
                    </div>
                    <div className="lux-pass-cell">
                      <span className="lux-pass-cell-lbl">Số Điện Thoại</span>
                      <strong className="lux-pass-cell-val">{formData.customerPhone}</strong>
                    </div>
                    <div className="lux-pass-cell">
                      <span className="lux-pass-cell-lbl">Vị Trí Đã Chọn</span>
                      <strong className="lux-pass-cell-val text-amber-300">{selectedTable.tableNo} ({selectedTable.area})</strong>
                    </div>
                    <div className="lux-pass-cell">
                      <span className="lux-pass-cell-lbl">Quy Mô Bàn</span>
                      <strong className="lux-pass-cell-val">{formData.partySize} Khách</strong>
                    </div>
                    <div className="lux-pass-cell">
                      <span className="lux-pass-cell-lbl">Thời Gian Hẹn</span>
                      <strong className="lux-pass-cell-val">{formData.reservationTime} · {formData.reservationDate}</strong>
                    </div>
                    <div className="lux-pass-cell">
                      <span className="lux-pass-cell-lbl">Mục Đích Dịp</span>
                      <strong className="lux-pass-cell-val">{formData.occasion}</strong>
                    </div>
                  </div>

                  {/* Ghi chú đón tiếp */}
                  <div className="lux-pass-advisory">
                    <CheckSquare size={16} className="text-amber-400 flex-shrink-0" />
                    <div>
                      <strong>Đặc quyền giữ chỗ:</strong> Bàn tiệc của quý khách sẽ được giữ ưu tiên trong vòng <strong>15 phút</strong> so với giờ hẹn. Quý khách vui lòng cung cấp mã phiếu hoặc số điện thoại tại quầy lễ tân để được hộ tống vào bàn.
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="lux-pass-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setSuccessBooking(null);
                        setSelectedTable(null);
                        setCurrentView('tables');
                      }}
                      className="lux-btn-ghost-pass"
                    >
                      <ArrowLeft size={16} /> Đặt Thêm Bàn Tiệc Khác
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate('/client/menu')}
                      className="lux-btn-gold-pass"
                    >
                      <Utensils size={16} /> Khám Phá Thực Đơn Thượng Hạng
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ── 3.2 FORM ĐIỀN THÔNG TIN 2 CỘT ── */
              <div className="lux-booking-columns">
                {/* CỘT TRÁI: FORM ĐIỀN THÔNG TIN */}
                <div className="lux-form-card">
                  <div className="lux-form-nav-bar">
                    <button
                      type="button"
                      onClick={() => setCurrentView('tables')}
                      className="lux-btn-back"
                    >
                      <ArrowLeft size={14} />
                      <span>Chọn lại vị trí bàn</span>
                    </button>

                    <div className="lux-step-counter">
                      <span>BƯỚC 2/2 · THÔNG TIN ĐÓN TIẾP</span>
                    </div>
                  </div>

                  <h2 className="lux-form-title">Thông Tin Giữ Chỗ Quý Khách</h2>
                  <p className="lux-form-subtitle">Quý khách vui lòng để lại thông tin để bộ phận Concierge chuẩn bị không gian chu đáo nhất</p>

                  {errorMsg && (
                    <div className="lux-alert-danger">
                      <AlertCircle size={18} className="flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleBookingSubmit}>
                    {/* Row 1: Tên & Điện Thoại */}
                    <div className="lux-input-grid-2">
                      <div className="lux-field-block">
                        <label className="lux-field-label">
                          <User size={14} /> Họ và tên khách quý <span className="req">*</span>
                        </label>
                        <input
                          type="text"
                          name="customerName"
                          required
                          value={formData.customerName}
                          onChange={handleChange}
                          placeholder="Ví dụ: Hoàng Đình Duy"
                          className="lux-input-luxury"
                        />
                      </div>

                      <div className="lux-field-block">
                        <label className="lux-field-label">
                          <Phone size={14} /> Số điện thoại liên hệ <span className="req">*</span>
                        </label>
                        <input
                          type="tel"
                          name="customerPhone"
                          required
                          value={formData.customerPhone}
                          onChange={handleChange}
                          placeholder="Ví dụ: 0912 345 678"
                          className="lux-input-luxury"
                        />
                      </div>
                    </div>

                    {/* Row 2: Email & Số Lượng Khách */}
                    <div className="lux-input-grid-2">
                      <div className="lux-field-block">
                        <label className="lux-field-label">
                          <Mail size={14} /> Email nhận xác nhận (tùy chọn)
                        </label>
                        <input
                          type="email"
                          name="customerEmail"
                          value={formData.customerEmail}
                          onChange={handleChange}
                          placeholder="quykhach@gmail.com"
                          className="lux-input-luxury"
                        />
                      </div>

                      <div className="lux-field-block">
                        <label className="lux-field-label">
                          <Users size={14} /> Số lượng thực khách <span className="req">*</span>
                        </label>
                        <div className="lux-party-quick-row">
                          {[1, 2, 4, 6, 8, 10].map((size) => {
                            if (size > selectedTable.capacity) return null;
                            return (
                              <button
                                key={size}
                                type="button"
                                onClick={() => setFormData((p) => ({ ...p, partySize: size }))}
                                className={`lux-party-pill ${formData.partySize === size ? 'is-active' : ''}`}
                              >
                                {size} khách
                              </button>
                            );
                          })}
                        </div>
                        <div className="lux-party-custom-box">
                          <input
                            type="number"
                            name="partySize"
                            min="1"
                            max={selectedTable.capacity}
                            required
                            value={formData.partySize}
                            onChange={handleChange}
                            className="lux-input-luxury"
                            style={{ maxWidth: 110 }}
                          />
                          <span className="lux-party-limit-tag">
                            Tối đa {selectedTable.capacity} khách cho {selectedTable.tableNo}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Ngày & Giờ Đến */}
                    <div className="lux-input-grid-2">
                      <div className="lux-field-block">
                        <label className="lux-field-label">
                          <Calendar size={14} /> Ngày dùng bữa <span className="req">*</span>
                        </label>
                        <input
                          type="date"
                          name="reservationDate"
                          min={todayStr}
                          required
                          value={formData.reservationDate}
                          onChange={handleChange}
                          className="lux-input-luxury"
                        />
                      </div>

                      <div className="lux-field-block">
                        <label className="lux-field-label">
                          <Clock size={14} /> Giờ dự kiến đến <span className="req">*</span>
                        </label>
                        <input
                          type="time"
                          name="reservationTime"
                          required
                          value={formData.reservationTime}
                          onChange={handleChange}
                          className="lux-input-luxury"
                        />
                      </div>
                    </div>

                    {/* Khung giờ phổ biến */}
                    <div className="lux-time-slots-wrapper">
                      <span className="lux-time-slots-title">Khung giờ ẩm thực phổ biến:</span>
                      <div className="lux-time-slots-list">
                        {POPULAR_TIME_SLOTS.map((slot) => (
                          <button
                            key={slot.time}
                            type="button"
                            onClick={() => setFormData((p) => ({ ...p, reservationTime: slot.time }))}
                            className={`lux-slot-btn ${formData.reservationTime === slot.time ? 'is-active' : ''}`}
                          >
                            <span>{slot.time}</span>
                            <span className="lux-slot-period">({slot.period})</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Row 4: Mục đích hoặc dịp dùng bữa */}
                    <div className="lux-field-block">
                      <label className="lux-field-label">
                        <Sparkles size={14} /> Mục đích hoặc dịp đặc biệt
                      </label>
                      <div className="lux-occasion-grid">
                        {OCCASIONS.map((occ) => {
                          const IconCmp = occ.icon;
                          const isSelected = formData.occasion === occ.label;
                          return (
                            <button
                              key={occ.id}
                              type="button"
                              onClick={() => setFormData((p) => ({ ...p, occasion: occ.label }))}
                              className={`lux-occasion-card ${isSelected ? 'is-active' : ''}`}
                            >
                              <IconCmp size={16} />
                              <span>{occ.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Row 5: Yêu cầu đặc biệt cho nhà bếp */}
                    <div className="lux-field-block">
                      <label className="lux-field-label">
                        <FileText size={14} /> Yêu cầu đặc biệt cho Bếp Trưởng & Phục Vụ (tùy chọn)
                      </label>
                      <textarea
                        name="specialNotes"
                        rows={3}
                        value={formData.specialNotes}
                        onChange={handleChange}
                        placeholder="Ví dụ: Cần chuẩn bị nến thơm trang trí kỷ niệm, dị ứng đậu phộng/hải sản, xếp ghế trẻ em..."
                        className="lux-textarea-luxury"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="lux-btn-submit-booking"
                    >
                      {loading ? (
                        <>
                          <div className="lux-btn-spinner" />
                          <span>Đang xác nhận giữ chỗ với nhà hàng...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={18} />
                          <span>Xác Nhận Giữ Chỗ {selectedTable.tableNo}</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* CỘT PHẢI: VIP CONCIERGE TICKET (STICKY) */}
                <aside className="lux-ticket-sticky-sidebar">
                  <div className="lux-preview-ticket">
                    <div className="lux-ticket-top-badge">
                      <Wine size={13} />
                      <span>PHIẾU TÓM TẮT GIỮ CHỖ</span>
                    </div>

                    <h3 className="lux-ticket-brand-title">OmniResto Fine Dining</h3>
                    <p className="lux-ticket-brand-sub">Sảnh ẩm thực 5 sao · 123 Phố Ẩm Thực, Quận 1</p>

                    <div className="lux-perforated-cut" />

                    {/* Table Focus */}
                    <div className="lux-ticket-table-focus">
                      <div className="lux-focus-emblem">
                        <Armchair size={22} />
                      </div>
                      <div>
                        <div className="lux-focus-table-no">{selectedTable.tableNo}</div>
                        <div className="lux-focus-table-area">{selectedTable.area}</div>
                      </div>
                    </div>

                    {/* Live Specs */}
                    <div className="lux-ticket-detail-rows">
                      <div className="lux-ticket-row">
                        <span className="lux-ticket-row-lbl">
                          <Users size={14} /> Số lượng khách:
                        </span>
                        <strong className="lux-ticket-row-val">{formData.partySize} Người</strong>
                      </div>
                      <div className="lux-ticket-row">
                        <span className="lux-ticket-row-lbl">
                          <Calendar size={14} /> Ngày dùng bữa:
                        </span>
                        <strong className="lux-ticket-row-val">{formData.reservationDate}</strong>
                      </div>
                      <div className="lux-ticket-row">
                        <span className="lux-ticket-row-lbl">
                          <Clock size={14} /> Giờ hẹn:
                        </span>
                        <strong className="lux-ticket-row-val gold-text">{formData.reservationTime}</strong>
                      </div>
                      <div className="lux-ticket-row">
                        <span className="lux-ticket-row-lbl">
                          <Heart size={14} /> Mục đích:
                        </span>
                        <strong className="lux-ticket-row-val">{formData.occasion}</strong>
                      </div>
                    </div>

                    <div className="lux-perforated-cut" />

                    {/* Promises */}
                    <div className="lux-concierge-promises">
                      <div className="lux-promise-item">
                        <ShieldCheck size={15} className="text-emerald-400 flex-shrink-0" />
                        <span>Giữ chỗ ưu tiên trong <strong>15 phút</strong> kể từ giờ hẹn</span>
                      </div>
                      <div className="lux-promise-item">
                        <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                        <span>Hỗ trợ điều chỉnh lịch hẹn linh hoạt qua Hotline</span>
                      </div>
                      <div className="lux-promise-item">
                        <PhoneCall size={15} className="text-emerald-400 flex-shrink-0" />
                        <span>Concierge VIP Hotline: <strong>0368 295 264</strong></span>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            )}
          </section>
        )}

        {/* Fallback khi người dùng ở view form nhưng chưa chọn bàn */}
        {currentView === 'form' && !selectedTable && !successBooking && (
          <section className="lux-panel-frame" style={{ textAlign: 'center', padding: '64px 24px' }}>
            <div style={{ maxWidth: 480, margin: '0 auto' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: 'var(--c-surface-warm, #fff7ed)',
                border: '1px solid var(--c-border, #fed7aa)', display: 'inline-flex', alignItems: 'center',
                justifyContent: 'center', color: 'var(--c-primary, #ff6b00)', marginBottom: 20
              }}>
                <Armchair size={30} />
              </div>
              <h3 style={{ fontFamily: "var(--c-font-display, 'Plus Jakarta Sans')", fontSize: '1.4rem', fontWeight: 800, color: 'var(--c-text-main, #1c1917)', marginBottom: 8 }}>
                Quý Khách Chưa Chọn Bàn Tiệc
              </h3>
              <p style={{ color: 'var(--c-text-muted, #78716c)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: 24 }}>
                Vui lòng chọn vị trí bàn trong sơ đồ sảnh tiệc trước khi chuyển sang bước điền thông tin đặt chỗ.
              </p>
              <button
                type="button"
                onClick={() => setCurrentView('tables')}
                className="lux-btn-submit-booking"
                style={{ width: 'auto', display: 'inline-flex', padding: '12px 28px', margin: '0 auto' }}
              >
                <ArrowLeft size={16} /> Quay Lại Sơ Đồ Bàn Tiệc
              </button>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════
            4. VIEW 3: LEAN CONCIERGE TRACKER (TRA CỨU MÃ PHIẾU VIP)
            ══════════════════════════════════════════════════════════════ */}
        {currentView === 'tracking' && (
          <section className="lux-panel-frame lux-tracker-view">
            <div className="lux-tracker-header">
              <div className="lux-tracker-icon-badge">
                <Search size={26} />
              </div>
              <h2 className="lux-panel-headline">Tra Cứu Phiếu Đặt Bàn VIP</h2>
              <p className="lux-panel-desc">Nhập mã phiếu đặt chỗ (Ví dụ: RSV-ONL-XXXX) để kiểm tra tình trạng chuẩn bị của nhà hàng</p>
            </div>

            <form onSubmit={handleTrackSubmit} className="lux-tracker-form">
              <input
                type="text"
                required
                value={trackCode}
                onChange={(e) => setTrackCode(e.target.value)}
                placeholder="Nhập mã phiếu (Ví dụ: RSV-ONL-1562)"
                className="lux-tracker-input"
              />
              <button
                type="submit"
                disabled={loading}
                className="lux-tracker-submit-btn"
              >
                {loading ? <div className="lux-btn-spinner" /> : <Search size={16} />}
                <span>Kiểm Tra Ngay</span>
              </button>
            </form>

            {trackError && (
              <div className="lux-alert-danger" style={{ maxWidth: 560, margin: '0 auto 24px' }}>
                <AlertCircle size={18} className="flex-shrink-0" />
                <span>{trackError}</span>
              </div>
            )}

            {/* Kết Quả Tra Cứu */}
            {trackResult && (
              <div>
                {/* Stepper Tiến Trình */}
                <div className="lux-stepper-progress">
                  <div className={`lux-step-node ${['PENDING', 'CONFIRMED', 'SEATED'].includes(trackResult.status) ? 'is-finished' : ''}`}>
                    <div className="lux-step-ring">1</div>
                    <span className="lux-step-tag">Tiếp Nhận Đơn</span>
                  </div>
                  <div className={`lux-step-connector ${['CONFIRMED', 'SEATED'].includes(trackResult.status) ? 'is-active' : ''}`} />
                  <div className={`lux-step-node ${['CONFIRMED', 'SEATED'].includes(trackResult.status) ? 'is-finished' : ''}`}>
                    <div className="lux-step-ring">2</div>
                    <span className="lux-step-tag">Đã Xếp Bàn</span>
                  </div>
                  <div className={`lux-step-connector ${trackResult.status === 'SEATED' ? 'is-active' : ''}`} />
                  <div className={`lux-step-node ${trackResult.status === 'SEATED' ? 'is-finished' : ''}`}>
                    <div className="lux-step-ring">3</div>
                    <span className="lux-step-tag">Đang Dùng Bữa</span>
                  </div>
                </div>

                {/* Thẻ Chi Tiết */}
                <div className="lux-tracker-result-card">
                  <div className="lux-tracker-result-top">
                    <div>
                      <span className="lux-track-spec-lbl">MÃ PHIẾU ĐẶT BÀN</span>
                      <div className="lux-track-code-hero">{trackResult.reservationCode}</div>
                    </div>

                    <div className={`lux-status-badge badge-${trackResult.status.toLowerCase()}`}>
                      {trackResult.status === 'PENDING' && 'Đang Chờ Quán Xác Nhận'}
                      {trackResult.status === 'CONFIRMED' && 'Đã Chuẩn Bị Bàn Sẵn Sàng'}
                      {trackResult.status === 'SEATED' && 'Đang Dùng Bữa Tại Bàn'}
                      {trackResult.status === 'CANCELLED' && 'Phiếu Đã Hủy'}
                    </div>
                  </div>

                  <div className="lux-track-specs-grid">
                    <div className="lux-track-spec-item">
                      <span className="lux-track-spec-lbl">Khách Hàng</span>
                      <strong className="lux-track-spec-val">{trackResult.customerName}</strong>
                    </div>
                    <div className="lux-track-spec-item">
                      <span className="lux-track-spec-lbl">Số Điện Thoại</span>
                      <strong className="lux-track-spec-val">{trackResult.customerPhone}</strong>
                    </div>
                    <div className="lux-track-spec-item">
                      <span className="lux-track-spec-lbl">Số Lượng Khách</span>
                      <strong className="lux-track-spec-val">{trackResult.partySize} Người</strong>
                    </div>
                    <div className="lux-track-spec-item">
                      <span className="lux-track-spec-lbl">Thời Gian Hẹn</span>
                      <strong className="lux-track-spec-val">
                        {new Date(trackResult.reservationTime).toLocaleString('vi-VN')}
                      </strong>
                    </div>
                    <div className="lux-track-spec-item">
                      <span className="lux-track-spec-lbl">Vị Trí Phục Vụ</span>
                      <strong className="lux-track-spec-val text-amber-300">
                        {trackResult.tableNo ? `Bàn ${trackResult.tableNo}` : 'Đang bố trí vị trí'}
                      </strong>
                    </div>
                    <div className="lux-track-spec-item">
                      <span className="lux-track-spec-lbl">Chính Sách Đón Tiếp</span>
                      <strong className="lux-track-spec-val">
                        {trackResult.status === 'CONFIRMED' ? 'Giữ chỗ ưu tiên 15 phút' : 'Đang xử lý'}
                      </strong>
                    </div>
                  </div>

                  {trackResult.specialNotes && (
                    <div className="lux-track-notes-box">
                      <span className="lux-track-notes-title">Ghi Chú Đón Tiếp:</span>
                      <p style={{ margin: 0 }}>{trackResult.specialNotes}</p>
                    </div>
                  )}

                  <div className="lux-track-action-strip">
                    <a href="tel:0368295264" className="lux-call-hotline-btn">
                      <PhoneCall size={14} /> Gọi Hotline Concierge Hỗ Trợ
                    </a>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}