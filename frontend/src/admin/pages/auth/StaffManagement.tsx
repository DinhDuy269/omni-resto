import React, { useState } from 'react';
import { Plus, Search, Shield, CheckCircle, UserX, Crown, Users, UserCheck, ShieldCheck, UtensilsCrossed } from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../../shared/components/Modal';
import type { RoleType, UserStatus } from '../../../shared/types/admin';

const ROLE_MAP: Record<string, { label: string; bg: string; color: string; isMaster?: boolean }> = {
  admin: { label: 'Admin Chuỗi (Quyền cao nhất)', bg: 'var(--primary-light)', color: 'var(--primary)', isMaster: true },
  store_manager: { label: 'Quản Lý Cửa Hàng', bg: 'var(--purple-bg)', color: 'var(--purple)' },
  cashier: { label: 'Thu Ngân Quầy', bg: 'var(--info-bg)', color: 'var(--info)' },
  waiter: { label: 'Phục Vụ / Order Bàn', bg: 'var(--success-bg)', color: 'var(--success)' },
  chef: { label: 'Bếp / Bar Chế Biến', bg: 'var(--warning-bg)', color: 'var(--warning)' },
};

export const StaffManagement: React.FC = () => {
  const { staff_list, addStaff, toggleStaffStatus } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'store_manager' as RoleType,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop',
  });

  const filteredStaff = staff_list.filter((usr) => {
    const name = usr.full_name;
    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      usr.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      usr.phone.includes(searchQuery);
    const matchesRole = roleFilter === 'ALL' || usr.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const activeStaffCount = staff_list.filter((s) => s.status === 'active').length;
  const managementCount = staff_list.filter((s) => s.role === 'admin' || s.role === 'store_manager' || s.role === 'cashier').length;
  const floorStaffCount = staff_list.filter((s) => s.role === 'waiter' || s.role === 'chef').length;

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmitNewStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email) return;

    setSubmitting(true);
    setFormError('');
    try {
      await addStaff({
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        status: 'active',
        avatar: formData.avatar,
      });

      setIsModalOpen(false);
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        role: 'store_manager',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop',
      });
    } catch (err: any) {
      setFormError(err.error_description || err.message || 'Không thể tạo tài khoản nhân sự.');
    } finally {
      setSubmitting(false);
    }
  };

  const savedStaffStr = localStorage.getItem('staff_user');
  let currentStaff: { role?: string; full_name?: string } | null = null;
  try {
    currentStaff = savedStaffStr ? JSON.parse(savedStaffStr) : null;
  } catch {}
  const isSuperAdmin = currentStaff?.role?.toLowerCase() === 'admin';

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={26} color="var(--primary)" />
            Quản Lý Nhân Sự & Phân Quyền Vị Trí
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Kiểm soát quyền truy cập RBAC, ca trực và tài khoản vận hành trên toàn bộ chi nhánh OmniResto.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          <span>Cấp Tài Khoản Mới</span>
        </button>
      </div>

      {/* Executive KPI Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tổng Nhân Viên</div>
            <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>
              {staff_list.length} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>nhân sự</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Đang Hoạt Động</div>
            <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--success)', fontVariantNumeric: 'tabular-nums' }}>
              {activeStaffCount} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>sẵn sàng</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(139, 92, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple)' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Quản Trị & Thu Ngân</div>
            <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--purple)', fontVariantNumeric: 'tabular-nums' }}>
              {managementCount} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>tài khoản</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
            <UtensilsCrossed size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Phục Vụ & Bếp KDS</div>
            <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--warning)', fontVariantNumeric: 'tabular-nums' }}>
              {floorStaffCount} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>vận hành</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ width: '380px' }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            className="search-input"
            placeholder="Tìm theo tên, email, sdt nhân viên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)' }}>Lọc vị trí:</span>
          <select
            className="form-select"
            style={{ width: '230px' }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="ALL">Tất cả vị trí</option>
            <option value="admin">Admin / Chủ Chuỗi (Mọi quyền)</option>
            <option value="store_manager">Quản Lý Cửa Hàng</option>
            <option value="cashier">Thu Ngân Quầy</option>
            <option value="waiter">Phục Vụ / Order Bàn</option>
            <option value="chef">Bếp / Bar Chế Biến</option>
          </select>
        </div>
      </div>

      {/* Staff Table Card - Spacious */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.925rem' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8125rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              <th style={{ padding: '18px 24px' }}>NHÂN VIÊN</th>
              <th style={{ padding: '18px 24px' }}>VỊ TRÍ & QUYỀN HẠN</th>
              <th style={{ padding: '18px 24px' }}>LIÊN HỆ</th>
              <th style={{ padding: '18px 24px' }}>TRẠNG THÁI</th>
              <th style={{ padding: '18px 24px', textAlign: 'right' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.map((usr) => {
              const roleInfo = ROLE_MAP[usr.role] || { label: usr.role, bg: '#eee', color: '#333', isMaster: false };
              const displayName = usr.full_name || 'Nhân viên';
              return (
                <tr key={usr.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}>
                  <td style={{ padding: '18px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <img
                        src={usr.avatar}
                        alt={displayName}
                        style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>
                          {displayName}
                        </strong>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          ID: {usr.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '18px 24px' }}>
                    <span
                      style={{
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.8125rem',
                        fontWeight: 800,
                        backgroundColor: roleInfo.bg,
                        color: roleInfo.color,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {roleInfo.isMaster ? <Crown size={14} /> : <Shield size={14} />} {roleInfo.label}
                    </span>
                  </td>
                  <td style={{ padding: '18px 24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <div>{usr.email}</div>
                    <div style={{ marginTop: '2px' }}>{usr.phone}</div>
                  </td>
                  <td style={{ padding: '18px 24px' }}>
                    <StatusBadge status={usr.status} />
                  </td>
                  <td style={{ padding: '18px 24px', textAlign: 'right' }}>
                    {usr.role === 'admin' ? (
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)' }}>Quyền Hệ Thống</span>
                    ) : (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          const nextStatus: UserStatus = usr.status === 'active' ? 'inactive' : 'active';
                          toggleStaffStatus(usr.id, nextStatus);
                        }}
                      >
                        {usr.status === 'active' ? <UserX size={15} /> : <CheckCircle size={15} />}
                        {usr.status === 'active' ? 'Tạm Khóa' : 'Mở Khóa'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Add Staff */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Cấp Tài Khoản Nhân Viên & Phân Vị Trí">
        <form onSubmit={handleSubmitNewStaff}>
          <div className="form-group">
            <label className="form-label">Họ Và Tên Nhân Viên*</label>
            <input
              type="text"
              className="form-input"
              placeholder="VD: Nguyễn Văn Anh"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label">Email Đăng Nhập*</label>
              <input
                type="email"
                className="form-input"
                placeholder="anh.nguyen@omniresto.vn"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Số Điện Thoại</label>
              <input
                type="text"
                className="form-input"
                placeholder="0912 xxx xxx"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label">Vị Trí Phân Quyền (Role)*</label>
              <select
                className="form-select"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as RoleType })}
              >
                {isSuperAdmin && (
                  <option value="admin">Admin / Chủ Chuỗi (Quyền cao nhất)</option>
                )}
                <option value="store_manager">Quản Lý Cửa Hàng</option>
                <option value="cashier">Thu Ngân Quầy</option>
                <option value="waiter">Phục Vụ / Order Bàn</option>
                <option value="chef">Bếp / Bar Chế Biến</option>
              </select>
            </div>
          </div>

          {formError && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '0.875rem', marginTop: '14px' }}>
              {formError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', marginTop: '28px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang tạo...' : 'Tạo Tài Khoản'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
