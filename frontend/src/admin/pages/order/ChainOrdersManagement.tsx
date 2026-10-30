import React, { useState } from 'react';
import {
  ShoppingBag,
  Search,
  CreditCard,
  LayoutGrid,
  List,
  AlertTriangle,
  CheckCircle,
  Utensils,
  Filter,
  Eye,
  Ban,
  X,
} from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import { StatusBadge } from '../../components/StatusBadge';
import { useWebSocket } from '../../../shared/hooks/useWebSocket';

export const ChainOrdersManagement: React.FC = () => {
  const { orders, updateOrderStatus, confirmOrderPayment, cancelOrderItem, handleWebSocketOrderEvent } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<string>('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('TABLE');
  const [selectedOrderIdForDetails, setSelectedOrderIdForDetails] = useState<string | null>(null);

  // Lắng nghe sự kiện WebSocket thời gian thực (đơn mới, thay đổi trạng thái món, yêu cầu thanh toán)
  useWebSocket((event) => {
    handleWebSocketOrderEvent(event);
  });

  const selectedOrder = orders.find((o) => o.id === selectedOrderIdForDetails) || null;

  const getUnservedItemsCount = (ord: any): number => {
    return (ord.items || []).filter((it: any) => {
      const s = (it.status || '').toLowerCase();
      return s !== 'served' && s !== 'cancelled';
    }).length;
  };

  const handleCancelItem = async (ord: any, item: any) => {
    const reason = window.prompt(
      `Xác nhận hủy món "${item.name}" (SL: ${item.quantity}) trong đơn #${ord.order_number}:\n\nVui lòng nhập lý do hủy món:`,
      'Khách yêu cầu hủy món'
    );
    if (reason === null) return;
    try {
      await cancelOrderItem(ord.id, item.id, reason.trim() || 'Khách yêu cầu hủy món');
    } catch (err: any) {
      alert('Lỗi hủy món: ' + (err.message || 'Không thể hủy món'));
    }
  };

  const handleTraMon = async (ord: any) => {
    const unservedCount = getUnservedItemsCount(ord);
    const unservedWarning = unservedCount > 0
      ? `⚠️ LƯU Ý: Đơn hàng hiện còn ${unservedCount} món chưa phục vụ xong (Bếp đang nấu / chưa ra bàn).\n\n`
      : '';

    const isPaid = ord.payment_status === 'paid' || ord.payment_status?.toLowerCase() === 'paid';
    if (!isPaid) {
      const typeLabel = ord.order_type === 'takeaway' ? 'Mang Về' : ord.order_type === 'delivery' ? 'Giao Hàng' : 'Tại Bàn';
      const isConfirmed = window.confirm(
        unservedWarning +
        `Đơn hàng #${ord.order_number} (${typeLabel}) hiện CHƯA THANH TOÁN.\n\n` +
        `Bạn có xác nhận đã thu đủ ${ord.total_amount.toLocaleString('vi-VN')} đ (${ord.payment_method || 'Tiền mặt'}) và hoàn tất trả món cho khách không?`
      );
      if (!isConfirmed) return;
      try {
        await updateOrderStatus(ord.id, 'completed', true);
      } catch (err: any) {
        alert('Lỗi cập nhật đơn hàng: ' + (err.message || 'Không thể trả món'));
      }
    } else {
      if (unservedCount > 0) {
        const isConfirmed = window.confirm(
          unservedWarning +
          `Bạn có xác nhận hoàn tất trả toàn bộ món cho đơn #${ord.order_number} không?`
        );
        if (!isConfirmed) return;
      }
      try {
        await updateOrderStatus(ord.id, 'completed', false);
      } catch (err: any) {
        alert('Lỗi cập nhật đơn hàng: ' + (err.message || 'Không thể trả món'));
      }
    }
  };

  const handleThuTien = async (ord: any) => {
    const unservedCount = getUnservedItemsCount(ord);
    const unservedWarning = unservedCount > 0
      ? `⚠️ CẢNH BÁO: Đơn hàng hiện còn ${unservedCount} món chưa phục vụ (SERVED).\n\n`
      : '';

    const isConfirmed = window.confirm(
      unservedWarning +
      `Xác nhận thu tiền cho đơn #${ord.order_number}:\n` +
      `- Khách: ${ord.customer_name || 'Khách vãng lai'}\n` +
      `- Số tiền: ${ord.total_amount.toLocaleString('vi-VN')} đ\n` +
      `- Phương thức: ${ord.payment_method || 'Tiền mặt'}\n\n` +
      `Bấm OK để ghi nhận ĐÃ THANH TOÁN.`
    );
    if (!isConfirmed) return;
    const force = unservedCount > 0;
    try {
      await confirmOrderPayment(ord.id, ord.payment_method, ord.total_amount, false, force);
    } catch (err: any) {
      if (err?.message?.includes('chưa SERVED') || err?.status === 409) {
        if (window.confirm(`${err.message}\n\nBạn có muốn GHI ĐÈ XÁC NHẬN (FORCE CONFIRM) thanh toán không?`)) {
          await confirmOrderPayment(ord.id, ord.payment_method, ord.total_amount, false, true);
        }
      } else {
        alert('Lỗi xác nhận thanh toán: ' + (err.message || 'Không thể thu tiền'));
      }
    }
  };

  const filteredOrders = orders.filter((ord) => {
    const matchesStatus = statusTab === 'all' || ord.status === statusTab;
    const matchesType = orderTypeFilter === 'all' || ord.order_type === orderTypeFilter;
    const matchesSearch =
      ord.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ord.customer_name && ord.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ord.table_no && ord.table_no.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesType && matchesSearch;
  });

  const getStatusCount = (status: string) => {
    if (status === 'all') return orders.length;
    return orders.filter((o) => o.status === status).length;
  };

  const pendingCount = getStatusCount('pending');
  const preparingCount = getStatusCount('preparing');
  const readyCount = getStatusCount('ready');
  const completedRevenue = orders
    .filter((o) => o.status === 'completed')
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── TOP HEADER ── */}
      <div className="adm-page-header">
        <div>
          <div className="adm-header-badge-row">
            <span className="adm-badge-category">
              <ShoppingBag size={13} /> VẬN HÀNH ĐƠN HÀNG LIVE & THU NGÂN
            </span>
          </div>
          <h1 className="adm-page-title">Quản Lý Đơn Hàng Live ({orders.length})</h1>
          <p className="adm-page-subtitle">
            Theo dõi luồng chế biến, xuất hóa đơn và xử lý thanh toán thời gian thực toàn chuỗi
          </p>
        </div>

        {/* View Switcher Controls */}
        <div className="adm-header-actions">
          <div
            style={{
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '4px',
              display: 'flex',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'TABLE' ? '#ffffff' : 'transparent',
                color: viewMode === 'TABLE' ? '#0f172a' : '#64748b',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'TABLE' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <List size={16} /> Bảng Thu Ngân
            </button>
            <button
              type="button"
              onClick={() => setViewMode('CARDS')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'CARDS' ? '#ffffff' : 'transparent',
                color: viewMode === 'CARDS' ? '#0f172a' : '#64748b',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'CARDS' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <LayoutGrid size={16} /> Thẻ Chi Tiết
            </button>
          </div>
        </div>
      </div>

      {/* ── 4 KPI STATS METRIC CARDS ── */}
      <div className="adm-stats-grid">
        <div className="adm-stat-card">
          <div className="adm-stat-header">
            <span className="adm-stat-label">Đơn cần duyệt</span>
            <div className={`adm-stat-icon ${pendingCount > 0 ? 'icon-rose' : 'icon-emerald'}`}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="adm-stat-value" style={{ color: pendingCount > 0 ? '#dc2626' : '#059669' }}>
            {pendingCount}
          </div>
          <div className="adm-stat-footer">
            <span>Chờ duyệt vào bếp</span>
            <span className={`adm-stat-pill ${pendingCount > 0 ? 'pill-danger' : 'pill-success'}`}>
              {pendingCount > 0 ? 'Cần duyệt ngay' : 'Đã xử lý hết'}
            </span>
          </div>
        </div>

        <div className="adm-stat-card">
          <div className="adm-stat-header">
            <span className="adm-stat-label">Đang nấu bếp</span>
            <div className="adm-stat-icon icon-amber">
              <Utensils size={20} />
            </div>
          </div>
          <div className="adm-stat-value" style={{ color: '#d97706' }}>
            {preparingCount}
          </div>
          <div className="adm-stat-footer">
            <span>Đang chế biến trên KDS</span>
            <span className="adm-stat-pill pill-warning">Bếp đang chạy</span>
          </div>
        </div>

        <div className="adm-stat-card">
          <div className="adm-stat-header">
            <span className="adm-stat-label">Sẵn sàng trả món</span>
            <div className="adm-stat-icon icon-emerald">
              <CheckCircle size={20} />
            </div>
          </div>
          <div className="adm-stat-value" style={{ color: '#059669' }}>
            {readyCount}
          </div>
          <div className="adm-stat-footer">
            <span>Chờ phục vụ ra bàn</span>
            <span className="adm-stat-pill pill-success">Sẵn sàng</span>
          </div>
        </div>

        <div className="adm-stat-card">
          <div className="adm-stat-header">
            <span className="adm-stat-label">Doanh thu hoàn tất</span>
            <div className="adm-stat-icon icon-purple">
              <CreditCard size={20} />
            </div>
          </div>
          <div className="adm-stat-value" style={{ fontSize: '1.65rem' }}>
            {completedRevenue.toLocaleString('vi-VN')} đ
          </div>
          <div className="adm-stat-footer">
            <span>Đã thanh toán thực tế</span>
            <span className="adm-stat-pill pill-purple">Hoàn tất</span>
          </div>
        </div>
      </div>

      {/* ── BỘ LỌC TÌM KIẾM & PHÂN LOẠI ── */}
      <div className="adm-filter-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div className="adm-search-box" style={{ width: '340px' }}>
            <Search size={16} className="adm-search-icon" />
            <input
              type="text"
              className="adm-search-input"
              placeholder="Tìm mã đơn (ORD-HN-8841), tên khách, số bàn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Lọc loại đơn */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={15} color="var(--text-muted)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Hình thức:</span>
            <select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value)}
              className="adm-select-control"
            >
              <option value="all">Tất Cả Hình Thức</option>
              <option value="dine_in">Ăn Tại Bàn (Dine-in)</option>
              <option value="delivery">Giao Hàng (Online)</option>
              <option value="takeaway">Mang Về (Takeaway)</option>
            </select>
          </div>
        </div>

        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
          {[
            { id: 'all', label: 'Tất Cả Đơn' },
            { id: 'pending', label: 'Chờ Duyệt' },
            { id: 'preparing', label: 'Đang Nấu Bếp' },
            { id: 'ready', label: 'Sẵn Sàng Giao' },
            { id: 'completed', label: 'Hoàn Tất' },
            { id: 'cancelled', label: 'Đã Hủy' },
          ].map((tab) => {
            const count = getStatusCount(tab.id);
            return (
              <button
                key={tab.id}
                className={`btn btn-sm ${statusTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: statusTab === tab.id ? 700 : 500,
                }}
                onClick={() => setStatusTab(tab.id)}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-full)',
                    background: statusTab === tab.id ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.06)',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── VIEW 1: BẢNG THU NGÂN COMPACT (TABLE VIEW) ── */}
      {viewMode === 'TABLE' && (
        <div className="adm-table-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="adm-data-table" style={{ minWidth: '950px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '14px 18px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Mã Đơn
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Hình Thức / Bàn
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Khách Hàng
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Chi Tiết Món
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Tổng Tiền
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Trạng Thái
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>
                    Thao Tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      Không có đơn hàng nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => {
                    const isPending = ord.status === 'pending';
                    return (
                      <tr
                        key={ord.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          backgroundColor: isPending ? 'rgba(239, 68, 68, 0.03)' : 'transparent',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontSize: '0.9rem' }}>
                              {ord.order_number}
                            </strong>
                            {isPending && (
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  backgroundColor: 'var(--danger-bg)',
                                  color: 'var(--danger)',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--danger-border)',
                                }}
                              >
                                MỚI
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {ord.created_at}
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor:
                                ord.order_type === 'dine_in'
                                  ? 'var(--info-bg)'
                                  : ord.order_type === 'delivery'
                                  ? 'var(--purple-bg)'
                                  : 'var(--warning-bg)',
                              color:
                                ord.order_type === 'dine_in'
                                  ? 'var(--info)'
                                  : ord.order_type === 'delivery'
                                  ? 'var(--purple)'
                                  : 'var(--warning)',
                            }}
                          >
                            {ord.order_type === 'dine_in'
                              ? `📍 ${ord.table_no || 'Tại Bàn'}`
                              : ord.order_type === 'delivery'
                              ? '🛵 Giao Hàng'
                              : '🛍️ Mang Về'}
                          </span>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                            {ord.customer_name || 'Khách vãng lai'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>TT: {ord.payment_method || 'Tiền mặt'}</span>
                            {ord.payment_status === 'paid' || ord.payment_status?.toLowerCase() === 'paid' ? (
                              <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.68rem', backgroundColor: 'var(--success-bg)', padding: '1px 5px', borderRadius: '3px', border: '1px solid var(--success-border)' }}>✓ ĐÃ TT</span>
                            ) : (
                              <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: '0.68rem', backgroundColor: 'var(--danger-bg)', padding: '1px 5px', borderRadius: '3px', border: '1px solid var(--danger-border)' }}>⏳ CHƯA TT</span>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-body)', fontWeight: 600 }}>
                              {ord.items.filter((i: any) => i.status !== 'cancelled').length} món hợp lệ
                              {ord.items.some((i: any) => i.status === 'cancelled') && (
                                <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 700 }}>
                                  ({ord.items.filter((i: any) => i.status === 'cancelled').length} đã hủy)
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm"
                              style={{
                                padding: '2px 8px',
                                fontSize: '0.72rem',
                                backgroundColor: 'var(--bg-app)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--primary)',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                              }}
                              onClick={() => setSelectedOrderIdForDetails(ord.id)}
                              title="Xem chi tiết và thao tác hủy món riêng lẻ"
                            >
                              <Eye size={12} /> Chi tiết
                            </button>
                          </div>
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-muted)',
                              marginTop: '4px',
                              maxWidth: '220px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={ord.items.map((i: any) => {
                              const optStr = i.options && i.options.length > 0 ? ` (${i.options.map((o: any) => o.option_name).join(', ')})` : '';
                              const cancelStr = i.status === 'cancelled' ? ' [ĐÃ HỦY]' : '';
                              return `${i.quantity}x ${i.name}${optStr}${cancelStr}`;
                            }).join(', ')}
                          >
                            {ord.items.map((i: any, iIdx: number) => {
                              const isC = i.status === 'cancelled';
                              return (
                                <span key={i.id || iIdx} style={{ textDecoration: isC ? 'line-through' : 'none', color: isC ? 'var(--danger)' : 'inherit', marginRight: '6px' }}>
                                  {i.quantity}x {i.name}{isC ? ' (hủy)' : ''}{iIdx < ord.items.length - 1 ? ',' : ''}
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <strong style={{ fontSize: '0.95rem', color: 'var(--primary)', fontFeatureSettings: "'tnum' 1" }}>
                            {ord.total_amount.toLocaleString('vi-VN')} đ
                          </strong>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <StatusBadge status={ord.status} size="sm" />
                        </td>

                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            {ord.payment_status?.toLowerCase() !== 'paid' && ord.status !== 'cancelled' && ord.status !== 'completed' && (
                              <button
                                className="btn btn-sm"
                                style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid var(--warning-border)', fontWeight: 700 }}
                                onClick={() => handleThuTien(ord)}
                                title="Xác nhận thu tiền cho đơn hàng"
                              >
                                💵 Thu Tiền
                              </button>
                            )}
                            {ord.status === 'pending' && (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => updateOrderStatus(ord.id, 'preparing')}
                              >
                                Duyệt Bếp
                              </button>
                            )}
                            {ord.status === 'preparing' && (
                              <button
                                className="btn btn-sm"
                                style={{ backgroundColor: 'var(--purple)', color: '#ffffff', border: 'none' }}
                                onClick={() => updateOrderStatus(ord.id, 'ready')}
                              >
                                Báo Xong
                              </button>
                            )}
                            {ord.status === 'ready' && (
                              <button
                                className="btn btn-sm"
                                style={{ backgroundColor: 'var(--success)', color: '#ffffff', border: 'none', fontWeight: 700 }}
                                onClick={() => handleTraMon(ord)}
                              >
                                Trả Món
                              </button>
                            )}
                            {ord.status !== 'completed' && ord.status !== 'cancelled' && (
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => {
                                  if (window.confirm(`Bạn có chắc muốn hủy đơn ${ord.order_number}?`)) {
                                    updateOrderStatus(ord.id, 'cancelled');
                                  }
                                }}
                              >
                                Hủy
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
        </div>
      )}

      {/* ── VIEW 2: THẺ CHI TIẾT (CARD VIEW) ── */}
      {viewMode === 'CARDS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredOrders.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Không tìm thấy đơn hàng nào phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            filteredOrders.map((ord) => {
              const isPending = ord.status === 'pending';
              return (
                <div
                  key={ord.id}
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    borderLeft: `4px solid ${
                      ord.status === 'pending'
                        ? 'var(--danger)'
                        : ord.status === 'preparing'
                        ? 'var(--warning)'
                        : ord.status === 'ready'
                        ? 'var(--purple)'
                        : ord.status === 'completed'
                        ? 'var(--success)'
                        : '#94a3b8'
                    }`,
                    boxShadow: isPending ? '0 4px 16px rgba(239, 68, 68, 0.12)' : 'var(--shadow-sm)',
                  }}
                >
                  {/* Top Bar of Order */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--primary-subtle)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ShoppingBag size={20} />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                            {ord.order_number}
                          </strong>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              backgroundColor:
                                ord.order_type === 'dine_in'
                                  ? 'var(--info-bg)'
                                  : ord.order_type === 'delivery'
                                  ? 'var(--purple-bg)'
                                  : 'var(--warning-bg)',
                              color:
                                ord.order_type === 'dine_in'
                                  ? 'var(--info)'
                                  : ord.order_type === 'delivery'
                                  ? 'var(--purple)'
                                  : 'var(--warning)',
                            }}
                          >
                            {ord.order_type === 'dine_in'
                              ? `📍 ${ord.table_no || 'Chưa xếp bàn'}`
                              : ord.order_type === 'delivery'
                              ? '🛵 Giao Hàng'
                              : '🛍️ Mang Về'}
                          </span>

                          {isPending && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                backgroundColor: 'var(--danger-bg)',
                                color: 'var(--danger)',
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-full)',
                                border: '1px solid var(--danger-border)',
                                animation: 'pulse 1.5s infinite',
                              }}
                            >
                              ⚠️ Cần duyệt ngay
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Tạo lúc: <strong>{ord.created_at}</strong> {ord.customer_name ? `• Khách: ${ord.customer_name}` : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TỔNG TIỀN</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', fontFeatureSettings: "'tnum' 1" }}>
                          {ord.total_amount.toLocaleString('vi-VN')} đ
                        </div>
                      </div>
                      <StatusBadge status={ord.status} />
                    </div>
                  </div>

                  {/* Items Breakdown Table */}
                  <div
                    style={{
                      backgroundColor: 'var(--bg-app)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {ord.items.map((item: any) => {
                      const isCancelled = item.status === 'cancelled';
                      const isServed = item.status === 'served';
                      const canCancel = !isCancelled && !isServed && ord.status !== 'completed' && ord.status !== 'cancelled';

                      return (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.85rem',
                            padding: '6px 8px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: isCancelled ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <strong style={{ color: isCancelled ? 'var(--text-muted)' : 'var(--text-main)', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                                {item.quantity}x {item.name}
                              </strong>
                              {isCancelled && (
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--danger-border)' }}>
                                  ĐÃ HỦY
                                </span>
                              )}
                              {isServed && (
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, backgroundColor: 'var(--success-bg)', color: 'var(--success)', padding: '1px 6px', borderRadius: '4px' }}>
                                  Đã ra món
                                </span>
                              )}
                              {item.notes && (
                                <span style={{ color: isCancelled ? 'var(--text-muted)' : 'var(--danger)', fontSize: '0.78125rem', fontWeight: 600 }}>
                                  ({item.notes})
                                </span>
                              )}
                            </div>
                            {item.options && item.options.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                {item.options.map((opt: any, optIdx: number) => {
                                  const isSize = opt.option_type?.toLowerCase() === 'size';
                                  return (
                                    <span
                                      key={optIdx}
                                      style={{
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        background: isCancelled ? '#f3f4f6' : isSize ? '#e0e7ff' : '#ecfdf5',
                                        color: isCancelled ? '#9ca3af' : isSize ? '#3730a3' : '#065f46',
                                        border: isCancelled ? '1px solid #e5e7eb' : isSize ? '1px solid #c7d2fe' : '1px solid #a7f3d0',
                                        textDecoration: isCancelled ? 'line-through' : 'none',
                                      }}
                                    >
                                      {isSize ? '📏' : '➕'} {opt.option_name}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: isCancelled ? 'var(--text-muted)' : 'var(--text-body)', textDecoration: isCancelled ? 'line-through' : 'none', fontFeatureSettings: "'tnum' 1", fontWeight: 600 }}>
                              {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                            </span>
                            {canCancel && (
                              <button
                                type="button"
                                className="btn btn-sm"
                                style={{
                                  padding: '2px 8px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: 'var(--danger)',
                                  backgroundColor: 'var(--danger-bg)',
                                  border: '1px solid var(--danger-border)',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  whiteSpace: 'nowrap',
                                }}
                                onClick={() => handleCancelItem(ord, item)}
                                title="Hủy món này khỏi đơn"
                              >
                                <Ban size={11} /> Hủy món
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Order Footer & Action Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      <CreditCard size={15} />
                      <span>Thanh toán: <strong>{ord.payment_method}</strong></span>
                      {ord.payment_status === 'paid' || ord.payment_status?.toLowerCase() === 'paid' ? (
                        <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.72rem', backgroundColor: 'var(--success-bg)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--success-border)' }}>✓ ĐÃ THANH TOÁN</span>
                      ) : (
                        <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: '0.72rem', backgroundColor: 'var(--danger-bg)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--danger-border)' }}>⏳ CHƯA THU TIỀN</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {ord.payment_status?.toLowerCase() !== 'paid' && ord.status !== 'cancelled' && ord.status !== 'completed' && (
                        <button
                          className="btn btn-sm"
                          style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid var(--warning-border)', fontWeight: 700 }}
                          onClick={() => handleThuTien(ord)}
                        >
                          💵 Thu Tiền
                        </button>
                      )}
                      {ord.status === 'pending' && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => updateOrderStatus(ord.id, 'preparing')}
                        >
                          Duyệt & Gửi Bếp Nấu
                        </button>
                      )}
                      {ord.status === 'preparing' && (
                        <button
                          className="btn btn-sm"
                          style={{ backgroundColor: 'var(--purple)', color: '#ffffff', border: 'none' }}
                          onClick={() => updateOrderStatus(ord.id, 'ready')}
                        >
                          Báo Đã Xong Món
                        </button>
                      )}
                      {ord.status === 'ready' && (
                        <button
                          className="btn btn-sm"
                          style={{ backgroundColor: 'var(--success)', color: '#ffffff', border: 'none', fontWeight: 700 }}
                          onClick={() => handleTraMon(ord)}
                        >
                          Xác Nhận Trả Món
                        </button>
                      )}
                      {ord.status !== 'completed' && ord.status !== 'cancelled' && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            if (window.confirm(`Hủy đơn ${ord.order_number}?`)) {
                              updateOrderStatus(ord.id, 'cancelled');
                            }
                          }}
                        >
                          Hủy Đơn
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── MODAL: CHI TIẾT ĐƠN HÀNG & THAO TÁC HỦY MÓN ── */}
      {selectedOrder && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.15s ease',
          }}
          onClick={() => setSelectedOrderIdForDetails(null)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '740px',
              maxHeight: '90vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              padding: '24px',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              border: '1px solid var(--border-color)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                    Đơn #{selectedOrder.order_number}
                  </h3>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: selectedOrder.order_type === 'dine_in' ? 'var(--info-bg)' : selectedOrder.order_type === 'delivery' ? 'var(--purple-bg)' : 'var(--warning-bg)',
                      color: selectedOrder.order_type === 'dine_in' ? 'var(--info)' : selectedOrder.order_type === 'delivery' ? 'var(--purple)' : 'var(--warning)',
                    }}
                  >
                    {selectedOrder.order_type === 'dine_in' ? `📍 ${selectedOrder.table_no || 'Tại Bàn'}` : selectedOrder.order_type === 'delivery' ? '🛵 Giao Hàng' : '🛍️ Mang Về'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Tạo lúc: {selectedOrder.created_at} • Khách: <strong>{selectedOrder.customer_name || 'Khách vãng lai'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <StatusBadge status={selectedOrder.status} size="sm" />
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px' }}
                  onClick={() => setSelectedOrderIdForDetails(null)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Danh Sách Món Ăn ({selectedOrder.items.length})
                </h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Đã hủy: {selectedOrder.items.filter((i: any) => i.status === 'cancelled').length} món
                </span>
              </div>

              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-muted)' }}>Món Ăn</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>SL</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'right' }}>Đơn Giá</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'right' }}>Thành Tiền</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>Trạng Thái</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>Hành Động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((it: any) => {
                      const isCancelled = it.status === 'cancelled';
                      const isServed = it.status === 'served';
                      const canCancel = !isCancelled && !isServed && selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled';

                      return (
                        <tr
                          key={it.id}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            backgroundColor: isCancelled ? 'rgba(239, 68, 68, 0.04)' : 'transparent',
                          }}
                        >
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 600, color: isCancelled ? 'var(--text-muted)' : 'var(--text-main)', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                              {it.name}
                            </div>
                            {it.options && it.options.length > 0 && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {it.options.map((o: any) => o.option_name).join(', ')}
                              </div>
                            )}
                            {it.notes && (
                              <div style={{ fontSize: '0.75rem', color: isCancelled ? 'var(--text-muted)' : 'var(--danger)', marginTop: '2px', fontWeight: 600 }}>
                                {it.notes}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>
                            {it.quantity}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-muted)' }}>
                            {it.price.toLocaleString('vi-VN')} đ
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: isCancelled ? 'var(--text-muted)' : 'var(--primary)', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                            {(it.price * it.quantity).toLocaleString('vi-VN')} đ
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            {isCancelled ? (
                              <span style={{ fontSize: '0.7rem', fontWeight: 800, backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--danger-border)' }}>
                                ĐÃ HỦY
                              </span>
                            ) : isServed ? (
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: 'var(--success-bg)', color: 'var(--success)', padding: '2px 6px', borderRadius: '4px' }}>
                                Đã ra món
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: 'var(--warning-bg)', color: 'var(--warning)', padding: '2px 6px', borderRadius: '4px' }}>
                                Đang xử lý
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            {canCancel ? (
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                style={{ padding: '3px 8px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => handleCancelItem(selectedOrder, it)}
                                title="Hủy món này khỏi đơn"
                              >
                                <Ban size={12} /> Hủy món
                              </button>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Summary & Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Hình thức thanh toán: <strong>{selectedOrder.payment_method || 'Tiền mặt'}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginRight: '8px' }}>Tổng tiền thực tế:</span>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--primary)', fontFeatureSettings: "'tnum' 1" }}>
                    {selectedOrder.total_amount.toLocaleString('vi-VN')} đ
                  </strong>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedOrderIdForDetails(null)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ChainOrdersManagement;
