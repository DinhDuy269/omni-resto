import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  QrCode,
  RefreshCw,
  Copy,
  ExternalLink,
  Printer,
  ShieldCheck,
  Bell,
  CreditCard,
  Building2,
  UtensilsCrossed,
  Sparkles,
  ArrowUpDown,
  DollarSign,
  Coffee,
  Check,
  Unlock,
} from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import { Modal } from '../../../shared/components/Modal';
import { tableApi } from '../../../shared/api/tableApi';
import type { TableInfo, TableStatus } from '../../../shared/types/admin';
import './TableManagement.css';

// Zone categorization helper consistent with luxury restaurant hierarchy
export interface TableZone {
  id: string;
  name: string;
  label: string;
  shortTag: string;
}

export const getTableZone = (table: TableInfo): TableZone => {
  const name = (table.table_no || '').trim().toUpperCase();
  const numMatch = name.match(/\d+/);
  const num = numMatch ? parseInt(numMatch[0], 10) : 1;

  if (name.includes('VIP') || num > 12) {
    return {
      id: 'VIP',
      name: 'Phòng VIP & Sân Vườn',
      label: '👑 Tầng 3 · VIP',
      shortTag: 'Tầng 3 · VIP',
    };
  }
  if (num >= 7 && num <= 12) {
    return {
      id: 'FLOOR_2',
      name: 'Ban Công View Phố',
      label: '❄️ Tầng 2 · Ban Công',
      shortTag: 'Tầng 2 · Ban Công',
    };
  }
  return {
    id: 'FLOOR_1',
    name: 'Sảnh Ánh Sáng',
    label: '🍽️ Tầng 1 · Sảnh Chính',
    shortTag: 'Tầng 1 · Sảnh',
  };
};

// Clean duration formatter to prevent awkward mock hours like "385 giờ"
const formatOccupiedDuration = (timeStr?: string): string => {
  if (!timeStr) return 'Vừa vào bàn';
  const hoursMatch = timeStr.match(/(\d+)\s*giờ/);
  if (hoursMatch) {
    const hours = parseInt(hoursMatch[1], 10);
    if (hours > 24) {
      return 'Đang dùng bữa';
    }
  }
  return timeStr;
};

