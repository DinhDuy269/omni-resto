import React, { useEffect, useMemo, useState } from 'react';
import { fetchCustomers, updateCustomerStatus } from '../../../shared/api/customerApi';
import type { CustomerResponse } from '../../../shared/types/customer';
import { StatCard } from '../../components/StatCard';
import { Users, Award, Sparkles, ShieldCheck, Search, Filter } from 'lucide-react';
import './customers.css';

const TIER_LABEL: Record<string, string> = {
  standard: 'Tiêu chuẩn',
  silver: 'Bạc',
  gold: 'Vàng',
  platinum: 'Bạch kim',
};

const initials = (name?: string) => {
  if (!name) return 'KH';
  return name.trim().split(/\s+/).slice(-2).map((w) => w[0]?.toUpperCase()).join('');
};

export default function CustomersPage(): React.ReactElement {
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState('all');
  const [status, setStatus] = useState('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers()
      .then(setCustomers)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const totalPoints = useMemo(
    () => customers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0),
    [customers]
  );

  const vipCount = useMemo(
    () => customers.filter((c) => c.membership_tier === 'gold' || c.membership_tier === 'platinum').length,
    [customers]
  );

  const activeCount = useMemo(
    () => customers.filter((c) => c.status === 'active').length,
    [customers]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      const fullName = c.full_name || c.fullName || '';
      const matchQuery =
        !q ||
        fullName.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.id && c.id.toLowerCase().includes(q));
      return (
        matchQuery &&
        (tier === 'all' || c.membership_tier === tier) &&
        (status === 'all' || c.status === status)
      );
    });
  }, [customers, query, tier, status]);

  const toggleStatus = async (c: CustomerResponse) => {
    const next = c.status === 'active' ? 'inactive' : 'active';
    setBusyId(c.id);
    setError('');
    try {
      const updated = await updateCustomerStatus(c.id, next);
      setCustomers((list) => list.map((x) => (x.id === c.id ? updated : x)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="cm-wrap animate-fade-in">
      {/* ── HEADER ── */}
      <header className="cm-head">
        <div>
          <h1>Hội Viên & Khách Hàng Thân Thiết ({customers.length})</h1>
          <p>
            Quản lý chương trình khách hàng thân thiết, điểm thưởng tích lũy và kiểm soát trạng thái tài khoản toàn chuỗi.
          </p>
        </div>
      </header>

      {/* ── 4 KPI STATS ── */}
      <div className="cm-stats-grid">
        <StatCard
          title="TỔNG HỘI VIÊN"
          value={customers.length}
          change="+14% tháng này"
          isPositive={true}
          icon={Users}
          iconBgColor="var(--primary-subtle)"
          iconColor="var(--primary)"
          subtitle="Tài khoản đã đăng ký"
        />
        <StatCard
          title="ĐIỂM TÍCH LŨY TOÀN CHUỖI"
          value={totalPoints.toLocaleString('vi-VN')}
          change="+8.2%"
          isPositive={true}
          icon={Award}
          iconBgColor="var(--purple-bg)"
          iconColor="var(--purple)"
          subtitle="Điểm khả dụng để đổi quà"
        />
        <StatCard
          title="HỘI VIÊN VÀNG & BẠCH KIM"
          value={vipCount}
          change={`${customers.length > 0 ? Math.round((vipCount / customers.length) * 100) : 0}% tổng khách`}
          isPositive={true}
          icon={Sparkles}
          iconBgColor="#fef3c7"
          iconColor="#b45309"
          subtitle="Phân khúc khách hàng VIP"
        />
        <StatCard
          title="TÀI KHOẢN ĐANG HOẠT ĐỘNG"
          value={`${activeCount}/${customers.length}`}
          change={`${customers.length > 0 ? Math.round((activeCount / customers.length) * 100) : 0}%`}
          isPositive={true}
          icon={ShieldCheck}
          iconBgColor="var(--success-bg)"
          iconColor="var(--success)"
          subtitle="Không bị tạm khóa"
        />
      </div>

      {/* ── BỘ LỌC TÌM KIẾM ── */}
      <div className="cm-filters">
        <div className="cm-search-wrap">
          <Search size={18} className="cm-search-icon" />
          <input
            className="cm-search"
            placeholder="Tìm theo tên, email, số điện thoại, ID hội viên..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Tìm khách hàng"
          />
        </div>

        <label className="cm-filter-label">
          <Filter size={15} color="var(--text-muted)" />
          <span>Hạng hội viên:</span>
          <select className="cm-select" value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="all">Tất cả hạng</option>
            {Object.entries(TIER_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>

        <label className="cm-filter-label">
          <span>Trạng thái:</span>
          <select className="cm-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã tạm khóa</option>
          </select>
        </label>
      </div>

      {error && (
        <div
          style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      {/* ── BẢNG DỮ LIỆU KHÁCH HÀNG ── */}
      <div className="cm-table-card">
        <table className="cm-table">
          <thead>
            <tr>
              <th>Hội Viên</th>
              <th>Hạng & Điểm Tích Lũy</th>
              <th>Thông Tin Liên Hệ</th>
              <th>Ngày Tham Gia</th>
              <th>Trạng Thái</th>
              <th style={{ textAlign: 'right' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="cm-empty">
                  Đang đồng bộ danh sách khách hàng...
                </td>
              </tr>
            )}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="cm-empty">
                  {customers.length === 0
                    ? 'Chưa có dữ liệu khách hàng nào trong hệ thống.'
                    : 'Không tìm thấy khách hàng nào phù hợp với bộ lọc.'}
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((c) => {
                const displayName = c.full_name || c.fullName || 'Khách hàng';
                return (
                  <tr key={c.id}>
                    {/* Cột 1: Hội Viên */}
                    <td>
                      <div className="cm-person">
                        <div className="cm-avatar">{initials(displayName)}</div>
                        <div>
                          <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>{displayName}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Mã: <span style={{ fontFamily: 'var(--font-mono)' }}>{c.id.slice(0, 8)}...</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Hạng & Điểm */}
                    <td>
                      <span className={`cm-tier-badge cm-tier-${c.membership_tier}`}>
                        <Sparkles size={12} />
                        {TIER_LABEL[c.membership_tier] ?? c.membership_tier}
                      </span>
                      <div
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                          color: 'var(--text-body)',
                          marginTop: '4px',
                          fontFeatureSettings: "'tnum' 1",
                        }}
                      >
                        {c.loyalty_points?.toLocaleString('vi-VN')} điểm
                      </div>
                    </td>

                    {/* Cột 3: Liên Hệ */}
                    <td>
                      <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>{c.email}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {c.phone || 'Chưa cập nhật SĐT'}
                      </div>
                    </td>

                    {/* Cột 4: Ngày Tham Gia */}
                    <td style={{ color: 'var(--text-body)', fontSize: '0.85rem' }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('vi-VN') : '—'}
                    </td>

                    {/* Cột 5: Trạng Thái */}
                    <td>
                      <span
                        className={`cm-status-badge ${c.status === 'active' ? 'cm-status-active' : 'cm-status-inactive'}`}
                      >
                        <span
                          className="pulse-dot"
                          style={{ backgroundColor: c.status === 'active' ? 'var(--success)' : '#94a3b8' }}
                        />
                        {c.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </td>

                    {/* Cột 6: Thao Tác */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="cm-action-btn"
                        disabled={busyId === c.id}
                        onClick={() => toggleStatus(c)}
                        title={c.status === 'active' ? 'Khóa tài khoản hội viên' : 'Mở khóa tài khoản'}
                      >
                        {busyId === c.id ? 'Đang lưu...' : c.status === 'active' ? 'Tạm Khóa' : 'Mở Khóa'}
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}