import React, { useEffect, useState } from 'react';
import {
  Calendar, Search, Users, Phone, Clock, Trash2,
  RefreshCw, Wifi, WifiOff, Mail,
} from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import { useReservationStore } from '../../store/reservationStore';
import type { Reservation, ReservationStatus } from '../../../shared/types/reservation';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<ReservationStatus, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Chờ xác nhận', color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
  confirmed: { label: 'Đã xác nhận',  color: '#2563eb', bg: 'rgba(37,99,235,0.1)'  },
  seated:    { label: 'Đã vào bàn',   color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
  completed: { label: 'Hoàn thành',   color: '#16a34a', bg: 'rgba(22,163,74,0.1)'  },
  cancelled: { label: 'Đã hủy',       color: '#dc2626', bg: 'rgba(220,38,38,0.1)'  },
  no_show:   { label: 'Không đến',    color: '#6b7280', bg: 'rgba(107,114,128,0.1)'},
};

const STATUS_TABS: { id: string; label: string }[] = [
  { id: 'ALL',       label: 'Tất cả' },
  { id: 'pending',   label: 'Chờ duyệt' },
  { id: 'confirmed', label: 'Đã xác nhận' },
  { id: 'seated',    label: 'Đang ngồi' },
  { id: 'completed', label: 'Hoàn thành' },
  { id: 'cancelled', label: 'Đã hủy' },
];

const NEXT_ACTIONS: Record<ReservationStatus, { status: ReservationStatus; label: string; color: string }[]> = {
  pending:   [{ status: 'confirmed', label: '✅ Xác nhận', color: '#2563eb' }, { status: 'cancelled', label: '❌ Hủy', color: '#dc2626' }],
  confirmed: [{ status: 'seated',    label: '🪑 Vào bàn', color: '#7c3aed' }, { status: 'cancelled', label: '❌ Hủy', color: '#dc2626' }],
  seated:    [{ status: 'completed', label: '✅ Hoàn thành', color: '#16a34a' }, { status: 'no_show', label: '⚠️ Không đến', color: '#6b7280' }],
  completed: [],
  cancelled: [],
  no_show:   [],
};

