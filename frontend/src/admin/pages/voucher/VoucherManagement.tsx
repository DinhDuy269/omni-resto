import React, { useState } from 'react';
import { Search, Plus, Ticket, Sparkles, CheckCircle2, PauseCircle, Clock } from 'lucide-react';
import { VoucherCard } from './components/VoucherCard';
import { useVoucher } from './hooks/useVoucher';
import { voucherApi } from '../../../shared/api/voucherApi';
import { useAdminStore } from '../../store/adminStore';
import { Modal } from '../../../shared/components/Modal';
import type { VoucherInfo, VoucherStatus, DiscountType } from '../../../shared/types/admin';

export const VoucherManagement: React.FC = () => {
  const {
    vouchers,
    summaryCount,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    toggleVoucherStatus,
  } = useVoucher();

  const { vouchers: allVouchers, setVouchers } = useAdminStore();

  // Modals state giống TableManagement
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<VoucherInfo | null>(null);

  // Form State
  const initialForm = {
    code: '',
    name: '',
    description: '',
    discount_type: 'fixed_amount' as DiscountType,
    discount_value: 0,
    max_discount_amount: 0,
    min_order_amount: 0,
    total_quantity: 100,
    usage_limit_per_user: 1,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    status: 'active' as VoucherStatus,
  };

  const [voucherForm, setVoucherForm] = useState(initialForm);

  // Mở modal thêm mới
  const handleOpenAddModal = () => {
    setVoucherForm(initialForm);
    setIsAddModalOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEditModal = (v: VoucherInfo) => {
    setEditingVoucher(v);
    setVoucherForm({
      code: v.code,
      name: v.name,
      description: v.description || '',
      discount_type: v.discount_type,
      discount_value: v.discount_value,
      max_discount_amount: v.max_discount_amount || 0,
      min_order_amount: v.min_order_amount,
      total_quantity: v.total_quantity,
      usage_limit_per_user: v.usage_limit_per_user,
      start_date: v.start_date ? v.start_date.slice(0, 10) : '',
      end_date: v.end_date ? v.end_date.slice(0, 10) : '',
      status: v.status,
    });
  };

  // Xử lý tạo mới voucher
  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherForm.code.trim() || !voucherForm.name.trim()) return;

    try {
      // Đảm bảo định dạng chuẩn ISO LocalDateTime (YYYY-MM-DDTHH:mm:ss)
      const formattedStartDate = voucherForm.start_date.includes('T')
        ? voucherForm.start_date
        : `${voucherForm.start_date}T00:00:00`;

      const formattedEndDate = voucherForm.end_date.includes('T')
        ? voucherForm.end_date
        : `${voucherForm.end_date}T23:59:59`;

      const payload: Partial<VoucherInfo> = {
        ...voucherForm,
        code: voucherForm.code.trim().toUpperCase(),
        discount_value: Number(voucherForm.discount_value),
        max_discount_amount:
          voucherForm.discount_type === 'percentage' && Number(voucherForm.max_discount_amount) > 0
            ? Number(voucherForm.max_discount_amount)
            : undefined,
        min_order_amount: Number(voucherForm.min_order_amount) || 0,
        total_quantity: Number(voucherForm.total_quantity) || 0,
        usage_limit_per_user: Number(voucherForm.usage_limit_per_user) || 1,
        start_date: formattedStartDate,
        end_date: formattedEndDate,
      };

      const created = await voucherApi.createVoucher(payload);
      setVouchers([created, ...allVouchers]);
      setIsAddModalOpen(false);
    } catch (err: any) {
      // Hiển thị chi tiết lỗi backend trả về (nếu có) thay vì alert chung chung
      alert(err.response?.data?.message || err.message || 'Lỗi khi tạo khuyến mãi!');
    }
  };

  // Xử lý lưu chỉnh sửa voucher
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVoucher || !voucherForm.code.trim()) return;

    try {
      const payload: Partial<VoucherInfo> = {
        ...voucherForm,
        code: voucherForm.code.trim().toUpperCase(),
        discount_value: Number(voucherForm.discount_value),
        max_discount_amount:
          voucherForm.discount_type === 'percentage' && Number(voucherForm.max_discount_amount) > 0
            ? Number(voucherForm.max_discount_amount)
            : undefined,
        min_order_amount: Number(voucherForm.min_order_amount) || 0,
        total_quantity: Number(voucherForm.total_quantity) || 0,
        usage_limit_per_user: Number(voucherForm.usage_limit_per_user) || 1,
      };

      const updated = await voucherApi.updateVoucher(editingVoucher.id, payload);
      setVouchers(allVouchers.map((v) => (v.id === editingVoucher.id ? updated : v)));
      setEditingVoucher(null);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cập nhật khuyến mãi!');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Page Action Header Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Ticket size={24} color="var(--primary)" />
            Quản Lý Khuyến Mãi & Voucher
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Thiết lập mã giảm giá, kiểm soát lượt sử dụng và kích cầu doanh số
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ width: '280px', display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-app)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <Search size={16} color="var(--text-muted)" style={{ marginRight: '8px' }} />
            <input
              type="text"
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.875rem' }}
              placeholder="Tìm theo mã code hoặc tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={16} />
            <span>Thêm Khuyến Mãi</span>
          </button>
        </div>
      </div>

      {/* Executive KPI Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tất Cả Voucher</div>
            <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>
              {summaryCount.all} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>chương trình</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Đang Hoạt Động</div>
            <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--success)', fontVariantNumeric: 'tabular-nums' }}>
              {summaryCount.active} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>hiệu lực</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
            <PauseCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tạm Dừng</div>
            <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--warning)', fontVariantNumeric: 'tabular-nums' }}>
              {summaryCount.inactive} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>chiến dịch</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Đã Hết Hạn</div>
            <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>
              {summaryCount.expired} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>chiến dịch</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Filter Tabs */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${filterStatus === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterStatus('all')}
          >
            Tất Cả ({summaryCount.all})
          </button>
          <button
            className={`btn btn-sm ${filterStatus === 'active' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterStatus('active')}
          >
            Đang Hoạt Động ({summaryCount.active})
          </button>
          <button
            className={`btn btn-sm ${filterStatus === 'inactive' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterStatus('inactive')}
          >
            Tạm Dừng ({summaryCount.inactive})
          </button>
          <button
            className={`btn btn-sm ${filterStatus === 'expired' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterStatus('expired')}
          >
            Đã Hết Hạn ({summaryCount.expired})
          </button>
        </div>
      </div>

      {/* Interactive Visual Voucher Grid */}
      {vouchers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <Ticket size={48} opacity={0.2} style={{ margin: '0 auto 16px' }} />
          <p>Không tìm thấy khuyến mãi nào phù hợp.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {vouchers.map((voucher) => (
            <VoucherCard
              key={voucher.id}
              voucher={voucher}
              onEdit={() => handleOpenEditModal(voucher)}
              onToggleStatus={(id, currentStatus) => {
                const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
                toggleVoucherStatus(id, newStatus);
              }}
            />
          ))}
        </div>
      )}

      {/* Modal: Thêm Khuyến Mãi Mới (Giống cấu trúc Modal TableManagement) */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Thêm Mã Khuyến Mãi Mới">
        <form onSubmit={handleSubmitAdd}>
          <div className="form-group">
            <label className="form-label">Mã Khuyến Mãi (Code)*</label>
            <input
              type="text"
              className="form-input"
              placeholder="VD: GIAM20K, CHAOBANMOI..."
              required
              value={voucherForm.code}
              onChange={(e) => setVoucherForm({ ...voucherForm, code: e.target.value.toUpperCase() })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tên Chương Trình Khuyến Mãi*</label>
            <input
              type="text"
              className="form-input"
              placeholder="VD: Giảm 20.000đ cho đơn từ 100k"
              required
              value={voucherForm.name}
              onChange={(e) => setVoucherForm({ ...voucherForm, name: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Hình Thức Giảm*</label>
              <select
                className="form-select"
                value={voucherForm.discount_type}
                onChange={(e) => setVoucherForm({ ...voucherForm, discount_type: e.target.value as DiscountType })}
              >
                <option value="fixed_amount">Giảm Tiền Mặt (VNĐ)</option>
                <option value="percentage">Giảm Theo Phần Trăm (%)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                {voucherForm.discount_type === 'percentage' ? 'Phần Trăm Giảm (%)*' : 'Mức Giảm (VNĐ)*'}
              </label>
              <input
                type="number"
                className="form-input"
                min={0}
                required
                value={voucherForm.discount_value}
                onChange={(e) => setVoucherForm({ ...voucherForm, discount_value: Number(e.target.value) })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Giảm Tối Đa (VNĐ)</label>
              <input
                type="number"
                className="form-input"
                min={0}
                disabled={voucherForm.discount_type !== 'percentage'}
                placeholder={voucherForm.discount_type !== 'percentage' ? 'Không áp dụng' : 'VD: 50000'}
                value={voucherForm.max_discount_amount}
                onChange={(e) => setVoucherForm({ ...voucherForm, max_discount_amount: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Đơn Hàng Tối Thiểu (VNĐ)</label>
              <input
                type="number"
                className="form-input"
                min={0}
                value={voucherForm.min_order_amount}
                onChange={(e) => setVoucherForm({ ...voucherForm, min_order_amount: Number(e.target.value) })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Tổng Lượt Dùng (Số lượng)*</label>
              <input
                type="number"
                className="form-input"
                min={1}
                required
                value={voucherForm.total_quantity}
                onChange={(e) => setVoucherForm({ ...voucherForm, total_quantity: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Giới Hạn Lượt/Khách*</label>
              <input
                type="number"
                className="form-input"
                min={1}
                required
                value={voucherForm.usage_limit_per_user}
                onChange={(e) => setVoucherForm({ ...voucherForm, usage_limit_per_user: Number(e.target.value) })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Ngày Bắt Đầu*</label>
              <input
                type="date"
                className="form-input"
                required
                value={voucherForm.start_date}
                onChange={(e) => setVoucherForm({ ...voucherForm, start_date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Ngày Kết Thúc*</label>
              <input
                type="date"
                className="form-input"
                required
                value={voucherForm.end_date}
                onChange={(e) => setVoucherForm({ ...voucherForm, end_date: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              Tạo Khuyến Mãi
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Chỉnh Sửa Khuyến Mãi */}
      <Modal isOpen={!!editingVoucher} onClose={() => setEditingVoucher(null)} title="Chỉnh Sửa Thông Tin Voucher">
        <form onSubmit={handleSubmitEdit}>
          <div className="form-group">
            <label className="form-label">Mã Khuyến Mãi (Code)*</label>
            <input
              type="text"
              className="form-input"
              required
              value={voucherForm.code}
              onChange={(e) => setVoucherForm({ ...voucherForm, code: e.target.value.toUpperCase() })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tên Chương Trình Khuyến Mãi*</label>
            <input
              type="text"
              className="form-input"
              required
              value={voucherForm.name}
              onChange={(e) => setVoucherForm({ ...voucherForm, name: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Hình Thức Giảm*</label>
              <select
                className="form-select"
                value={voucherForm.discount_type}
                onChange={(e) => setVoucherForm({ ...voucherForm, discount_type: e.target.value as DiscountType })}
              >
                <option value="fixed_amount">Giảm Tiền Mặt (VNĐ)</option>
                <option value="percentage">Giảm Theo Phần Trăm (%)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                {voucherForm.discount_type === 'percentage' ? 'Phần Trăm Giảm (%)*' : 'Mức Giảm (VNĐ)*'}
              </label>
              <input
                type="number"
                className="form-input"
                min={0}
                required
                value={voucherForm.discount_value}
                onChange={(e) => setVoucherForm({ ...voucherForm, discount_value: Number(e.target.value) })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Giảm Tối Đa (VNĐ)</label>
              <input
                type="number"
                className="form-input"
                min={0}
                disabled={voucherForm.discount_type !== 'percentage'}
                value={voucherForm.max_discount_amount}
                onChange={(e) => setVoucherForm({ ...voucherForm, max_discount_amount: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Đơn Hàng Tối Thiểu (VNĐ)</label>
              <input
                type="number"
                className="form-input"
                min={0}
                value={voucherForm.min_order_amount}
                onChange={(e) => setVoucherForm({ ...voucherForm, min_order_amount: Number(e.target.value) })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Tổng Lượt Dùng (Số lượng)*</label>
              <input
                type="number"
                className="form-input"
                min={1}
                required
                value={voucherForm.total_quantity}
                onChange={(e) => setVoucherForm({ ...voucherForm, total_quantity: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Giới Hạn Lượt/Khách*</label>
              <input
                type="number"
                className="form-input"
                min={1}
                required
                value={voucherForm.usage_limit_per_user}
                onChange={(e) => setVoucherForm({ ...voucherForm, usage_limit_per_user: Number(e.target.value) })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Ngày Bắt Đầu*</label>
              <input
                type="date"
                className="form-input"
                required
                value={voucherForm.start_date}
                onChange={(e) => setVoucherForm({ ...voucherForm, start_date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Ngày Kết Thúc*</label>
              <input
                type="date"
                className="form-input"
                required
                value={voucherForm.end_date}
                onChange={(e) => setVoucherForm({ ...voucherForm, end_date: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setEditingVoucher(null)}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              Lưu Thay Đổi
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VoucherManagement;