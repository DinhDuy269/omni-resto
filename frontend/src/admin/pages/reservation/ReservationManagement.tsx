import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { reservationApi } from '../../../shared/api/reservationApi';
import {
  Plus,
  RefreshCw,
  Armchair,
  Search,
  LayoutGrid,
  ListFilter,
  Clock,
  User,
  Users,
  Volume2,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar,
  Phone,
  AlertCircle,
  CheckCircle2,
  CalendarCheck2,
  Sun,
  Sunset,
  Moon,
  Layers,
  Utensils,
  Tag
} from 'lucide-react';
import './ReservationManagement.css';

interface TableItem {
  id: string;
  table_no: string;
  capacity: number;
  status: string;
}

interface ReservationItem {
  id: string;
  reservation_code: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  party_size: number;
  reservation_time: string;
  status: string;
  table_id?: string | null;
  table_no?: string | null;
  table_capacity?: number | null;
  special_notes?: string | null;
  created_at?: string;
  updated_at?: string;
  shift?: string;
  shift_name?: string;
}

interface AssignModalState {
  is_open: boolean;
  reservation: ReservationItem | null;
  selected_table_ids: string[];
}

interface OfflineFormState {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  table_ids: string[];
  special_notes: string;
  seated_immediately: boolean;
}

interface ShiftConfig {
  id: string;
  label: string;
  time_range: string;
  icon: typeof Sun;
}

const OPERATING_SHIFTS: ShiftConfig[] = [
  { id: 'ALL', label: 'Tất Cả Ca', time_range: 'Toàn bộ', icon: Utensils },
  { id: 'MORNING', label: 'Ca Sáng', time_range: '06:00 - 10:30', icon: Sun },
  { id: 'NOON', label: 'Ca Trưa', time_range: '10:30 - 14:30', icon: Sunset },
  { id: 'EVENING', label: 'Ca Tối', time_range: '16:30 - 22:00', icon: Moon },
];

function getShiftFromReservationTime(dateTimeStr: string): string {
  if (!dateTimeStr) return '';
  const date = new Date(dateTimeStr);
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (minutes >= 360 && minutes < 630) return 'MORNING';  // 06:00 - 10:30
  if (minutes >= 630 && minutes < 870) return 'NOON';     // 10:30 - 14:30
  if (minutes >= 990 && minutes < 1320) return 'EVENING'; // 16:30 - 22:00
  return '';
}

function extractErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
  }
  if (err instanceof Error) return err.message;
  return 'Đã có lỗi xảy ra!';
}

function speakReservationAlert(customerName: string, partySize: number, note?: string | null) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();

    let tableSpeech = '';
    if (note && note.includes('Khách chọn:')) {
      const match = note.match(/Khách chọn:\s*(Bàn\s*[A-Za-z0-9_-]+)/i);
      if (match) {
        let rawTable = match[1].trim();
        rawTable = rawTable.replace(/T-0?/i, 'Tê ');
        tableSpeech = `. Tại ${rawTable}`;
      }
    }

    const textToRead = `Thông báo! Có đơn đặt bàn mới. Khách hàng: ${customerName}. Số lượng: ${partySize} người${tableSpeech}.`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.88;
    utterance.pitch = 1.02;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const viVoices = voices.filter(
      (v) =>
        v.lang.toLowerCase().replace('_', '-').startsWith('vi') ||
        v.name.toLowerCase().includes('vietnam') ||
        v.name.toLowerCase().includes('tiếng việt')
    );

    if (viVoices.length > 0) {
      const bestVoice =
        viVoices.find((v) => v.name.includes('Natural') || v.name.includes('Neural')) ||
        viVoices.find((v) => v.name.toLowerCase().includes('hoaimy')) ||
        viVoices.find((v) => v.name.toLowerCase().includes('google')) ||
        viVoices[0];

      utterance.voice = bestVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Speech synthesis error:', e);
  }
}