export const ReservationManagement: React.FC = () => {
  const { selectedBranchId } = useAdminStore();
  const {
    reservations, loading, isApiMode,
    initialize, updateReservationStatus, assignTable, deleteReservation,
  } = useReservationStore();

  const today = new Date().toISOString().split('T')[0];

  const [searchQuery, setSearchQuery]       = useState('');
  const [statusTab, setStatusTab]           = useState('ALL');
  const [dateFilter, setDateFilter]         = useState('');
  const [assigningTable, setAssigningTable] = useState<string | null>(null);
  const [tableInput, setTableInput]         = useState('');
  const [deletingId, setDeletingId]         = useState<string | null>(null);
  const [refreshing, setRefreshing]         = useState(false);

  // Init on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // ─── Derived data ──────────────────────────────────────────────────────────
  const filtered = reservations.filter((r) => {
    const matchBranch  = selectedBranchId === 'ALL' || r.branchId === selectedBranchId;
    const matchStatus  = statusTab === 'ALL' || r.status === statusTab;
    const matchDate    = !dateFilter || r.reservationDate === dateFilter;
    const matchSearch  = !searchQuery
      || r.customerName.toLowerCase().includes(searchQuery.toLowerCase())
      || r.customerPhone.includes(searchQuery)
      || r.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchBranch && matchStatus && matchDate && matchSearch;
  }).sort((a, b) => a.reservationDate.localeCompare(b.reservationDate) || a.reservationTime.localeCompare(b.reservationTime));

  const pendingCount = reservations.filter(r =>
    (selectedBranchId === 'ALL' || r.branchId === selectedBranchId) && r.status === 'pending'
  ).length;

  const todayCount = reservations.filter(r =>
    (selectedBranchId === 'ALL' || r.branchId === selectedBranchId) && r.reservationDate === today
  ).length;

  const confirmedCount = reservations.filter(r =>
    (selectedBranchId === 'ALL' || r.branchId === selectedBranchId) && r.status === 'confirmed' && r.reservationDate === today
  ).length;

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleAssignTable = async (id: string) => {
    if (!tableInput.trim()) return;
    await assignTable(id, tableInput.trim());
    setAssigningTable(null);
    setTableInput('');
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteReservation(id);
    setDeletingId(null);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await initialize();
    setRefreshing(false);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 4px' }}>
            Quản Lý Đặt Bàn
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Xác nhận, phân bàn và theo dõi lịch đặt bàn toàn chuỗi theo thời gian thực
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* API mode badge */}
          <span style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem', fontWeight: 700,
            background: isApiMode ? 'rgba(22,163,74,0.12)' : 'rgba(107,114,128,0.12)',
            color: isApiMode ? '#16a34a' : '#6b7280',
            border: `1px solid ${isApiMode ? 'rgba(22,163,74,0.3)' : 'rgba(107,114,128,0.2)'}`,
          }}>
            {isApiMode ? <Wifi size={13} /> : <WifiOff size={13} />}
            {isApiMode ? 'Live API' : 'Mock Data'}
          </span>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-muted)', fontSize: '0.8125rem', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <RefreshCw size={14} style={{ animation: (refreshing || loading) ? 'spin 1s linear infinite' : 'none' }} />
            Làm mới
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
        {[
          { label: 'Chờ xác nhận', value: pendingCount,    color: '#d97706', bg: 'rgba(217,119,6,0.1)',    icon: '⏳' },
          { label: 'Hôm nay',      value: todayCount,      color: '#2563eb', bg: 'rgba(37,99,235,0.1)',    icon: '📅' },
          { label: 'Đã xác nhận hôm nay', value: confirmedCount, color: '#16a34a', bg: 'rgba(22,163,74,0.1)', icon: '✅' },
          { label: 'Tổng lịch hệ thống', value: reservations.length, color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', icon: '📊' },
        ].map((kpi) => (
          <div key={kpi.label} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: '1.375rem' }}>{kpi.icon}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div className="search-bar" style={{ flex: '1 1 240px', minWidth: 200 }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              className="search-input"
              placeholder="Tìm tên, SĐT, mã đặt bàn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Date filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 14px' }}>
            <Calendar size={15} color="var(--text-muted)" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{ border: 'none', background: 'transparent', color: 'var(--text-main)', fontSize: '0.875rem', outline: 'none', fontFamily: 'var(--font-main)' }}
            />
            {dateFilter && (
              <button onClick={() => setDateFilter('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
            )}
          </div>
        </div>

        {/* Status tabs */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {STATUS_TABS.map((t) => {
            const count = t.id === 'ALL' ? reservations.length : reservations.filter(r => r.status === t.id).length;
            return (
              <button
                key={t.id}
                onClick={() => setStatusTab(t.id)}
                style={{
                  padding: '7px 14px', borderRadius: 'var(--radius-full)', fontSize: '0.8125rem',
                  fontWeight: 600, border: '1.5px solid', cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                  borderColor: statusTab === t.id ? 'var(--primary)' : 'var(--border)',
                  background: statusTab === t.id ? 'var(--primary)' : 'transparent',
                  color: statusTab === t.id ? '#fff' : 'var(--text-muted)',
                }}
              >
                {t.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 12, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</div>
          <div style={{ fontWeight: 600 }}>Đang tải dữ liệu...</div>
        </div>
      )}

      {/* Reservation list */}
      {!loading && filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📭</div>
          <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 4 }}>Không có đặt bàn nào</div>
          <div style={{ fontSize: '0.875rem' }}>Thử thay đổi bộ lọc hoặc chọn ngày khác</div>
        </div>
      ) : !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((rsv) => {
            const sc = STATUS_CONFIG[rsv.status];
            const actions = NEXT_ACTIONS[rsv.status];
            const isToday = rsv.reservationDate === today;
            const isDeleting = deletingId === rsv.id;

            return (
              <div key={rsv.id} className="card" style={{
                padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14,
                borderLeft: `4px solid ${sc.color}`,
                opacity: isDeleting ? 0.5 : 1,
                transition: 'opacity 0.2s',
              }}>
                {/* Row 1: Status + date badge + ID + delete */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.8rem',
                      fontWeight: 700, color: sc.color, background: sc.bg,
                    }}>
                      {sc.label}
                    </span>
                    {isToday && (
                      <span style={{
                        padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem',
                        fontWeight: 700, color: '#dc2626', background: 'rgba(220,38,38,0.1)',
                      }}>
                        🔴 HÔM NAY
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      #{rsv.id.toUpperCase()}
                    </span>
                    {/* Delete button */}
                    {(rsv.status === 'cancelled' || rsv.status === 'completed' || rsv.status === 'no_show') && (
                      <button
                        onClick={() => handleDelete(rsv.id)}
                        disabled={isDeleting}
                        title="Xóa đặt bàn"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 30, height: 30, borderRadius: 'var(--radius-sm)',
                          border: '1px solid rgba(220,38,38,0.3)',
                          background: 'rgba(220,38,38,0.06)', color: '#dc2626',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(220,38,38,0.15)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(220,38,38,0.06)')}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Row 2: Customer + time + branch */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 3 }}>Khách hàng</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-main)' }}>{rsv.customerName}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                      <Phone size={13} color="var(--text-muted)" />
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{rsv.customerPhone}</span>
                    </div>
                    {rsv.customerEmail && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                        <Mail size={13} color="var(--text-muted)" />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rsv.customerEmail}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 3 }}>Thời gian</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--text-main)' }}>
                      <Clock size={15} color="var(--primary)" />
                      {rsv.reservationTime} — {new Date(rsv.reservationDate + 'T00:00:00').toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                      <Users size={13} color="var(--text-muted)" />
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{rsv.partySize} người</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 3 }}>Chi nhánh</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>{rsv.branchName}</div>
                    <div style={{ fontSize: '0.8125rem', color: rsv.tableNo ? 'var(--primary)' : 'var(--text-muted)', marginTop: 4, fontWeight: rsv.tableNo ? 600 : 400 }}>
                      {rsv.tableNo ? `🪑 ${rsv.tableNo}` : 'Chưa phân bàn'}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {rsv.notes && (
                  <div style={{
                    background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '10px 14px',
                    fontSize: '0.8125rem', color: 'var(--text-muted)', borderLeft: '3px solid var(--border)',
                  }}>
                    📝 {rsv.notes}
                  </div>
                )}

                {/* Actions */}
                {(actions.length > 0 || (!rsv.tableNo && rsv.status !== 'cancelled' && rsv.status !== 'no_show' && rsv.status !== 'completed')) && (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Assign table inline */}
                    {!rsv.tableNo && rsv.status !== 'cancelled' && rsv.status !== 'no_show' && rsv.status !== 'completed' && (
                      assigningTable === rsv.id ? (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            value={tableInput}
                            onChange={(e) => setTableInput(e.target.value)}
                            placeholder="VD: Bàn 05"
                            onKeyDown={(e) => e.key === 'Enter' && handleAssignTable(rsv.id)}
                            style={{
                              padding: '7px 12px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--primary)',
                              fontSize: '0.875rem', background: 'var(--bg)', color: 'var(--text-main)', outline: 'none', width: 120,
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => handleAssignTable(rsv.id)}
                            style={{ padding: '7px 14px', borderRadius: 'var(--radius-md)', background: 'var(--primary)', color: '#fff', border: 'none', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Lưu
                          </button>
                          <button
                            onClick={() => { setAssigningTable(null); setTableInput(''); }}
                            style={{ padding: '7px 14px', borderRadius: 'var(--radius-md)', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: '0.8125rem', cursor: 'pointer' }}
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAssigningTable(rsv.id); setTableInput(''); }}
                          style={{
                            padding: '7px 14px', borderRadius: 'var(--radius-md)',
                            border: '1.5px dashed var(--border)', background: 'transparent',
                            color: 'var(--text-muted)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          + Phân bàn
                        </button>
                      )
                    )}

                    {/* Status action buttons */}
                    {actions.map((action) => (
                      <button
                        key={action.status}
                        onClick={() => updateReservationStatus(rsv.id, action.status)}
                        style={{
                          padding: '7px 16px', borderRadius: 'var(--radius-md)', border: 'none',
                          background: action.color, color: '#fff',
                          fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer',
                          transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