export const TableManagement: React.FC = () => {
  const {
    tables,
    updateTableStatus,
    addTable,
    deleteTable,
    updateTable,
    regenerateTableQrToken,
    verifyTableSession,
    setTablePaymentRequested,
    confirmTablePayment,
    service_requests,
    resolveServiceRequestsByTable,
    fetchAdminData,
  } = useAdminStore();

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name-asc' | 'capacity-desc' | 'revenue-desc'>('name-asc');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableInfo | null>(null);
  const [qrModalTable, setQrModalTable] = useState<TableInfo | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [tableForm, setTableForm] = useState({
    table_no: '',
    capacity: 4,
    status: 'AVAILABLE' as TableStatus,
    zonePreset: 'FLOOR_1',
  });

  // Filter & Sort Logic
  const filteredTables = useMemo(() => {
    return tables
      .filter((t) => {
        const matchesFilter = filterStatus === 'ALL' || t.status?.toUpperCase() === filterStatus;
        const matchesSearch =
          (t.table_no || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          getTableZone(t).name.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesZone = true;
        if (selectedZone !== 'ALL') {
          matchesZone = getTableZone(t).id === selectedZone;
        }

        return matchesFilter && matchesSearch && matchesZone;
      })
      .sort((a, b) => {
        if (sortBy === 'capacity-desc') {
          return (b.capacity || 0) - (a.capacity || 0);
        }
        if (sortBy === 'revenue-desc') {
          return (b.current_order_amount || 0) - (a.current_order_amount || 0);
        }
        // default: name-asc (natural number sorting)
        const numA = parseInt((a.table_no || '').replace(/\D/g, '') || '0', 10);
        const numB = parseInt((b.table_no || '').replace(/\D/g, '') || '0', 10);
        if (numA !== numB) return numA - numB;
        return (a.table_no || '').localeCompare(b.table_no || '');
      });
  }, [tables, filterStatus, selectedZone, searchQuery, sortBy]);

  // Aggregate Counts & Metrics
  const availableCount = tables.filter((t) => t.status?.toUpperCase() === 'AVAILABLE').length;
  const occupiedCount = tables.filter((t) => t.status?.toUpperCase() === 'OCCUPIED').length;
  const reservedCount = tables.filter((t) => t.status?.toUpperCase() === 'RESERVED').length;
  const cleaningCount = tables.filter((t) => t.status?.toUpperCase() === 'CLEANING').length;

  const totalActiveRevenue = tables
    .filter((t) => t.status?.toUpperCase() === 'OCCUPIED')
    .reduce((sum, t) => sum + (t.current_order_amount || 0), 0);

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchAdminData();
    } catch {
      // Ignore
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Add Table Handlers
  const handleOpenAddModal = () => {
    const nextTableNum = tables.length + 1;
    const formattedNum = nextTableNum < 10 ? `0${nextTableNum}` : `${nextTableNum}`;
    setTableForm({
      table_no: `Bàn ${formattedNum}`,
      capacity: 4,
      status: 'AVAILABLE',
      zonePreset: nextTableNum > 12 ? 'VIP' : nextTableNum > 6 ? 'FLOOR_2' : 'FLOOR_1',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (tbl: TableInfo, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTable(tbl);
    setTableForm({
      table_no: tbl.table_no,
      capacity: tbl.capacity,
      status: (tbl.status?.toUpperCase() || 'AVAILABLE') as TableStatus,
      zonePreset: getTableZone(tbl).id,
    });
  };

  const handleSubmitAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableForm.table_no.trim()) return;

    addTable({
      table_no: tableForm.table_no.trim(),
      capacity: Number(tableForm.capacity),
      status: tableForm.status,
    });
    setIsAddModalOpen(false);
  };

  const handleSubmitEditTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable || !tableForm.table_no.trim()) return;

    updateTable({
      ...editingTable,
      table_no: tableForm.table_no.trim(),
      capacity: Number(tableForm.capacity),
      status: tableForm.status,
    });
    setEditingTable(null);
  };

  const handleDeleteTable = (id: string, table_no: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Bạn có chắc chắn muốn xóa "${table_no}"? Hành động này sẽ hủy mọi liên kết phiên hiện tại.`)) {
      deleteTable(id);
    }
  };

  return (
    <div className="table-mgmt-container">
      {/* 1. Header Toolbar */}
      <div className="table-mgmt-header">
        <div className="table-mgmt-header-left">
          <div className="table-mgmt-title-row">
            <h1 className="table-mgmt-title">Sơ Đồ Bàn Ăn & Phòng Tiệc</h1>
            <span className="table-mgmt-live-pill">
              <span className="table-live-dot" /> Live Monitoring
            </span>
          </div>
          <p className="table-mgmt-subtitle">
            Giám sát trực quan trạng thái bàn ăn theo thời gian thực, điều phối đón tiếp và theo dõi tạm tính tại bàn
          </p>
        </div>

        <div className="table-mgmt-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Đồng bộ dữ liệu bàn ăn từ máy chủ"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Làm Mới</span>
          </button>

          <button type="button" className="btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={16} />
            <span>Thêm Bàn Mới</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Stats Ribbon */}
      <div className="table-stats-grid">
        <div className="table-stat-card">
          <div className="table-stat-info">
            <span className="table-stat-label">Tổng Quy Mô Bàn</span>
            <span className="table-stat-value">{tables.length}</span>
            <span className="table-stat-sub">3 phân tầng & sảnh</span>
          </div>
          <div className="table-stat-icon-wrapper table-stat-icon-all">
            <Building2 size={22} />
          </div>
        </div>

        <div className="table-stat-card">
          <div className="table-stat-info">
            <span className="table-stat-label">Bàn Trống Sẵn Sàng</span>
            <span className="table-stat-value" style={{ color: '#10b981' }}>
              {availableCount}
            </span>
            <span className="table-stat-sub">Đón khách vãng lai</span>
          </div>
          <div className="table-stat-icon-wrapper table-stat-icon-available">
            <Sparkles size={22} />
          </div>
        </div>

        <div className="table-stat-card">
          <div className="table-stat-info">
            <span className="table-stat-label">Đang Phục Vụ</span>
            <span className="table-stat-value" style={{ color: '#ef4444' }}>
              {occupiedCount}
            </span>
            <span className="table-stat-sub">Bàn đang có khách</span>
          </div>
          <div className="table-stat-icon-wrapper table-stat-icon-occupied">
            <UtensilsCrossed size={22} />
          </div>
        </div>

        <div className="table-stat-card">
          <div className="table-stat-info">
            <span className="table-stat-label">Đã Đặt Trước</span>
            <span className="table-stat-value" style={{ color: '#f59e0b' }}>
              {reservedCount}
            </span>
            <span className="table-stat-sub">Đang giữ chỗ đặt hẹn</span>
          </div>
          <div className="table-stat-icon-wrapper table-stat-icon-reserved">
            <Clock size={22} />
          </div>
        </div>

        <div className="table-stat-card">
          <div className="table-stat-info">
            <span className="table-stat-label">Cần Dọn Dẹp</span>
            <span className="table-stat-value" style={{ color: '#8b5cf6' }}>
              {cleaningCount}
            </span>
            <span className="table-stat-sub">Chờ nhân viên dọn</span>
          </div>
          <div className="table-stat-icon-wrapper table-stat-icon-cleaning">
            <Coffee size={22} />
          </div>
        </div>

        <div className="table-stat-card">
          <div className="table-stat-info">
            <span className="table-stat-label">Tạm Tính Đang Phục Vụ</span>
            <span className="table-stat-value" style={{ fontSize: '1.25rem', color: '#2563eb' }}>
              {totalActiveRevenue.toLocaleString('vi-VN')} đ
            </span>
            <span className="table-stat-sub">Ước tính doanh thu mở</span>
          </div>
          <div className="table-stat-icon-wrapper table-stat-icon-revenue">
            <DollarSign size={22} />
          </div>
        </div>
      </div>

      {/* 3. Zone Navigation & Filter Bar */}
      <div className="table-filter-bar">
        {/* Zone Segmentation Row */}
        <div className="zone-filter-section">
          <div className="zone-filter-label">
            <Building2 size={16} /> Phân Tầng / Khu Vực
          </div>
          <div className="zone-filter-tabs">
            {[
              { id: 'ALL', label: '🏢 Toàn Bộ Khu Vực', count: tables.length },
              {
                id: 'FLOOR_1',
                label: '🍽️ Tầng 1 · Sảnh Ánh Sáng',
                count: tables.filter((t) => getTableZone(t).id === 'FLOOR_1').length,
              },
              {
                id: 'FLOOR_2',
                label: '❄️ Tầng 2 · Ban Công View Phố',
                count: tables.filter((t) => getTableZone(t).id === 'FLOOR_2').length,
              },
              {
                id: 'VIP',
                label: '👑 Tầng 3 · VIP & Sân Vườn',
                count: tables.filter((t) => getTableZone(t).id === 'VIP').length,
              },
            ].map((zone) => (
              <button
                key={zone.id}
                type="button"
                className={`zone-tab-btn ${selectedZone === zone.id ? 'active' : ''}`}
                onClick={() => setSelectedZone(zone.id)}
              >
                <span>{zone.label}</span>
                <span className="zone-tab-count">{zone.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Status Filters & Search Row */}
        <div className="status-search-section">
          <div className="status-pills-row">
            <button
              type="button"
              className={`status-pill-btn ${filterStatus === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterStatus('ALL')}
            >
              <span className="status-pill-dot dot-all" />
              <span>Tất Cả</span>
              <span className="status-pill-count">({tables.length})</span>
            </button>

            <button
              type="button"
              className={`status-pill-btn ${filterStatus === 'AVAILABLE' ? 'active' : ''}`}
              onClick={() => setFilterStatus('AVAILABLE')}
            >
              <span className="status-pill-dot dot-available" />
              <span>Bàn Trống</span>
              <span className="status-pill-count">({availableCount})</span>
            </button>

            <button
              type="button"
              className={`status-pill-btn ${filterStatus === 'OCCUPIED' ? 'active' : ''}`}
              onClick={() => setFilterStatus('OCCUPIED')}
            >
              <span className="status-pill-dot dot-occupied" />
              <span>Có Khách</span>
              <span className="status-pill-count">({occupiedCount})</span>
            </button>

            <button
              type="button"
              className={`status-pill-btn ${filterStatus === 'RESERVED' ? 'active' : ''}`}
              onClick={() => setFilterStatus('RESERVED')}
            >
              <span className="status-pill-dot dot-reserved" />
              <span>Đã Đặt Trước</span>
              <span className="status-pill-count">({reservedCount})</span>
            </button>

            <button
              type="button"
              className={`status-pill-btn ${filterStatus === 'CLEANING' ? 'active' : ''}`}
              onClick={() => setFilterStatus('CLEANING')}
            >
              <span className="status-pill-dot dot-cleaning" />
              <span>Cần Dọn</span>
              <span className="status-pill-count">({cleaningCount})</span>
            </button>
          </div>

          <div className="table-search-sort-group">
            <div className="table-search-box">
              <Search size={15} color="var(--text-muted)" />
              <input
                type="text"
                className="table-search-input"
                placeholder="Tìm số bàn, khu vực..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowUpDown size={14} color="var(--text-muted)" />
              <select
                className="table-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="name-asc">Xếp theo số bàn (01, 02...)</option>
                <option value="capacity-desc">Sức chứa lớn nhất</option>
                <option value="revenue-desc">Tạm tính cao nhất</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Floor Map Interactive Grid */}
      <div className="table-floor-grid">
        {filteredTables.length === 0 ? (
          <div className="table-empty-box">
            <div className="table-empty-icon">🪑</div>
            <h3 className="table-empty-title">Không tìm thấy bàn nào</h3>
            <p className="table-empty-desc">
              Không có bàn nào phù hợp với bộ lọc khu vực "{selectedZone}" hoặc từ khóa "{searchQuery}".
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSelectedZone('ALL');
                setFilterStatus('ALL');
                setSearchQuery('');
              }}
            >
              Đặt Lại Bộ Lọc
            </button>
          </div>
        ) : (
          filteredTables.map((tbl) => {
            const statusUpper = (tbl.status || 'AVAILABLE').toUpperCase();
            const activeTableCalls = service_requests.filter(
              (sr) =>
                (sr.table_no || '').toLowerCase() === (tbl.table_no || '').toLowerCase() &&
                sr.status === 'OPEN'
            );
            const isFrozenForPayment = Boolean(tbl.payment_requested);
            const isAwaitingVerification = statusUpper === 'OCCUPIED' && tbl.is_verified === false;
            const zone = getTableZone(tbl);

            const cardClasses = [
              'table-card-clean',
              `status-${statusUpper.toLowerCase()}`,
              isFrozenForPayment ? 'is-payment-frozen' : '',
              activeTableCalls.length > 0 ? 'has-active-alert' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <div key={tbl.id} className={cardClasses}>
                {/* ── CARD HEADER: Clean, No-Wrap Identity & Actions ── */}
                <div className="table-card-header">
                  <div className="table-card-title-group">
                    <div className="table-card-heading">
                      <span className="table-card-name">{tbl.table_no}</span>
                    </div>
                    <div className="table-card-meta">
                      <span className="table-zone-pill">{zone.shortTag}</span>
                      <span className="table-meta-bullet">•</span>
                      <span className="table-capacity-pill">
                        <Users size={12} /> {tbl.capacity || 4} chỗ ngồi
                      </span>
                    </div>
                  </div>

                  <div className="table-card-header-right">
                    {/* Status Pill with accurate label */}
                    <div className={`table-status-pill pill-${statusUpper.toLowerCase()}`}>
                      <span className="table-status-dot-sm" />
                      <span>
                        {statusUpper === 'AVAILABLE'
                          ? 'Bàn trống'
                          : statusUpper === 'OCCUPIED'
                          ? 'Có khách'
                          : statusUpper === 'RESERVED'
                          ? 'Đã đặt'
                          : 'Cần dọn'}
                      </span>
                    </div>

                    {/* Subtle Tool Buttons */}
                    <div className="table-card-tools">
                      <button
                        type="button"
                        className="table-tool-btn btn-qr"
                        title="Mã QR gọi món bảo mật"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQrModalTable(tbl);
                          setCopied(false);
                        }}
                      >
                        <QrCode size={13} />
                      </button>
                      <button
                        type="button"
                        className="table-tool-btn"
                        title="Chỉnh sửa thông tin bàn"
                        onClick={(e) => handleOpenEditModal(tbl, e)}
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        type="button"
                        className="table-tool-btn btn-delete"
                        title="Xóa bàn khỏi sơ đồ"
                        onClick={(e) => handleDeleteTable(tbl.id, tbl.table_no, e)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── ALERTS (IF ANY) ── */}
                {activeTableCalls.length > 0 && (
                  <div className="table-alert-banner table-alert-service">
                    <div className="table-alert-service-text">
                      <Bell size={13} className="animate-bounce" />
                      <span>{activeTableCalls[activeTableCalls.length - 1].request_text}</span>
                    </div>
                    <button
                      type="button"
                      className="table-alert-service-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        resolveServiceRequestsByTable(tbl.table_no);
                      }}
                    >
                      Đã phục vụ
                    </button>
                  </div>
                )}

                {isAwaitingVerification && (
                  <div className="table-alert-banner table-alert-verify">
                    <span style={{ fontWeight: 700 }}>⏳ Khách chờ nhận bàn</span>
                    <button
                      type="button"
                      className="table-alert-verify-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        verifyTableSession(tbl.table_no);
                      }}
                    >
                      <ShieldCheck size={13} style={{ display: 'inline', marginRight: 4 }} />
                      Xác nhận
                    </button>
                  </div>
                )}

                {isFrozenForPayment && (
                  <div className="table-alert-banner table-alert-payment">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                      <CreditCard size={13} />
                      <span>Khách xin hóa đơn (Đã chốt)</span>
                    </div>
                    <button
                      type="button"
                      className="table-alert-payment-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTablePaymentRequested(tbl.table_no, false);
                      }}
                      title="Mở lại phiên cho khách gọi thêm"
                    >
                      Mở lại
                    </button>
                  </div>
                )}

                {/* ── CARD BODY: Clean Structured State ── */}
                <div className="table-card-body-clean">
                  {statusUpper === 'OCCUPIED' ? (
                    <>
                      <div className="table-revenue-header-row">
                        <span className="table-revenue-title">Tạm tính hóa đơn</span>
                        <span
                          className={`table-payment-chip ${
                            tbl.is_paid ? 'chip-paid' : 'chip-unpaid'
                          }`}
                        >
                          {tbl.is_paid ? '✓ Đã thu' : 'Chưa thu'}
                        </span>
                      </div>

                      <div className="table-revenue-amount-row">
                        <strong
                          className="table-revenue-amount"
                          style={{ color: tbl.is_paid ? '#10b981' : 'var(--text-main)' }}
                        >
                          {(tbl.current_order_amount || 0).toLocaleString('vi-VN')}
                        </strong>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                          ₫
                        </span>
                      </div>

                      <div className="table-revenue-time-row">
                        <Clock size={12} />
                        <span>{formatOccupiedDuration(tbl.occupied_since)}</span>
                      </div>
                    </>
                  ) : statusUpper === 'RESERVED' ? (
                    <div className="table-reserved-state-body">
                      <div className="table-reserved-state-icon">
                        <Clock size={18} />
                      </div>
                      <div className="table-reserved-state-text">
                        <span className="table-reserved-state-title">Đã Có Khách Đặt Trước</span>
                        <span className="table-reserved-state-sub">
                          Giữ chỗ đón khách hẹn theo lịch
                        </span>
                      </div>
                    </div>
                  ) : statusUpper === 'CLEANING' ? (
                    <div className="table-cleaning-state-body">
                      <div className="table-cleaning-state-icon">
                        <Coffee size={18} />
                      </div>
                      <div className="table-cleaning-state-text">
                        <span className="table-cleaning-state-title">Bàn Cần Dọn Dẹp</span>
                        <span className="table-cleaning-state-sub">
                          Chờ nhân viên dọn sạch để mở lại
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="table-empty-state-body">
                      <div className="table-empty-state-icon">
                        <Sparkles size={18} />
                      </div>
                      <div className="table-empty-state-text">
                        <span className="table-empty-state-title">Bàn Trống Sẵn Sàng</span>
                        <span className="table-empty-state-sub">
                          Sẵn sàng xếp chỗ đón khách mới
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── CARD FOOTER: Clean, Spacious, Ergonomic Actions ── */}
                <div className="table-card-footer-clean">
                  {statusUpper === 'AVAILABLE' && (
                    <button
                      type="button"
                      className="table-op-btn-full btn-open"
                      onClick={() => updateTableStatus(tbl.id, 'OCCUPIED')}
                    >
                      <Sparkles size={15} />
                      <span>Mở Bàn / Nhận Khách</span>
                    </button>
                  )}

                  {statusUpper === 'OCCUPIED' && (
                    <>
                      {!tbl.is_paid ? (
                        <>
                          {/* Row 1: Primary Action (Thanh Toán) */}
                          <button
                            type="button"
                            className={`table-op-btn-full ${
                              isFrozenForPayment ? 'btn-pay-frozen' : 'btn-pay'
                            }`}
                            title="Xác nhận khách đã thanh toán đủ"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Xác nhận đã nhận đủ ${(
                                    tbl.current_order_amount || 0
                                  ).toLocaleString('vi-VN')} đ cho ${tbl.table_no}?`
                                )
                              ) {
                                confirmTablePayment(tbl.table_no);
                              }
                            }}
                          >
                            <CreditCard size={15} />
                            <span>
                              {isFrozenForPayment ? '💵 Thu Tiền Ngay' : 'Xác Nhận Thu Tiền'}
                            </span>
                          </button>

                          {/* Row 2: Secondary Clean Dual Buttons */}
                          <div className="table-secondary-actions-row">
                            <button
                              type="button"
                              className="table-op-btn-sub btn-release"
                              title="Trả bàn và chuyển sang dọn dẹp"
                              onClick={async () => {
                                if (
                                  window.confirm(
                                    `Chuyển ${tbl.table_no} sang dọn bàn? Phiên của khách sẽ kết thúc.`
                                  )
                                ) {
                                  updateTableStatus(tbl.id, 'CLEANING');
                                  setTablePaymentRequested(tbl.table_no, false);
                                  await tableApi
                                    .closeSession(tbl.id, 'ADMIN_CHECKOUT')
                                    .catch(() => {});
                                  window.dispatchEvent(
                                    new CustomEvent('omniresto:table_session_closed', {
                                      detail: { tableId: tbl.id, reason: 'ADMIN_CHECKOUT' },
                                    })
                                  );
                                }
                              }}
                            >
                              <Coffee size={13} />
                              <span>Trả Bàn</span>
                            </button>

                            <button
                              type="button"
                              className="table-op-btn-sub btn-unlock"
                              title="Mở khóa bàn cho thiết bị mới quét nếu khách hết pin"
                              onClick={async () => {
                                if (
                                  window.confirm(
                                    `Mở khóa phiên cho ${tbl.table_no}? Khóa thiết bị cũ sẽ được giải phóng để quét lại QR.`
                                  )
                                ) {
                                  await tableApi
                                    .closeSession(tbl.id, 'STAFF_DEVICE_UNLOCK')
                                    .catch(() => {});
                                  updateTableStatus(tbl.id, 'AVAILABLE');
                                  setTablePaymentRequested(tbl.table_no, false);
                                  window.dispatchEvent(
                                    new CustomEvent('omniresto:table_session_closed', {
                                      detail: { tableId: tbl.id, reason: 'STAFF_DEVICE_UNLOCK' },
                                    })
                                  );
                                }
                              }}
                            >
                              <Unlock size={13} />
                              <span>Mở Khóa</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="table-op-btn-full btn-leave-clean"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Khách ${tbl.table_no} đã rời bàn. Chuyển sang Cần Dọn Dẹp?`
                              )
                            ) {
                              updateTableStatus(tbl.id, 'CLEANING');
                              fetch(`/api/table-sessions/close?tableId=${tbl.id}`, {
                                method: 'POST',
                              }).catch(() => {});
                              window.dispatchEvent(
                                new CustomEvent('omniresto:table_session_closed', {
                                  detail: { tableId: tbl.id, reason: 'ADMIN_CHECKOUT' },
                                })
                              );
                            }
                          }}
                        >
                          <Coffee size={15} />
                          <span>Khách Rời Bàn & Dọn Dẹp</span>
                        </button>
                      )}
                    </>
                  )}

                  {statusUpper === 'CLEANING' && (
                    <button
                      type="button"
                      className="table-op-btn-full btn-clean-done"
                      onClick={() => {
                        updateTableStatus(tbl.id, 'AVAILABLE');
                        fetch(`/api/table-sessions/close?tableId=${tbl.id}`, {
                          method: 'POST',
                        }).catch(() => {});
                        window.dispatchEvent(
                          new CustomEvent('omniresto:table_session_closed', {
                            detail: { tableId: tbl.id, reason: 'CLEANING_COMPLETED' },
                          })
                        );
                      }}
                    >
                      <CheckCircle2 size={16} />
                      <span>Đã Dọn Xong (Sẵn Sàng)</span>
                    </button>
                  )}

                  {statusUpper === 'RESERVED' && (
                    <button
                      type="button"
                      className="table-op-btn-full btn-seat-guest"
                      onClick={() => updateTableStatus(tbl.id, 'OCCUPIED')}
                    >
                      <Users size={15} />
                      <span>Xếp Khách Vào Bàn</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Modal: Thêm Bàn Ăn Mới */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm Bàn Ăn Mới Vào Sơ Đồ"
      >
        <form onSubmit={handleSubmitAddTable}>
          <div className="form-group">
            <label className="form-label">Tên / Ký Hiệu Bàn Ăn*</label>
            <input
              type="text"
              className="form-input"
              placeholder="VD: Bàn 13, Bàn VIP 02, Sân Vườn 01..."
              required
              value={tableForm.table_no}
              onChange={(e) => setTableForm({ ...tableForm, table_no: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Sức Chứa Ghế Ngồi*</label>
            <div className="capacity-chips-grid">
              {[2, 4, 6, 8, 10, 12, 16].map((cap) => (
                <button
                  key={cap}
                  type="button"
                  className={`capacity-chip-btn ${tableForm.capacity === cap ? 'active' : ''}`}
                  onClick={() => setTableForm({ ...tableForm, capacity: cap })}
                >
                  {cap} ghế
                </button>
              ))}
            </div>
            <input
              type="number"
              className="form-input"
              min={1}
              max={50}
              required
              value={tableForm.capacity}
              onChange={(e) => setTableForm({ ...tableForm, capacity: Number(e.target.value) })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Khu Vực Phân Tầng</label>
              <select
                className="form-select"
                value={tableForm.zonePreset}
                onChange={(e) => setTableForm({ ...tableForm, zonePreset: e.target.value })}
              >
                <option value="FLOOR_1">Tầng 1 · Sảnh Ánh Sáng</option>
                <option value="FLOOR_2">Tầng 2 · Ban Công View Phố</option>
                <option value="VIP">Tầng 3 · VIP & Sân Vườn</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Trạng Thái Ban Đầu*</label>
              <select
                className="form-select"
                value={tableForm.status}
                onChange={(e) => setTableForm({ ...tableForm, status: e.target.value as TableStatus })}
              >
                <option value="AVAILABLE">Trống (Sẵn sàng)</option>
                <option value="OCCUPIED">Đang có khách</option>
                <option value="RESERVED">Đã đặt trước</option>
                <option value="CLEANING">Cần dọn dẹp</option>
              </select>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '16px',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAddModalOpen(false)}
            >
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              <Check size={16} />
              <span>Khởi Tạo Bàn</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 6. Modal: Chỉnh Sửa Thông Tin Bàn */}
      <Modal
        isOpen={Boolean(editingTable)}
        onClose={() => setEditingTable(null)}
        title={`Chỉnh Sửa Bàn Ăn: ${editingTable?.table_no || ''}`}
      >
        <form onSubmit={handleSubmitEditTable}>
          <div className="form-group">
            <label className="form-label">Tên / Ký Hiệu Bàn*</label>
            <input
              type="text"
              className="form-input"
              required
              value={tableForm.table_no}
              onChange={(e) => setTableForm({ ...tableForm, table_no: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Số Ghế Ngồi (Sức Chứa)*</label>
            <div className="capacity-chips-grid">
              {[2, 4, 6, 8, 10, 12, 16].map((cap) => (
                <button
                  key={cap}
                  type="button"
                  className={`capacity-chip-btn ${tableForm.capacity === cap ? 'active' : ''}`}
                  onClick={() => setTableForm({ ...tableForm, capacity: cap })}
                >
                  {cap} ghế
                </button>
              ))}
            </div>
            <input
              type="number"
              className="form-input"
              min={1}
              max={50}
              required
              value={tableForm.capacity}
              onChange={(e) => setTableForm({ ...tableForm, capacity: Number(e.target.value) })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Trạng Thái Bàn*</label>
            <select
              className="form-select"
              value={tableForm.status}
              onChange={(e) => setTableForm({ ...tableForm, status: e.target.value as TableStatus })}
            >
              <option value="AVAILABLE">Trống (Sẵn sàng)</option>
              <option value="OCCUPIED">Đang có khách</option>
              <option value="RESERVED">Đã đặt trước</option>
              <option value="CLEANING">Cần dọn dẹp</option>
            </select>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '16px',
            }}
          >
            <button type="button" className="btn btn-secondary" onClick={() => setEditingTable(null)}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              <Check size={16} />
              <span>Lưu Thay Đổi</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 7. Modal: Mã QR Bàn Ăn Bảo Mật */}
      {qrModalTable && (
        <Modal
          isOpen={Boolean(qrModalTable)}
          onClose={() => setQrModalTable(null)}
          title={`Mã QR Đặt Món Bảo Mật — ${qrModalTable.table_no}`}
        >
          {(() => {
            const token = qrModalTable.qr_secret_token || `qr-token-${qrModalTable.id}-default`;
            const checkInUrl = `${window.location.origin}/client/scan?token=${token}`;
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
              checkInUrl
            )}`;
            const zone = getTableZone(qrModalTable);

            return (
              <div className="qr-modal-container">
                <div className="qr-security-banner">
                  <ShieldCheck size={16} /> Mã hóa token động · Chống đổi URL số bàn & Ngăn đặt từ xa
                </div>

                <div className="qr-presentation-frame">
                  <div className="qr-table-tag">{qrModalTable.table_no}</div>
                  <div className="qr-table-zone-sub">
                    {zone.name} · Sức chứa {qrModalTable.capacity} khách
                  </div>

                  <img
                    src={qrImageUrl}
                    alt={`Mã QR ${qrModalTable.table_no}`}
                    style={{
                      width: 220,
                      height: 220,
                      borderRadius: 12,
                      display: 'block',
                      background: '#fff',
                    }}
                  />

                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                    Quét để kích hoạt phiên gọi món trực tiếp
                  </div>
                </div>

                <div className="qr-copy-row">
                  <span className="qr-url-text" title={checkInUrl}>
                    {checkInUrl}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flexShrink: 0 }}
                    onClick={() => {
                      navigator.clipboard.writeText(checkInUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    <Copy size={13} />
                    <span>{copied ? 'Đã Chép!' : 'Chép Link'}</span>
                  </button>
                </div>

                <div className="qr-action-buttons-grid">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                    onClick={() => window.open(checkInUrl, '_blank')}
                  >
                    <ExternalLink size={14} />
                    <span>Mở Thử Tab Mới</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                    onClick={() => window.print()}
                  >
                    <Printer size={14} />
                    <span>In Mã Dán Bàn</span>
                  </button>
                </div>

                <button
                  type="button"
                  className="qr-revoke-btn"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Thu hồi và cấp mã QR mới cho ${qrModalTable.table_no}? Mã QR cũ đã in sẽ ngay lập tức bị vô hiệu hóa.`
                      )
                    ) {
                      regenerateTableQrToken(qrModalTable.id);
                      const updated = tables.find((t) => t.id === qrModalTable.id);
                      if (updated) setQrModalTable(updated);
                    }
                  }}
                >
                  <RefreshCw size={14} />
                  <span>Thu hồi & Đổi mã QR mới (Nếu mã cũ bị chụp trộm)</span>
                </button>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
};