export default function ReservationManagement(): React.ReactElement {
  const [activeMode, setActiveMode] = useState<'map' | 'list'>('map');

  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [selectedShift, setSelectedShift] = useState<string>('ALL');
  const [mapTableFilter, setMapTableFilter] = useState<'all' | 'available' | 'occupied' | 'reserved'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(false);
  const [toastAlert, setToastAlert] = useState<ReservationItem | null>(null);

  const [assignModal, setAssignModal] = useState<AssignModalState>({
    is_open: false,
    reservation: null,
    selected_table_ids: [],
  });

  const [offlineModal, setOfflineModal] = useState<boolean>(false);
  const [offlineForm, setOfflineForm] = useState<OfflineFormState>({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    party_size: 15,
    reservation_date: new Date().toISOString().split('T')[0],
    reservation_time: '19:00',
    table_ids: [],
    special_notes: '',
    seated_immediately: false,
  });

  const notifyClientTabs = useCallback(() => {
    try {
      const channel = new BroadcastChannel('omni_reservation_channel');
      channel.postMessage({ type: 'TABLE_STATUS_UPDATED' });
      channel.close();
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [resData, tablesData] = await Promise.all([
        reservationApi.getAll(filterStatus),
        reservationApi.getTables(),
      ]);
      setReservations(resData.data || []);
      setTables(tablesData.data || []);
    } catch (err: unknown) {
      console.error('Lỗi nạp dữ liệu:', extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  const handleIncomingNewReservation = useCallback((incoming: ReservationItem) => {
    setReservations((prev) => {
      if (prev.some((r) => r.id === incoming.id)) {
        return prev;
      }
      return [incoming, ...prev];
    });

    reservationApi.getTables().then((t) => setTables(t.data || []));

    speakReservationAlert(incoming.customer_name, incoming.party_size, incoming.special_notes);

    setToastAlert(incoming);
    setTimeout(() => {
      setToastAlert((curr) => (curr?.id === incoming.id ? null : curr));
    }, 8000);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    const initTimer = setTimeout(() => {
      loadData();
    }, 0);

    let broadcastChannel: BroadcastChannel | null = null;
    try {
      broadcastChannel = new BroadcastChannel('omni_reservation_channel');
      broadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'NEW_RESERVATION' && event.data?.data) {
          handleIncomingNewReservation(event.data.data);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }

    const eventSource = new EventSource('http://localhost:8080/api/tables/reservations/subscribe');

    eventSource.onopen = () => setIsRealtimeActive(true);
    eventSource.addEventListener('INIT', () => setIsRealtimeActive(true));

    eventSource.addEventListener('NEW_RESERVATION', (event: MessageEvent) => {
      try {
        const incoming: ReservationItem = JSON.parse(event.data);
        handleIncomingNewReservation(incoming);
      } catch (e) {
        console.error('Lỗi parse SSE:', e);
      }
    });

    eventSource.addEventListener('UPDATE_RESERVATION', (event: MessageEvent) => {
      try {
        const updated: ReservationItem = JSON.parse(event.data);
        setReservations((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        reservationApi.getTables().then((t) => setTables(t.data || []));
      } catch (e) {
        console.error('Lỗi parse SSE update:', e);
      }
    });

    eventSource.onerror = () => setIsRealtimeActive(false);

    return () => {
      clearTimeout(initTimer);
      eventSource.close();
      if (broadcastChannel) broadcastChannel.close();
    };
  }, [loadData, handleIncomingNewReservation]);

  const handleTableClick = (table: TableItem) => {
    const isAvail = table.status?.toLowerCase() === 'available';
    if (isAvail) {
      setOfflineForm((prev) => ({
        ...prev,
        table_ids: [table.id],
        party_size: table.capacity,
        seated_immediately: false,
      }));
      setOfflineModal(true);
    }
  };

  const toggleAssignTableId = (tblId: string) => {
    setAssignModal((prev) => ({
      ...prev,
      selected_table_ids: prev.selected_table_ids.includes(tblId)
        ? prev.selected_table_ids.filter((id) => id !== tblId)
        : [...prev.selected_table_ids, tblId],
    }));
  };

  const toggleOfflineTableId = (tblId: string) => {
    setOfflineForm((prev) => ({
      ...prev,
      table_ids: prev.table_ids.includes(tblId)
        ? prev.table_ids.filter((id) => id !== tblId)
        : [...prev.table_ids, tblId],
    }));
  };

  const handleAssignTable = async () => {
    if (!assignModal.reservation || assignModal.selected_table_ids.length === 0) {
      alert('Vui lòng chọn ít nhất một bàn để ghép/gán!');
      return;
    }
    try {
      await reservationApi.assignTable(assignModal.reservation.id, assignModal.selected_table_ids);
      alert(`Đã xếp thành công ${assignModal.selected_table_ids.length} bàn cho khách!`);
      notifyClientTabs();
      setAssignModal({ is_open: false, reservation: null, selected_table_ids: [] });
      setLoading(true);
      loadData();
    } catch (err: unknown) {
      alert(extractErrorMessage(err));
    }
  };

  const handleCheckIn = async (id: string) => {
    if (!window.confirm('Xác nhận khách đã vào nhận bàn?')) return;
    try {
      await reservationApi.checkIn(id);
      alert('Khách đã vào bàn thành công!');
      notifyClientTabs();
      setLoading(true);
      loadData();
    } catch (err: unknown) {
      alert(extractErrorMessage(err));
    }
  };

  const handleCancel = async (id: string) => {
    const reason = window.prompt('Nhập lý do hủy đặt bàn:');
    if (reason === null) return;
    try {
      await reservationApi.cancel(id, reason);
      alert('Hủy đơn thành công!');
      notifyClientTabs();
      setLoading(true);
      loadData();
    } catch (err: unknown) {
      alert(extractErrorMessage(err));
    }
  };

  const handleCreateOffline = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...offlineForm,
        party_size: Number(offlineForm.party_size),
        reservation_time: `${offlineForm.reservation_date}T${offlineForm.reservation_time}:00`,
      };
      await reservationApi.createOffline(payload);
      alert('Tạo đơn đặt bàn hotline / offline thành công!');
      notifyClientTabs();
      setOfflineModal(false);
      setLoading(true);
      loadData();
    } catch (err: unknown) {
      alert(extractErrorMessage(err));
    }
  };

  // Metrics
  const totalTables = tables.length;
  const availTables = tables.filter((t) => t.status?.toLowerCase() === 'available').length;
  const occupiedTables = tables.filter((t) => t.status?.toLowerCase() === 'occupied').length;
  const pendingReservations = reservations.filter((r) => r.status === 'pending').length;
  const confirmedReservations = reservations.filter((r) => r.status === 'confirmed').length;
  const seatedReservations = reservations.filter((r) => r.status === 'seated').length;
  const cancelledReservations = reservations.filter((r) => r.status === 'cancelled').length;

  const occupancyRate = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

  // Filtered reservations for List Mode
  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      const matchesSearch =
        r.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.customer_phone.includes(searchTerm) ||
        r.reservation_code.toLowerCase().includes(searchTerm.toLowerCase());

      const itemShift = r.shift || getShiftFromReservationTime(r.reservation_time);
      const matchesShift = selectedShift === 'ALL' || itemShift === selectedShift;

      return matchesSearch && matchesShift;
    });
  }, [reservations, searchTerm, selectedShift]);

  // Filtered tables for Map Mode
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const isAvailable = t.status?.toLowerCase() === 'available';
      const isOccupied = t.status?.toLowerCase() === 'occupied';
      const isReserved = !isAvailable && !isOccupied;

      if (mapTableFilter === 'available') return isAvailable;
      if (mapTableFilter === 'occupied') return isOccupied;
      if (mapTableFilter === 'reserved') return isReserved;
      return true;
    });
  }, [tables, mapTableFilter]);

  const totalItems = filteredReservations.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedReservations = useMemo(() => {
    return filteredReservations.slice(startIndex, endIndex);
  }, [filteredReservations, startIndex, endIndex]);

  const assignTotalCapacity = tables
    .filter((t) => assignModal.selected_table_ids.includes(t.id))
    .reduce((sum, t) => sum + (t.capacity || 0), 0);

  const offlineTotalCapacity = tables
    .filter((t) => offlineForm.table_ids.includes(t.id))
    .reduce((sum, t) => sum + (t.capacity || 0), 0);

  return (
    <div className="adm-res-container">
      {/* ── REALTIME TOAST NOTIFICATION ── */}
      {toastAlert && (
        <div className="adm-toast-card">
          <div className="adm-toast-icon-wrap">
            <Volume2 size={20} color="#ffffff" />
          </div>

          <div className="adm-toast-body">
            <div className="adm-toast-badge">
              ĐƠN ĐẶT BÀN MỚI • {toastAlert.reservation_code}
            </div>
            <div className="adm-toast-name">
              {toastAlert.customer_name} ({toastAlert.party_size} khách)
            </div>
            <div className="adm-toast-time">
              Giờ hẹn: {new Date(toastAlert.reservation_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(toastAlert.reservation_time).toLocaleDateString('vi-VN')}
            </div>
            {toastAlert.special_notes && (
              <div className="adm-toast-note">
                {toastAlert.special_notes}
              </div>
            )}
          </div>

          <button
            type="button"
            className="adm-toast-close-btn"
            onClick={() => setToastAlert(null)}
            title="Đóng thông báo"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── TOP HEADER ── */}
      <div className="adm-res-header">
        <div>
          <div className="adm-header-badge-row">
            <span className="adm-badge-category">
              <CalendarCheck2 size={13} /> VẬN HÀNH NHÀ HÀNG & BÀN ĂN
            </span>
            <span className={isRealtimeActive ? "adm-live-badge active" : "adm-live-badge standby"}>
              <span className="live-pulsing-dot" />
              {isRealtimeActive ? "Realtime Live Sync" : "Connecting..."}
            </span>
          </div>

          <h1 className="adm-res-title">Quản Lý Đặt Bàn & Ghép Bàn Chuỗi</h1>
          <p className="adm-res-subtitle">
            Tiếp nhận đoàn đông hotline, chủ động ghép bàn thông minh và đồng bộ sơ đồ phòng ăn thời gian thực
          </p>
        </div>

        <div className="adm-res-actions">
          {/* Segmented View Mode Toggle */}
          <div className="adm-view-toggle">
            <button
              type="button"
              onClick={() => setActiveMode('map')}
              className={`toggle-btn ${activeMode === 'map' ? 'active' : ''}`}
            >
              <LayoutGrid size={16} />
              <span>Sơ Đồ Bàn</span>
              <span className="toggle-counter">{tables.length}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('list')}
              className={`toggle-btn ${activeMode === 'list' ? 'active' : ''}`}
            >
              <ListFilter size={16} />
              <span>Danh Sách Đơn</span>
              <span className="toggle-counter">{reservations.length}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              loadData();
            }}
            className="adm-refresh-btn"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={17} className={loading ? 'spinning' : ''} />
          </button>

          <button
            type="button"
            onClick={() => {
              setOfflineForm({
                customer_name: '',
                customer_phone: '',
                customer_email: '',
                party_size: 15,
                reservation_date: new Date().toISOString().split('T')[0],
                reservation_time: '19:00',
                table_ids: [],
                special_notes: '',
                seated_immediately: false,
              });
              setOfflineModal(true);
            }}
            className="adm-btn-create"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Nhận Đơn Hotline (Ghép Bàn)</span>
          </button>
        </div>
      </div>

      {/* ── THỐNG KÊ NHANH (QUICK METRICS) ── */}
      <div className="adm-stats-grid">
        <div className="adm-stat-card card-total">
          <div className="stat-card-header">
            <span className="stat-label">Tổng Quy Mô Bàn</span>
            <div className="stat-icon-wrap icon-blue">
              <Armchair size={20} />
            </div>
          </div>
          <div className="stat-value">{totalTables}</div>
          <div className="stat-meta">
            <span>Toàn bộ chi nhánh</span>
            <span className="stat-sub-tag">100% công suất</span>
          </div>
        </div>

        <div className="adm-stat-card card-avail">
          <div className="stat-card-header">
            <span className="stat-label">Bàn Trống Sẵn Sàng</span>
            <div className="stat-icon-wrap icon-emerald">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="stat-value">{availTables}</div>
          <div className="stat-meta">
            <span>Có thể nhận khách mới</span>
            <span className="stat-sub-tag tag-success">Trống</span>
          </div>
        </div>

        <div className="adm-stat-card card-occupied">
          <div className="stat-card-header">
            <span className="stat-label">Bàn Đang Có Khách</span>
            <div className="stat-icon-wrap icon-rose">
              <Users size={20} />
            </div>
          </div>
          <div className="stat-value">{occupiedTables}</div>
          <div className="stat-meta">
            <span>Đang dùng bữa tại bàn</span>
            <span className="stat-sub-tag tag-occupied">{occupancyRate}% phòng</span>
          </div>
        </div>

        <div className="adm-stat-card card-pending">
          <div className="stat-card-header">
            <span className="stat-label">Đơn Chờ Xếp Bàn</span>
            <div className="stat-icon-wrap icon-amber">
              <Clock size={20} />
            </div>
          </div>
          <div className="stat-value">{pendingReservations}</div>
          <div className="stat-meta">
            <span>Khách đặt cần ghép bàn</span>
            {pendingReservations > 0 ? (
              <span className="stat-sub-tag tag-alert">Cần xử lý</span>
            ) : (
              <span className="stat-sub-tag tag-clean">Đã xếp đủ</span>
            )}
          </div>
        </div>
      </div>

      {/* ── SƠ ĐỒ BÀN ĂN (MAP MODE) ── */}
      {activeMode === 'map' && (
        <div className="adm-card-wrapper">
          <div className="map-toolbar">
            <div className="map-title-block">
              <h3 className="section-heading">Sơ Đồ Bàn Ăn Trực Quan</h3>
              <p className="section-desc">Nhấp trực tiếp vào bàn trống để tiếp nhận khách hoặc kiểm tra thông tin đặt bàn</p>
            </div>

            <div className="map-controls">
              {/* Filter chips for Map View */}
              <div className="map-filter-group">
                <button
                  type="button"
                  onClick={() => setMapTableFilter('all')}
                  className={`map-filter-chip ${mapTableFilter === 'all' ? 'active' : ''}`}
                >
                  Tất cả ({tables.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMapTableFilter('available')}
                  className={`map-filter-chip chip-green ${mapTableFilter === 'available' ? 'active' : ''}`}
                >
                  Trống ({availTables})
                </button>
                <button
                  type="button"
                  onClick={() => setMapTableFilter('occupied')}
                  className={`map-filter-chip chip-red ${mapTableFilter === 'occupied' ? 'active' : ''}`}
                >
                  Đang ăn ({occupiedTables})
                </button>
                <button
                  type="button"
                  onClick={() => setMapTableFilter('reserved')}
                  className={`map-filter-chip chip-yellow ${mapTableFilter === 'reserved' ? 'active' : ''}`}
                >
                  Đã đặt ({tables.length - availTables - occupiedTables})
                </button>
              </div>

              <div className="map-legends">
                <span className="map-legend-item"><span className="legend-dot dot-green" /> Sẵn sàng</span>
                <span className="map-legend-item"><span className="legend-dot dot-yellow" /> Đã đặt</span>
                <span className="map-legend-item"><span className="legend-dot dot-red" /> Đang ăn</span>
                <span className="map-legend-item"><span className="legend-badge-sample">Bàn Ghép</span> Cụm</span>
              </div>
            </div>
          </div>

          <div className="adm-table-grid">
            {filteredTables.map((t) => {
              const isAvailable = t.status?.toLowerCase() === 'available';
              const isOccupied = t.status?.toLowerCase() === 'occupied';

              const reservedOrder = reservations.find((r) => {
                if (r.status !== 'confirmed' && r.status !== 'seated') return false;
                if (r.table_id === t.id) return true;
                if (r.special_notes && r.special_notes.includes(t.id)) return true;
                return false;
              });

              const isMerged = reservedOrder && reservedOrder.table_no && reservedOrder.table_no.includes('+');

              return (
                <div
                  key={t.id}
                  onClick={() => handleTableClick(t)}
                  className={`adm-floor-table ${
                    isAvailable ? 'table-state--free' : isOccupied ? 'table-state--busy' : 'table-state--reserved'
                  }`}
                >
                  {isMerged && (
                    <div className="tag-merged-badge">
                      <Layers size={11} /> Cụm Ghép Bàn
                    </div>
                  )}

                  <div className="floor-table-top">
                    <div className="floor-table-identity">
                      <span className="floor-table-no">Bàn {t.table_no}</span>
                    </div>
                    <span className="floor-table-cap">
                      <Users size={12} /> {t.capacity} chỗ
                    </span>
                  </div>

                  <div className="floor-table-center">
                    <div className="armchair-visual">
                      <Armchair size={36} />
                    </div>
                  </div>

                  <div className="floor-table-status">
                    {isAvailable && (
                      <span className="tag-status tag-avail">
                        <CheckCircle2 size={12} /> Sẵn Sàng
                      </span>
                    )}
                    {isOccupied && (
                      <span className="tag-status tag-busy">
                        <Utensils size={12} /> Đang Phục Vụ
                      </span>
                    )}
                    {!isAvailable && !isOccupied && (
                      <span className="tag-status tag-res">
                        <Clock size={12} /> Đã Giữ Chỗ
                      </span>
                    )}
                  </div>

                  {reservedOrder && (
                    <div className="floor-guest-info">
                      <div className="guest-name">
                        <User size={13} />
                        <span>{reservedOrder.customer_name}</span>
                      </div>
                      <div className="guest-time">
                        <Clock size={12} />
                        <span>
                          {new Date(reservedOrder.reservation_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="guest-party-pill">{reservedOrder.party_size} khách</span>
                      </div>

                      {reservedOrder.status === 'confirmed' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCheckIn(reservedOrder.id);
                          }}
                          className="btn-quick-checkin"
                        >
                          <Check size={13} strokeWidth={2.5} /> Nhận Bàn Vào Ăn
                        </button>
                      )}
                    </div>
                  )}

                  {isAvailable && (
                    <div className="click-to-book-hint">
                      <Plus size={13} /> Nhấp để nhận / gán bàn
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DANH SÁCH ĐƠN ĐẶT BÀN (LIST MODE) ── */}
      {activeMode === 'list' && (
        <div className="adm-card-wrapper">
          {/* LỌC CA VẬN HÀNH (Operating Shifts) */}
          <div className="shift-filter-toolbar">
            <span className="shift-filter-label">
              <Clock size={15} color="#059669" /> Lọc Ca Vận Hành:
            </span>
            <div className="shift-chips-scroll">
              {OPERATING_SHIFTS.map((shift) => {
                const isActive = selectedShift === shift.id;
                const IconComponent = shift.icon;
                const count = reservations.filter((r) => {
                  const s = r.shift || getShiftFromReservationTime(r.reservation_time);
                  return shift.id === 'ALL' || s === shift.id;
                }).length;

                return (
                  <button
                    key={shift.id}
                    type="button"
                    onClick={() => {
                      setSelectedShift(shift.id);
                      setCurrentPage(1);
                    }}
                    className={`shift-chip-btn ${isActive ? 'active' : ''}`}
                  >
                    <IconComponent size={14} />
                    <span>{shift.label}</span>
                    <span className="shift-chip-time">{shift.time_range}</span>
                    <span className="shift-chip-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STATUS TABS & SEARCH */}
          <div className="list-toolbar">
            <div className="status-tab-group">
              {[
                { label: 'Tất cả', value: '', count: reservations.length },
                { label: 'Chờ xếp bàn', value: 'pending', count: pendingReservations },
                { label: 'Đã xếp bàn', value: 'confirmed', count: confirmedReservations },
                { label: 'Đang dùng bữa', value: 'seated', count: seatedReservations },
                { label: 'Đã hủy', value: 'cancelled', count: cancelledReservations },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setFilterStatus(tab.value);
                    setCurrentPage(1);
                  }}
                  className={`status-tab-btn ${filterStatus === tab.value ? 'active' : ''}`}
                >
                  <span>{tab.label}</span>
                  <span className="tab-pill-count">{tab.count}</span>
                </button>
              ))}
            </div>

            <div className="search-field-box">
              <Search size={16} className="search-icon-inside" />
              <input
                type="text"
                placeholder="Tìm tên khách, số điện thoại, mã phiếu..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="search-input-field"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setCurrentPage(1);
                  }}
                  className="search-clear-btn"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* DATA TABLE */}
          <div className="table-responsive">
            <table className="adm-data-table">
              <thead>
                <tr>
                  <th>Mã Phiếu</th>
                  <th>Khách Hàng</th>
                  <th>Thời Gian & Ca</th>
                  <th className="text-center">Số Khách</th>
                  <th>Bàn Phục Vụ</th>
                  <th>Trạng Thái</th>
                  <th className="text-right">Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {paginatedReservations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-table-cell">
                      <div className="empty-state-box">
                        <AlertCircle size={36} color="#94a3b8" />
                        <div className="empty-title">Không tìm thấy đơn đặt bàn nào</div>
                        <div className="empty-desc">Thử thay đổi bộ lọc trạng thái, ca làm việc hoặc từ khóa tìm kiếm</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedReservations.map((r) => {
                    const isMulti = r.table_no && r.table_no.includes('+');
                    const shiftKey = (r.shift || getShiftFromReservationTime(r.reservation_time)).toLowerCase();
                    const shiftConfig = OPERATING_SHIFTS.find((s) => s.id.toLowerCase() === shiftKey);

                    return (
                      <tr key={r.id}>
                        <td>
                          <span className="code-badge">{r.reservation_code}</span>
                        </td>
                        <td>
                          <div className="customer-cell-wrap">
                            <div className="customer-avatar">
                              {r.customer_name ? r.customer_name.charAt(0).toUpperCase() : 'K'}
                            </div>
                            <div className="customer-details">
                              <div className="customer-name">{r.customer_name}</div>
                              <div className="customer-phone">
                                <Phone size={12} /> {r.customer_phone}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="datetime-cell">
                            <div className="date-row">
                              <Calendar size={13} />
                              <span>{new Date(r.reservation_time).toLocaleDateString('vi-VN')}</span>
                            </div>
                            <div className="time-row">
                              <Clock size={13} />
                              <span>
                                {new Date(r.reservation_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {shiftConfig && shiftConfig.id !== 'ALL' && (
                              <span className={`badge-shift badge-shift-${shiftKey}`}>
                                {shiftConfig.label}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-center">
                          <div className="party-size-pill">
                            <Users size={13} />
                            <span>{r.party_size}</span>
                            {r.party_size >= 10 && (
                              <span className="large-party-tag" title="Đoàn đông ghép bàn">
                                Đoàn đông
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          {r.table_no ? (
                            <span className={isMulti ? "badge-assigned-table is-merged" : "badge-assigned-table"}>
                              <Armchair size={13} />
                              <span>{isMulti ? `Ghép: ${r.table_no}` : `Bàn ${r.table_no}`}</span>
                            </span>
                          ) : (
                            <span className="badge-unassigned">
                              <AlertCircle size={12} /> Chưa gán bàn
                            </span>
                          )}
                        </td>
                        <td>
                          {r.status === 'pending' && (
                            <span className="status-chip chip-pending">
                              <span className="status-dot" /> Chờ xếp bàn
                            </span>
                          )}
                          {r.status === 'confirmed' && (
                            <span className="status-chip chip-confirmed">
                              <span className="status-dot" /> Đã xếp bàn
                            </span>
                          )}
                          {r.status === 'seated' && (
                            <span className="status-chip chip-seated">
                              <span className="status-dot" /> Đang dùng bữa
                            </span>
                          )}
                          {r.status === 'cancelled' && (
                            <span className="status-chip chip-cancelled">
                              <span className="status-dot" /> Đã hủy
                            </span>
                          )}
                        </td>
                        <td className="text-right">
                          <div className="action-buttons-group">
                            {r.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => setAssignModal({
                                  is_open: true,
                                  reservation: r,
                                  selected_table_ids: r.table_id ? [r.table_id] : []
                                })}
                                className="btn-sm btn-assign"
                                title="Xếp hoặc ghép nhiều bàn"
                              >
                                <Layers size={14} /> Xếp / Ghép Bàn
                              </button>
                            )}
                            {r.status === 'confirmed' && (
                              <button
                                type="button"
                                onClick={() => handleCheckIn(r.id)}
                                className="btn-sm btn-checkin"
                                title="Nhận khách vào bàn"
                              >
                                <Check size={14} /> Nhận Bàn
                              </button>
                            )}
                            {r.status !== 'cancelled' && r.status !== 'seated' && (
                              <button
                                type="button"
                                onClick={() => handleCancel(r.id)}
                                className="btn-sm btn-cancel"
                                title="Hủy phiếu đặt bàn"
                              >
                                <X size={14} /> Hủy
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── FOOTER PHÂN TRANG ── */}
          {totalItems > 0 && (
            <div className="adm-pagination-bar">
              <div className="pagination-stats-info">
                Hiển thị <strong>{startIndex + 1} - {endIndex}</strong> trên tổng số <strong>{totalItems}</strong> đơn đặt bàn
              </div>

              <div className="pagination-nav-group">
                <div className="pagination-size-box">
                  <span>Hiển thị:</span>
                  <select
                    className="pagination-size-select"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={5}>5 đơn / trang</option>
                    <option value={10}>10 đơn / trang</option>
                    <option value={15}>15 đơn / trang</option>
                    <option value={20}>20 đơn / trang</option>
                  </select>
                </div>

                <div className="pagination-btn-cluster">
                  <button
                    type="button"
                    className="page-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    title="Trang đầu"
                  >
                    <ChevronsLeft size={16} />
                  </button>
                  <button
                    type="button"
                    className="page-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    title="Trang trước"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages)
                    .map((page, idx, arr) => {
                      const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && <span className="pagination-ellipsis">...</span>}
                          <button
                            type="button"
                            className={`page-btn ${currentPage === page ? 'active' : ''}`}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    type="button"
                    className="page-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    title="Trang sau"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    type="button"
                    className="page-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    title="Trang cuối"
                  >
                    <ChevronsRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL 1: XẾP / GHÉP NHIỀU BÀN CHO ĐƠN PENDING ── */}
      {assignModal.is_open && assignModal.reservation && (
        <div className="adm-modal-backdrop" onClick={() => setAssignModal({ is_open: false, reservation: null, selected_table_ids: [] })}>
          <div className="adm-modal-box modal-width-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top-bar">
              <div>
                <h3 className="modal-headline">
                  Xếp & Ghép Bàn Cho Phiếu #{assignModal.reservation.reservation_code}
                </h3>
                <p className="modal-subtext">
                  Khách hàng: <strong>{assignModal.reservation.customer_name}</strong> • Quy mô: <strong>{assignModal.reservation.party_size} khách</strong>
                </p>
              </div>
              <button
                type="button"
                className="modal-close-icon"
                onClick={() => setAssignModal({ is_open: false, reservation: null, selected_table_ids: [] })}
              >
                <X size={20} />
              </button>
            </div>

            {/* Dynamic Capacity Gauge Bar with Progress */}
            <div className={`capacity-summary-card ${assignTotalCapacity >= assignModal.reservation.party_size ? 'is-sufficient' : 'is-insufficient'}`}>
              <div className="gauge-text-row">
                <div className="gauge-info">
                  <Users size={18} />
                  <span>
                    Đã chọn: <strong>{assignModal.selected_table_ids.length} bàn</strong> • Tổng sức chứa: <strong>{assignTotalCapacity} ghế</strong> / {assignModal.reservation.party_size} khách
                  </span>
                </div>
                <span className="capacity-badge">
                  {assignTotalCapacity >= assignModal.reservation.party_size
                    ? '✓ Đủ Sức Chứa'
                    : `(! Thiếu ${assignModal.reservation.party_size - assignTotalCapacity} chỗ)`}
                </span>
              </div>
              <div className="gauge-progress-track">
                <div
                  className="gauge-progress-fill"
                  style={{
                    width: `${Math.min(100, Math.round((assignTotalCapacity / assignModal.reservation.party_size) * 100))}%`
                  }}
                />
              </div>
            </div>

            <div className="modal-field-block">
              <label className="picker-title-label">
                Chọn một hoặc nhiều bàn trống để gán / ghép cụm bàn:
              </label>
              <div className="modal-table-picker-grid">
                {tables
                  .filter((t) => t.status?.toLowerCase() === 'available' || assignModal.selected_table_ids.includes(t.id))
                  .map((t) => {
                    const isSelected = assignModal.selected_table_ids.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => toggleAssignTableId(t.id)}
                        className={`picker-table-chip ${isSelected ? 'selected' : ''}`}
                      >
                        <div className="chip-check-mark">
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                        <div className="chip-table-no">Bàn {t.table_no}</div>
                        <div className="chip-table-cap">
                          <Users size={12} /> {t.capacity} chỗ ngồi
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="modal-footer-btns">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setAssignModal({ is_open: false, reservation: null, selected_table_ids: [] })}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-primary-action"
                onClick={handleAssignTable}
              >
                <Check size={16} />
                <span>
                  Xác Nhận {assignModal.selected_table_ids.length > 1 ? `Ghép ${assignModal.selected_table_ids.length} Bàn` : 'Xếp Bàn'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: TIẾP NHẬN ĐẶT BÀN HOTLINE / ĐOÀN ĐÔNG GHÉP BÀN ── */}
      {offlineModal && (
        <div className="adm-modal-backdrop" onClick={() => setOfflineModal(false)}>
          <div className="adm-modal-box modal-width-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top-bar">
              <div>
                <h3 className="modal-headline">Tiếp Nhận Đặt Bàn Hotline / Đoàn Đông</h3>
                <p className="modal-subtext">
                  Nhập thông tin đoàn khách qua điện thoại và chọn cụm bàn ghép tương ứng
                </p>
              </div>
              <button
                type="button"
                className="modal-close-icon"
                onClick={() => setOfflineModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateOffline} className="modal-styled-form">
              <div className="modal-field-block">
                <label>Tên khách hàng / Cơ quan, đoàn thể *</label>
                <div className="input-with-icon">
                  <User size={16} className="input-field-icon" />
                  <input
                    type="text"
                    required
                    placeholder="VD: Anh Tuấn (Công ty FPT)"
                    className="modal-input-control with-icon"
                    value={offlineForm.customer_name}
                    onChange={(e) => setOfflineForm({ ...offlineForm, customer_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-2col">
                <div className="modal-field-block">
                  <label>Số điện thoại liên hệ *</label>
                  <div className="input-with-icon">
                    <Phone size={16} className="input-field-icon" />
                    <input
                      type="tel"
                      required
                      placeholder="VD: 0912345678"
                      className="modal-input-control with-icon"
                      value={offlineForm.customer_phone}
                      onChange={(e) => setOfflineForm({ ...offlineForm, customer_phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-field-block">
                  <label>Số lượng khách (người) *</label>
                  <div className="input-with-icon">
                    <Users size={16} className="input-field-icon" />
                    <input
                      type="number"
                      min="1"
                      required
                      className="modal-input-control with-icon"
                      value={offlineForm.party_size}
                      onChange={(e) => setOfflineForm({ ...offlineForm, party_size: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid-2col">
                <div className="modal-field-block">
                  <label>Ngày dùng bữa *</label>
                  <div className="input-with-icon">
                    <Calendar size={16} className="input-field-icon" />
                    <input
                      type="date"
                      required
                      className="modal-input-control with-icon"
                      value={offlineForm.reservation_date}
                      onChange={(e) => setOfflineForm({ ...offlineForm, reservation_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-field-block">
                  <label>Giờ đến dự kiến *</label>
                  <div className="input-with-icon">
                    <Clock size={16} className="input-field-icon" />
                    <input
                      type="time"
                      required
                      className="modal-input-control with-icon"
                      value={offlineForm.reservation_time}
                      onChange={(e) => setOfflineForm({ ...offlineForm, reservation_time: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-field-block">
                <div className="picker-header-row">
                  <label>Chọn các bàn cần ghép ({offlineForm.table_ids.length} bàn đã chọn):</label>
                  <span className={`capacity-indicator ${offlineTotalCapacity >= offlineForm.party_size ? 'text-success' : 'text-danger'}`}>
                    Sức chứa: {offlineTotalCapacity}/{offlineForm.party_size} ghế
                  </span>
                </div>

                <div className="modal-table-picker-grid">
                  {tables
                    .filter((t) => t.status?.toLowerCase() === 'available' || offlineForm.table_ids.includes(t.id))
                    .map((t) => {
                      const isSelected = offlineForm.table_ids.includes(t.id);
                      return (
                        <div
                          key={t.id}
                          onClick={() => toggleOfflineTableId(t.id)}
                          className={`picker-table-chip ${isSelected ? 'selected' : ''}`}
                        >
                          <div className="chip-check-mark">
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                          <div className="chip-table-no">Bàn {t.table_no}</div>
                          <div className="chip-table-cap">
                            <Users size={12} /> {t.capacity} chỗ
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="modal-checkbox-row">
                <input
                  type="checkbox"
                  id="seatedImmediatelyCheck"
                  className="checkbox-custom"
                  checked={offlineForm.seated_immediately}
                  onChange={(e) => setOfflineForm({ ...offlineForm, seated_immediately: e.target.checked })}
                />
                <label htmlFor="seatedImmediatelyCheck">
                  Khách đang có mặt tại quán (Xếp vào ngồi ăn luôn - Trạng thái SEATED)
                </label>
              </div>

              <div className="modal-field-block">
                <label>Ghi chú đặc biệt (yêu cầu bàn, hoa, trang trí):</label>
                <div className="input-with-icon">
                  <Tag size={16} className="input-field-icon" />
                  <input
                    type="text"
                    placeholder="VD: Kê bàn chữ U, chuẩn bị hoa sinh nhật, góc view kính..."
                    className="modal-input-control with-icon"
                    value={offlineForm.special_notes}
                    onChange={(e) => setOfflineForm({ ...offlineForm, special_notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer-btns">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setOfflineModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-primary-action">
                  <Check size={16} /> Lưu Đơn & Khóa Bàn Ghép
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export { ReservationManagement };
