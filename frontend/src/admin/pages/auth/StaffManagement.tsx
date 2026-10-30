import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Shield,
  CheckCircle,
  UserX,
  Crown,
  Users,
  UserCheck,
  ShieldCheck,
  UtensilsCrossed,
  Eye,
  EyeOff,
  Sparkles,
  Copy,
  Check,
  Mail,
  Phone,
  UserPlus,
  CheckCircle2,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../../shared/components/Modal';
import type { RoleType, UserStatus, StaffUser } from '../../../shared/types/admin';

const ROLE_MAP: Record<string, { label: string; bg: string; color: string; desc: string; isMaster?: boolean }> = {
  admin: {
    label: 'Admin Chuỗi (Quyền cao nhất)',
    bg: 'var(--primary-light)',
    color: 'var(--primary)',
    desc: 'Toàn quyền cấu hình hệ thống, chuỗi chi nhánh và phân quyền',
    isMaster: true,
  },
  store_manager: {
    label: 'Quản Lý Cửa Hàng (Store Manager)',
    bg: 'var(--purple-bg)',
    color: 'var(--purple)',
    desc: 'Quản trị nhân sự, menu, bàn ăn, báo cáo doanh thu & kho',
  },
  cashier: {
    label: 'Thu Ngân Quầy (Cashier)',
    bg: 'var(--info-bg)',
    color: 'var(--info)',
    desc: 'Chốt hóa đơn, xác nhận thanh toán tiền mặt/VNPAY, đối soát ca',
  },
  waiter: {
    label: 'Phục Vụ / Order Bàn (Waiter)',
    bg: 'var(--success-bg)',
    color: 'var(--success)',
    desc: 'Mở bàn ăn, hỗ trợ khách gọi món, chuyển trạng thái phục vụ',
  },
  chef: {
    label: 'Bếp / Bar Chế Biến (Chef)',
    bg: 'var(--warning-bg)',
    color: 'var(--warning)',
    desc: 'Xem màn hình bếp KDS, cập nhật món đang nấu và đã xong',
  },
};

const AVATAR_PRESETS = [
  { label: 'Phục Vụ (Nam)', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop' },
  { label: 'Phục Vụ (Nữ)', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop' },
  { label: 'Bếp Trưởng (Nam)', url: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150&auto=format&fit=crop' },
  { label: 'Bếp / Bar (Nữ)', url: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=150&auto=format&fit=crop' },
  { label: 'Quản Lý (Nam)', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop' },
  { label: 'Quản Lý (Nữ)', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop' },
];

export const StaffManagement: React.FC = () => {
  const { staff_list, addStaff, updateStaff, deleteStaff, toggleStaffStatus } = useAdminStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // ── Modal Cấp Tài Khoản Mới ──
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // ── Modal Thành Công (Bàn giao Credentials) ──
  const [createdStaffInfo, setCreatedStaffInfo] = useState<{
    staff: any;
    password: string;
  } | null>(null);
  const [copiedInfo, setCopiedInfo] = useState(false);

  // Form State tạo mới
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'waiter' as RoleType,
    status: 'active' as UserStatus,
    avatar: AVATAR_PRESETS[0].url,
  });

  // ── Modal Chỉnh Sửa Nhân Viên ──
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'waiter' as RoleType,
    status: 'active' as UserStatus,
    avatar: AVATAR_PRESETS[0].url,
  });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // ── Modal Xác Nhận Xóa Nhân Viên ──
  const [deletingStaff, setDeletingStaff] = useState<StaffUser | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Tự động mở modal nếu có query param ?create=true (từ Thao tác nhanh)
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setIsModalOpen(true);
      searchParams.delete('create');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Lấy thông tin tài khoản đang đăng nhập
  const savedStaffStr = localStorage.getItem('staff_user') || localStorage.getItem('user');
  let currentStaff: { id?: string; userId?: string; role?: string; full_name?: string } | null = null;
  try {
    currentStaff = savedStaffStr ? JSON.parse(savedStaffStr) : null;
  } catch {}
  const currentUserId = currentStaff?.id || currentStaff?.userId || '';
  const isSuperAdmin = currentStaff?.role?.toLowerCase() === 'admin';

  // Lọc danh sách nhân viên
  const filteredStaff = staff_list.filter((usr) => {
    const name = usr.full_name || '';
    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (usr.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (usr.phone || '').includes(searchQuery);
    const matchesRole = roleFilter === 'ALL' || usr.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const activeStaffCount = staff_list.filter((s) => s.status === 'active').length;
  const managementCount = staff_list.filter((s) => s.role === 'admin' || s.role === 'store_manager' || s.role === 'cashier').length;
  const floorStaffCount = staff_list.filter((s) => s.role === 'waiter' || s.role === 'chef').length;

  // Sinh mật khẩu ngẫu nhiên mạnh
  const handleGeneratePassword = (target: 'create' | 'edit') => {
    const prefixes = ['Resto', 'Omni', 'Staff', 'Chef'];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const n = Math.floor(1000 + Math.random() * 9000);
    const symbols = ['@', '#', '$', '!'];
    const s = symbols[Math.floor(Math.random() * symbols.length)];
    const genPass = `${p}${s}${n}`;
    if (target === 'create') {
      setFormData((prev) => ({ ...prev, password: genPass }));
    } else {
      setEditFormData((prev) => ({ ...prev, password: genPass }));
    }
  };

  // Mở modal sửa nhân viên
  const handleOpenEdit = (staff: StaffUser) => {
    setEditingStaff(staff);
    setEditError('');
    setShowEditPassword(false);
    setEditFormData({
      full_name: staff.full_name || '',
      email: staff.email || '',
      phone: staff.phone || '',
      password: '', // để trống nếu không đổi
      role: staff.role,
      status: staff.status,
      avatar: staff.avatar || AVATAR_PRESETS[0].url,
    });
  };

  // Xử lý cập nhật thông tin nhân viên
  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setEditError('');

    const cleanName = editFormData.full_name.trim();
    const cleanEmail = editFormData.email.trim().toLowerCase();
    const cleanPhone = editFormData.phone.trim();
    const newPass = editFormData.password.trim();

    if (!cleanName) {
      setEditError('Họ và tên nhân viên không được để trống!');
      return;
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setEditError('Email không đúng định dạng!');
      return;
    }

    if (cleanPhone && !/^(0|\+84)[35789]\d{8}$/.test(cleanPhone)) {
      setEditError('Số điện thoại không đúng định dạng Việt Nam!');
      return;
    }

    if (newPass && newPass.length < 6) {
      setEditError('Mật khẩu mới cần tối thiểu 6 ký tự!');
      return;
    }

    setEditSubmitting(true);
    try {
      await updateStaff(editingStaff.id, {
        full_name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        role: editFormData.role,
        status: editFormData.status,
        avatar: editFormData.avatar,
        password: newPass || undefined,
      });

      setEditingStaff(null);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        err?.error_description ||
        'Không thể cập nhật nhân viên. Vui lòng kiểm tra lại!';
      setEditError(msg);
    } finally {
      setEditSubmitting(false);
    }
  };

  // Xử lý xóa nhân viên
  const handleConfirmDelete = async () => {
    if (!deletingStaff) return;
    setDeleteError('');
    setDeleteSubmitting(true);
    try {
      await deleteStaff(deletingStaff.id);
      setDeletingStaff(null);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        err?.error_description ||
        'Không thể xóa nhân viên này. Vui lòng thử lại sau!';
      setDeleteError(msg);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Xử lý tạo nhân viên mới
  const handleSubmitNewStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = formData.full_name.trim();
    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanPhone = formData.phone.trim();
    const rawPass = formData.password.trim();
    const finalPassword = rawPass || '123456';

    if (!cleanName) {
      setFormError('Vui lòng nhập họ và tên nhân viên!');
      return;
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFormError('Email đăng nhập không đúng định dạng!');
      return;
    }

    if (cleanPhone && !/^(0|\+84)[35789]\d{8}$/.test(cleanPhone)) {
      setFormError('Số điện thoại không đúng định dạng Việt Nam (VD: 0912345678)!');
      return;
    }

    if (rawPass && rawPass.length < 6) {
      setFormError('Mật khẩu khởi tạo cần tối thiểu 6 ký tự!');
      return;
    }

    setSubmitting(true);
    try {
      const created = await addStaff({
        full_name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        role: formData.role,
        status: formData.status,
        avatar: formData.avatar,
        password: finalPassword,
      });

      setIsModalOpen(false);
      setCreatedStaffInfo({
        staff: created,
        password: finalPassword,
      });

      setFormData({
        full_name: '',
        email: '',
        phone: '',
        password: '',
        role: 'waiter',
        status: 'active',
        avatar: AVATAR_PRESETS[0].url,
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        err?.error_description ||
        'Không thể tạo tài khoản nhân viên. Vui lòng kiểm tra lại!';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Sao chép thông tin tài khoản gửi cho nhân sự
  const handleCopyCredentials = () => {
    if (!createdStaffInfo) return;
    const loginUrl = window.location.origin + '/auth';
    const roleLabel = ROLE_MAP[createdStaffInfo.staff.role]?.label || createdStaffInfo.staff.role;

    const textToCopy = `════════════════════════════════════════
🍽️ THÔNG TIN TÀI KHOẢN NHÂN VIÊN OMNIRESTO
════════════════════════════════════════
Họ và tên: ${createdStaffInfo.staff.full_name}
Vị trí: ${roleLabel}
Email đăng nhập: ${createdStaffInfo.staff.email}
Số điện thoại: ${createdStaffInfo.staff.phone || 'Chưa cập nhật'}
Mật khẩu khởi tạo: ${createdStaffInfo.password}
Cổng đăng nhập: ${loginUrl}
────────────────────────────────────────
(*) Lưu ý: Vui lòng đăng nhập và đổi mật khẩu để bảo mật tài khoản.
════════════════════════════════════════`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedInfo(true);
    setTimeout(() => setCopiedInfo(false), 2500);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── TOP HEADER ── */}
      <div className="adm-page-header">
        <div>
          <div className="adm-header-badge-row">
            <span className="adm-badge-category">
              <ShieldCheck size={13} /> QUẢN TRỊ NHÂN SỰ & PHÂN QUYỀN RBAC
            </span>
          </div>
          <h1 className="adm-page-title">Quản Lý Nhân Sự & Phân Quyền Vị Trí</h1>
          <p className="adm-page-subtitle">
            Cấp mới, chỉnh sửa thông tin, phân quyền chức vụ và quản lý trạng thái tài khoản nhân viên toàn chuỗi
          </p>
        </div>

        <div className="adm-header-actions">
          <button
            type="button"
            className="adm-btn-primary"
            onClick={() => {
              setFormError('');
              setIsModalOpen(true);
            }}
          >
            <UserPlus size={18} strokeWidth={2.5} />
            <span>Cấp Tài Khoản Mới</span>
          </button>
        </div>
      </div>

      {/* ── 4 KPI STATS METRIC CARDS ── */}
      <div className="adm-stats-grid">
        <div className="adm-stat-card">
          <div className="adm-stat-header">
            <span className="adm-stat-label">Tổng nhân viên</span>
            <div className="adm-stat-icon icon-blue">
              <Users size={20} />
            </div>
          </div>
          <div className="adm-stat-value">{staff_list.length}</div>
          <div className="adm-stat-footer">
            <span>Toàn hệ thống chi nhánh</span>
            <span className="adm-stat-pill pill-neutral">Nhân sự</span>
          </div>
        </div>

        <div className="adm-stat-card">
          <div className="adm-stat-header">
            <span className="adm-stat-label">Đang hoạt động</span>
            <div className="adm-stat-icon icon-emerald">
              <UserCheck size={20} />
            </div>
          </div>
          <div className="adm-stat-value" style={{ color: '#059669' }}>
            {activeStaffCount}
          </div>
          <div className="adm-stat-footer">
            <span>Tài khoản sẵn sàng vào ca</span>
            <span className="adm-stat-pill pill-success">Đang làm việc</span>
          </div>
        </div>

        <div className="adm-stat-card">
          <div className="adm-stat-header">
            <span className="adm-stat-label">Quản trị & Thu ngân</span>
            <div className="adm-stat-icon icon-purple">
              <ShieldCheck size={20} />
            </div>
          </div>
          <div className="adm-stat-value" style={{ color: '#7c3aed' }}>
            {managementCount}
          </div>
          <div className="adm-stat-footer">
            <span>Admin, Store Manager & Thu ngân</span>
            <span className="adm-stat-pill pill-purple">Quản lý</span>
          </div>
        </div>

        <div className="adm-stat-card">
          <div className="adm-stat-header">
            <span className="adm-stat-label">Phục vụ & Bếp KDS</span>
            <div className="adm-stat-icon icon-amber">
              <UtensilsCrossed size={20} />
            </div>
          </div>
          <div className="adm-stat-value" style={{ color: '#d97706' }}>
            {floorStaffCount}
          </div>
          <div className="adm-stat-footer">
            <span>Đội ngũ vận hành trực tiếp</span>
            <span className="adm-stat-pill pill-warning">Vận hành</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="adm-filter-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
        <div className="adm-search-box" style={{ width: '380px' }}>
          <Search size={16} className="adm-search-icon" />
          <input
            type="text"
            className="adm-search-input"
            placeholder="Tìm theo tên, email, sdt nhân viên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Lọc vị trí:</span>
          <select
            className="adm-select-control"
            style={{ width: '250px' }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="ALL">Tất cả vị trí ({staff_list.length})</option>
            <option value="admin">Admin / Chủ Chuỗi</option>
            <option value="store_manager">Quản Lý Cửa Hàng</option>
            <option value="cashier">Thu Ngân Quầy</option>
            <option value="waiter">Phục Vụ / Order Bàn</option>
            <option value="chef">Bếp / Bar Chế Biến</option>
          </select>
        </div>
      </div>

      {/* Staff Table Card */}
      <div className="adm-table-card">
        <table className="adm-data-table">
          <thead>
            <tr
              style={{
                backgroundColor: 'var(--bg-app)',
                borderBottom: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                fontSize: '0.8125rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
              }}
            >
              <th style={{ padding: '18px 24px' }}>NHÂN VIÊN</th>
              <th style={{ padding: '18px 24px' }}>VỊ TRÍ & QUYỀN HẠN</th>
              <th style={{ padding: '18px 24px' }}>LIÊN HỆ</th>
              <th style={{ padding: '18px 24px' }}>TRẠNG THÁI</th>
              <th style={{ padding: '18px 24px', textAlign: 'right' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                  <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>Không tìm thấy nhân viên nào phù hợp</p>
                  <p style={{ fontSize: '0.825rem' }}>Hãy thử thay đổi từ khóa tìm kiếm hoặc lọc theo vị trí khác.</p>
                </td>
              </tr>
            ) : (
              filteredStaff.map((usr) => {
                const roleInfo = ROLE_MAP[usr.role] || {
                  label: usr.role,
                  bg: '#eee',
                  color: '#333',
                  desc: '',
                  isMaster: false,
                };
                const displayName = usr.full_name || 'Nhân viên';
                const isSelf = Boolean(currentUserId && usr.id === currentUserId);
                const isAdminAccount = usr.role === 'admin';

                return (
                  <tr key={usr.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}>
                    <td style={{ padding: '18px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <img
                          src={usr.avatar || AVATAR_PRESETS[0].url}
                          alt={displayName}
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1px solid var(--border-color)',
                          }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>{displayName}</strong>
                            {isSelf && (
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#dbeafe',
                                  color: '#1d4ed8',
                                  fontWeight: 700,
                                }}
                              >
                                Bạn
                              </span>
                            )}
                          </div>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)', fontWeight: 600 }}>
                        <Mail size={13} color="var(--text-muted)" />
                        <span>{usr.email}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <Phone size={13} color="var(--text-muted)" />
                        <span>{usr.phone || 'Chưa cập nhật SĐT'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '18px 24px' }}>
                      <StatusBadge status={usr.status} />
                    </td>
                    <td style={{ padding: '18px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        {/* Nút Sửa Thông Tin */}
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEdit(usr)}
                          title="Sửa thông tin & đổi mật khẩu"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          <Pencil size={14} />
                          <span>Sửa</span>
                        </button>

                        {/* Nút Khóa / Mở Khóa */}
                        {!isAdminAccount && !isSelf && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              const nextStatus: UserStatus = usr.status === 'active' ? 'inactive' : 'active';
                              toggleStaffStatus(usr.id, nextStatus);
                            }}
                            title={usr.status === 'active' ? 'Tạm khóa tài khoản' : 'Kích hoạt lại'}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                          >
                            {usr.status === 'active' ? <UserX size={14} /> : <CheckCircle size={14} />}
                            <span>{usr.status === 'active' ? 'Khóa' : 'Mở'}</span>
                          </button>
                        )}

                        {/* Nút Xóa */}
                        {!isAdminAccount && !isSelf && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setDeleteError('');
                              setDeletingStaff(usr);
                            }}
                            title="Xóa tài khoản nhân viên"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              color: '#dc2626',
                              borderColor: '#fecaca',
                              backgroundColor: '#fef2f2',
                            }}
                          >
                            <Trash2 size={14} />
                            <span>Xóa</span>
                          </button>
                        )}

                        {isAdminAccount && (
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', padding: '4px 8px' }}>
                            Chủ Chuỗi
                          </span>
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

      {/* ── MODAL 1: CẤP TÀI KHOẢN MỚI ── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Cấp Tài Khoản Nhân Viên & Phân Vị Trí">
        <form onSubmit={handleSubmitNewStaff} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem' }}>
              Họ Và Tên Nhân Viên*
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="VD: Nguyễn Văn Anh"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                Email Đăng Nhập*
              </label>
              <input
                type="email"
                className="form-input"
                placeholder="anh.nguyen@omniresto.vn"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                Số Điện Thoại Liên Hệ
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="0912 345 678"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          {/* Chọn Vị Trí (Role) */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem' }}>
              Vị Trí Phân Quyền (RBAC Role)*
            </label>
            <select
              className="form-select"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as RoleType })}
              style={{ fontWeight: 600 }}
            >
              {isSuperAdmin && <option value="admin">👑 Admin / Chủ Chuỗi (Quyền Tối Cao)</option>}
              <option value="store_manager">👔 Quản Lý Cửa Hàng (Store Manager)</option>
              <option value="cashier">💵 Thu Ngân Quầy (Cashier)</option>
              <option value="waiter">🍽️ Phục Vụ / Order Bàn (Waiter)</option>
              <option value="chef">👨‍🍳 Bếp / Bar Chế Biến (Chef)</option>
            </select>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              ℹ️ {ROLE_MAP[formData.role]?.desc}
            </p>
          </div>

          {/* Mật Khẩu Khởi Tạo */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 0 }}>
                Mật Khẩu Khởi Tạo
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleGeneratePassword('create')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0,
                  }}
                >
                  <Sparkles size={13} />
                  <span>Tạo mật khẩu mạnh</span>
                </button>
                <span style={{ color: 'var(--border-color)' }}>|</span>
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, password: '123456' }))}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Mặc định (123456)
                </button>
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Để trống sẽ mặc định là 123456"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Nhân viên có thể đăng nhập bằng email và mật khẩu này, sau đó tự đổi lại mật khẩu.
            </p>
          </div>

          {/* Chọn Avatar Mẫu */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '8px' }}>
              Ảnh Đại Diện Nhân Viên
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
              <img
                src={formData.avatar}
                alt="Selected Avatar"
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--primary)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Chọn nhanh avatar mẫu theo vị trí:
                </span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {AVATAR_PRESETS.map((av, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData({ ...formData, avatar: av.url })}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: formData.avatar === av.url ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                        backgroundColor: formData.avatar === av.url ? 'var(--primary-subtle)' : 'var(--bg-card)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: formData.avatar === av.url ? 'var(--primary)' : 'var(--text-main)',
                      }}
                    >
                      {av.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Trạng Thái Kích Hoạt */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem' }}>
              Trạng Thái Tài Khoản*
            </label>
            <select
              className="form-select"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
            >
              <option value="active">🟢 Đang hoạt động (Đăng nhập ngay)</option>
              <option value="inactive">🔴 Tạm khóa (Chưa cho phép vào ca)</option>
            </select>
          </div>

          {formError && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--danger-bg)',
                border: '1px solid #fca5a5',
                color: 'var(--danger)',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              {formError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
              style={{ fontWeight: 700 }}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <UserPlus size={16} />
              <span>{submitting ? 'Đang cấp tài khoản...' : 'Xác Nhận Tạo Tài Khoản'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL 2: CHỈNH SỬA THÔNG TIN NHÂN VIÊN ── */}
      {editingStaff && (
        <Modal
          isOpen={Boolean(editingStaff)}
          onClose={() => setEditingStaff(null)}
          title={`Chỉnh Sửa Nhân Viên: ${editingStaff.full_name}`}
        >
          <form onSubmit={handleUpdateStaff} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                Họ Và Tên Nhân Viên*
              </label>
              <input
                type="text"
                className="form-input"
                required
                value={editFormData.full_name}
                onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                  Email Đăng Nhập*
                </label>
                <input
                  type="email"
                  className="form-input"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                  Số Điện Thoại
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                />
              </div>
            </div>

            {/* Vị trí phân quyền */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                Vị Trí Phân Quyền (RBAC Role)*
              </label>
              <select
                className="form-select"
                value={editFormData.role}
                onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as RoleType })}
                style={{ fontWeight: 600 }}
              >
                {isSuperAdmin && <option value="admin">👑 Admin / Chủ Chuỗi (Quyền Tối Cao)</option>}
                <option value="store_manager">👔 Quản Lý Cửa Hàng (Store Manager)</option>
                <option value="cashier">💵 Thu Ngân Quầy (Cashier)</option>
                <option value="waiter">🍽️ Phục Vụ / Order Bàn (Waiter)</option>
                <option value="chef">👨‍🍳 Bếp / Bar Chế Biến (Chef)</option>
              </select>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                ℹ️ {ROLE_MAP[editFormData.role]?.desc}
              </p>
            </div>

            {/* Đổi Mật Khẩu Mới (Tùy chọn) */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 0 }}>
                  Đổi Mật Khẩu Mới (Để trống nếu giữ nguyên)
                </label>
                <button
                  type="button"
                  onClick={() => handleGeneratePassword('edit')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0,
                  }}
                >
                  <Sparkles size={13} />
                  <span>Tạo mật khẩu mới</span>
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type={showEditPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Nhập mật khẩu mới (nếu muốn đặt lại)"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                  }}
                >
                  {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Chọn Avatar */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '8px' }}>
                Ảnh Đại Diện
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <img
                  src={editFormData.avatar}
                  alt="Avatar"
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid var(--primary)',
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {AVATAR_PRESETS.map((av, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, avatar: av.url })}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: editFormData.avatar === av.url ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                          backgroundColor: editFormData.avatar === av.url ? 'var(--primary-subtle)' : 'var(--bg-card)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          color: editFormData.avatar === av.url ? 'var(--primary)' : 'var(--text-main)',
                        }}
                      >
                        {av.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Trạng Thái */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                Trạng Thái Hoạt Động*
              </label>
              <select
                className="form-select"
                value={editFormData.status}
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as UserStatus })}
              >
                <option value="active">🟢 Đang hoạt động</option>
                <option value="inactive">🔴 Tạm khóa tài khoản</option>
              </select>
            </div>

            {editError && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--danger-bg)',
                  border: '1px solid #fca5a5',
                  color: 'var(--danger)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                {editError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditingStaff(null)}
                disabled={editSubmitting}
                style={{ fontWeight: 700 }}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={editSubmitting}
                style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Check size={16} />
                <span>{editSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL 3: XÁC NHẬN XÓA NHÂN VIÊN ── */}
      {deletingStaff && (
        <Modal
          isOpen={Boolean(deletingStaff)}
          onClose={() => setDeletingStaff(null)}
          title="Xác Nhận Xóa Nhân Viên"
        >
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                border: '2px solid #fecaca',
              }}
            >
              <AlertTriangle size={36} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
              Xóa Vĩnh Viễn Tài Khoản Nhân Viên?
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6, marginBottom: '20px' }}>
              Bạn có chắc chắn muốn xóa nhân sự <strong>{deletingStaff.full_name}</strong> khỏi hệ thống? Thao tác này sẽ xóa vĩnh viễn và không thể khôi phục lại dữ liệu đăng nhập.
            </p>

            {/* Thông tin nhân sự bị xóa */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '16px',
                textAlign: 'left',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <img
                src={deletingStaff.avatar || AVATAR_PRESETS[0].url}
                alt={deletingStaff.full_name}
                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{deletingStaff.full_name}</strong>
                <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '2px' }}>
                  {deletingStaff.email} • ID: {deletingStaff.id}
                </div>
                <div style={{ marginTop: '4px' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: ROLE_MAP[deletingStaff.role]?.bg || '#eee',
                      color: ROLE_MAP[deletingStaff.role]?.color || '#333',
                    }}
                  >
                    {ROLE_MAP[deletingStaff.role]?.label || deletingStaff.role}
                  </span>
                </div>
              </div>
            </div>

            {deleteError && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--danger-bg)',
                  border: '1px solid #fca5a5',
                  color: 'var(--danger)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  marginBottom: '16px',
                  textAlign: 'left',
                }}
              >
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeletingStaff(null)}
                disabled={deleteSubmitting}
                style={{ fontWeight: 700 }}
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteSubmitting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: deleteSubmitting ? 'not-allowed' : 'pointer',
                  opacity: deleteSubmitting ? 0.7 : 1,
                }}
              >
                <Trash2 size={16} />
                <span>{deleteSubmitting ? 'Đang xóa...' : 'Xác Nhận Xóa'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL 4: THÔNG BÁO TẠO THÀNH CÔNG & SAO CHÉP THÔNG TIN ── */}
      {createdStaffInfo && (
        <Modal
          isOpen={Boolean(createdStaffInfo)}
          onClose={() => setCreatedStaffInfo(null)}
          title="Cấp Tài Khoản Nhân Viên Thành Công"
        >
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                border: '2px solid #a7f3d0',
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
              Đã Tạo Tài Khoản Nhân Viên Mới!
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '22px' }}>
              Tài khoản đã sẵn sàng hoạt động trên toàn hệ thống nhà hàng OmniResto.
            </p>

            {/* Thẻ thông tin tài khoản */}
            <div
              style={{
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'left',
                marginBottom: '22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
                <img
                  src={createdStaffInfo.staff.avatar || AVATAR_PRESETS[0].url}
                  alt={createdStaffInfo.staff.full_name}
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>
                    {createdStaffInfo.staff.full_name}
                  </strong>
                  <div style={{ marginTop: '4px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        backgroundColor: ROLE_MAP[createdStaffInfo.staff.role]?.bg || '#eee',
                        color: ROLE_MAP[createdStaffInfo.staff.role]?.color || '#333',
                      }}
                    >
                      {ROLE_MAP[createdStaffInfo.staff.role]?.label || createdStaffInfo.staff.role}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Mã nhân sự:</span>
                <strong style={{ color: 'var(--text-main)' }}>{createdStaffInfo.staff.id}</strong>

                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Email đăng nhập:</span>
                <strong style={{ color: 'var(--text-main)' }}>{createdStaffInfo.staff.email}</strong>

                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Số điện thoại:</span>
                <strong style={{ color: 'var(--text-main)' }}>{createdStaffInfo.staff.phone || '(Chưa cập nhật)'}</strong>

                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Mật khẩu khởi tạo:</span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    color: 'var(--primary)',
                    backgroundColor: 'var(--primary-subtle)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    display: 'inline-block',
                    width: 'fit-content',
                  }}
                >
                  {createdStaffInfo.password}
                </span>

                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Cổng đăng nhập:</span>
                <span style={{ color: 'var(--info)', fontWeight: 600, wordBreak: 'break-all' }}>
                  {window.location.origin}/auth
                </span>
              </div>
            </div>

            {/* Các nút hành động */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCopyCredentials}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 700,
                  backgroundColor: copiedInfo ? '#059669' : 'var(--primary)',
                }}
              >
                {copiedInfo ? <Check size={16} /> : <Copy size={16} />}
                <span>{copiedInfo ? 'Đã Sao Chép Thành Công!' : 'Sao Chép Thông Tin Gửi Nhân Viên'}</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCreatedStaffInfo(null)}
                style={{ fontWeight: 700 }}
              >
                Hoàn Tất
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
