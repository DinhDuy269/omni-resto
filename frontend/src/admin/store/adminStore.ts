import { create } from 'zustand';
import { menuApi } from '../pages/menu/menuApi';
import { tableApi } from '../../shared/api/tableApi';
import { orderApi } from '../../shared/api/orderApi';
import { staffApi } from '../../shared/api/staffApi';
import { voucherApi } from '../../shared/api/voucherApi';
import { serviceRequestApi } from '../../shared/api/serviceRequestApi';
import type { MenuItem, Order, StaffUser, TableInfo, CategoryOption, OrderStatus, VoucherInfo } from '../../shared/types/admin';

export const DISH_CATEGORIES = [
  { id: 'cat-pho', name: 'Phở & Bún Nước' },
  { id: 'cat-com', name: 'Cơm Tấm & Món Mặn' },
  { id: 'cat-banhmi', name: 'Bánh Mì & Điểm Tâm' },
  { id: 'cat-lau', name: 'Lẩu & Món Nhắm' },
  { id: 'cat-drink', name: 'Đồ Uống & Tráng Miệng' },
];

export interface ServiceRequestItem {
  id: string;
  table_no: string;
  order_id?: string;
  request_text: string;
  timestamp: string;
  status: 'OPEN' | 'RESOLVED';
}

interface AdminState {
  isLoading: boolean;
  loadError: string | null;
  fetchInitialData: () => Promise<void>;

  // Data collections
  menu_items: MenuItem[];
  category_options: CategoryOption[];
  orders: Order[];
  staff_list: StaffUser[];
  tables: TableInfo[];
  service_requests: ServiceRequestItem[];
  vouchers: VoucherInfo[];

  // Bulk setters
  setMenuItems: (items: MenuItem[]) => void;
  setCategoryOptions: (options: CategoryOption[]) => void;
  setOrders: (orders: Order[]) => void;
  setStaffList: (staff: StaffUser[]) => void;
  setTables: (tables: TableInfo[]) => void;
  setVouchers: (vouchers: VoucherInfo[]) => void; // <-- Thêm Setter cho Vouchers

  // Menu
  addMenuItem: (item: Omit<MenuItem, 'id'>) => Promise<void> | void;
  updateMenuItem: (item: MenuItem) => Promise<void> | void;
  deleteMenuItem: (id: string) => Promise<void> | void;
  toggleMenuItemStatus: (id: string, status: MenuItem['status']) => Promise<void> | void;

  // Category options (size, topping)
  addCategoryOption: (option: Omit<CategoryOption, 'id'>) => void;
  updateCategoryOption: (option: CategoryOption) => void;
  toggleCategoryOptionStatus: (id: string, status: string) => void;
  deleteCategoryOption: (id: string) => void;

  // Tables
  updateTableStatus: (tableId: string, status: TableInfo['status']) => Promise<void>;
  addTable: (table: Omit<TableInfo, 'id'>) => Promise<void> | void;
  updateTable: (table: TableInfo) => Promise<void> | void;
  deleteTable: (tableId: string) => Promise<void> | void;
  regenerateTableQrToken: (tableId: string) => Promise<void> | void;
  verifyTableSession: (tableNo: string) => void;
  setTablePaymentRequested: (tableNo: string, requested: boolean) => void;
  confirmTablePayment: (tableNo: string) => void;

  // Orders
  updateOrderStatus: (id: string, status: Order['status']) => Promise<void>;
  addOrderFromClient: (order: Order) => void;
  handleWebSocketOrderEvent: (event: { eventType: string; order: Order }) => void;

  // Staff
  addStaff: (staff: Omit<StaffUser, 'id' | 'created_at'>) => Promise<StaffUser>;
  toggleStaffStatus: (id: string, status: StaffUser['status']) => Promise<void>;

  // Service requests (gọi phục vụ tại bàn)
  addServiceRequest: (req: { table_no: string; order_id?: string; request_text: string }) => void;
  resolveServiceRequest: (id: string) => void;
  resolveServiceRequestsByTable: (table_no: string) => void;
  clearAllServiceRequests: () => void;

  // Actions - Vouchers
  addVoucher: (voucher: Partial<VoucherInfo>) => Promise<VoucherInfo>;
  updateVoucher: (id: string, voucher: Partial<VoucherInfo>) => Promise<VoucherInfo>;
  deleteVoucher: (id: string) => Promise<void>;
  toggleVoucherStatus: (id: string, status: VoucherInfo['status']) => Promise<void>;
}



function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const exists = list.some((x) => x.id === item.id);
  return exists ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list];
}

export const INITIAL_VOUCHERS: VoucherInfo[] = [
  {
    id: 'vch-01',
    code: 'WELCOME100',
    name: 'Quà Tặng Thành Viên Mới',
    description: 'Giảm ngay 100.000đ cho đơn hàng đầu tiên. Tự động tặng khi khách hàng mới đăng ký tài khoản thành công.',
    discount_type: 'FIXED_AMOUNT',
    discount_value: 100000,
    min_order_amount: 0,
    total_quantity: 99999,
    used_quantity: 1250,
    usage_limit_per_user: 1,
    start_date: '2026-01-01T00:00:00',
    end_date: '2027-12-31T23:59:59',
    status: 'ACTIVE',
    is_welcome_voucher: true,
    created_at: '2026-01-01T00:00:00',
  },
  {
    id: 'vch-02',
    code: 'FREELUNCH20',
    name: 'Trưa Vui Vẻ Giảm 20%',
    description: 'Giảm 20% tổng hóa đơn, tối đa 50.000đ. Áp dụng cho các bữa trưa tại nhà hàng.',
    discount_type: 'PERCENTAGE',
    discount_value: 20,
    max_discount_amount: 50000,
    min_order_amount: 150000,
    total_quantity: 500,
    used_quantity: 498,
    usage_limit_per_user: 2,
    start_date: '2026-09-01T00:00:00',
    end_date: '2026-11-30T23:59:59',
    status: 'ACTIVE',
    is_welcome_voucher: false,
    created_at: '2026-08-25T00:00:00',
  },
  {
    id: 'vch-03',
    code: 'SUMMER2026',
    name: 'Chào Hè Rực Rỡ',
    description: 'Giảm 50.000đ phí giao hàng cho các đơn Takeaway / Delivery.',
    discount_type: 'FIXED_AMOUNT',
    discount_value: 50000,
    min_order_amount: 200000,
    total_quantity: 1000,
    used_quantity: 1000,
    usage_limit_per_user: 1,
    start_date: '2026-05-01T00:00:00',
    end_date: '2026-08-31T23:59:59',
    status: 'EXPIRED',
    is_welcome_voucher: false,
    created_at: '2026-04-15T00:00:00',
  }
];

export const useAdminStore = create<AdminState>((set, get) => ({
  // ---------- State ----------
  menu_items: [],
  category_options: [],
  orders: [],
  staff_list: [],
  tables: [],
  service_requests: [],
  vouchers: INITIAL_VOUCHERS,
  isLoading: false,
  loadError: null,

  // ---------- Tải dữ liệu từ backend ----------
  fetchInitialData: async () => {
    set({ isLoading: true, loadError: null });

    const [menu, tables, orders, staff, vouchers, serviceRequests] = await Promise.allSettled([
      menuApi.getMenuItems(),
      tableApi.getAll(),
      orderApi.getAll(),
      staffApi.getAll(),
      voucherApi.getVouchers(),
      serviceRequestApi.getActiveRequests(),
    ]);

    const failed: string[] = [];
    const patch: Partial<AdminState> = {};

    if (menu.status === 'fulfilled') {
      patch.menu_items = menu.value;
      const allOpts: CategoryOption[] = [];
      const seen = new Set<string>();
      menu.value.forEach((m) => {
        (m.options || []).forEach((opt) => {
          if (!seen.has(opt.id)) {
            seen.add(opt.id);
            allOpts.push(opt);
          }
        });
      });
      if (allOpts.length > 0) {
        patch.category_options = allOpts;
      }
    }
    else failed.push('thực đơn');

    if (tables.status === 'fulfilled') patch.tables = tables.value;
    else failed.push('bàn');

    if (orders.status === 'fulfilled') patch.orders = orders.value;
    else failed.push('đơn hàng');

    if (staff.status === 'fulfilled') patch.staff_list = staff.value;
    else failed.push('nhân sự');

    if (vouchers.status === 'fulfilled') patch.vouchers = vouchers.value;
    else failed.push('khuyến mãi');

    if (serviceRequests.status === 'fulfilled') patch.service_requests = serviceRequests.value;
    else failed.push('yêu cầu phục vụ');

    if (failed.length > 0) {
      console.error('Không tải được từ backend:', failed.join(', '));
    }

    // Nguồn nào lỗi thì giữ nguyên dữ liệu cũ, không ghi đè bằng mảng rỗng
    set({
      ...patch,
      isLoading: false,
      loadError: failed.length > 0 ? `Không tải được: ${failed.join(', ')}` : null,
    });
  },

  // ---------- Bulk setters ----------
  setMenuItems: (items) => set({ menu_items: items }),
  setCategoryOptions: (options) => set({ category_options: options }),
  setOrders: (orders) => set({ orders }),
  setStaffList: (staff) => set({ staff_list: staff }),
  setTables: (tables) => set({ tables }),
  setVouchers: (vouchers) => set({ vouchers }), // <-- Thêm Setter cho Vouchers

  // ---------- Menu ----------
  addMenuItem: async (item) => {
    const created = await menuApi.createMenuItem(item);
    set((s) => ({ menu_items: [created, ...s.menu_items] }));
  },
  updateMenuItem: async (item) => {
    const updated = await menuApi.updateMenuItem(item.id, item);
    set((s) => ({ menu_items: s.menu_items.map((m) => (m.id === item.id ? updated : m)) }));
  },
  deleteMenuItem: async (id) => {
    await menuApi.deleteMenuItem(id);
    set((s) => ({ menu_items: s.menu_items.filter((m) => m.id !== id) }));
  },
  toggleMenuItemStatus: async (id, status) => {
    const prev = get().menu_items;
    set({ menu_items: prev.map((m) => (m.id === id ? { ...m, status } : m)) });
    try {
      await menuApi.updateMenuItemStatus(id, status);
    } catch (err) {
      set({ menu_items: prev });
      throw err;
    }
  },

  // ---------- Category options ----------
  addCategoryOption: (option) => {
    const newOpt = { ...option, id: `opt-${Date.now()}` };
    set((s) => ({ category_options: [newOpt, ...s.category_options] }));
  },
  updateCategoryOption: (option) => {
    set((s) => ({ category_options: s.category_options.map((o) => (o.id === option.id ? option : o)) }));
  },
  toggleCategoryOptionStatus: (id, status) => {
    set((s) => ({ category_options: s.category_options.map((o) => (o.id === id ? { ...o, status } : o)) }));
  },
  deleteCategoryOption: (id) => {
    set((s) => ({ category_options: s.category_options.filter((o) => o.id !== id) }));
  },

  // ---------- Tables ----------
  updateTableStatus: async (tableId, status) => {
    const prev = get().tables;
    // Cập nhật lạc quan: đổi giao diện trước, hoàn tác nếu server từ chối
    set({ tables: prev.map((t) => (t.id === tableId ? { ...t, status } : t)) });
    try {
      await tableApi.updateStatus(tableId, status);
    } catch (err) {
      set({ tables: prev });
      throw err; // để nơi gọi hiện thông báo cho nhân viên
    }
  },
  addTable: async (table) => {
    const created = await tableApi.create(table);
    set((s) => ({ tables: [...s.tables, created] }));
  },
  updateTable: async (table) => {
    const updated = await tableApi.update(table.id, table);
    set((s) => ({ tables: s.tables.map((t) => (t.id === table.id ? updated : t)) }));
  },
  deleteTable: async (tableId) => {
    await tableApi.delete(tableId);
    set((s) => ({ tables: s.tables.filter((t) => t.id !== tableId) }));
  },
  regenerateTableQrToken: async (tableId) => {
    const newToken = await tableApi.regenerateQr(tableId);
    set((s) => ({
      tables: s.tables.map((t) => (t.id === tableId ? { ...t, qr_secret_token: newToken } : t)),
    }));
  },
  verifyTableSession: (tableNo) => {
    set((s) => ({
      tables: s.tables.map((t) => (t.table_no === tableNo ? { ...t, status: 'OCCUPIED' } : t)),
    }));
  },
  setTablePaymentRequested: (tableNo, requested) => {
    set((s) => ({
      tables: s.tables.map((t) => (t.table_no === tableNo ? { ...t, status: requested ? 'OCCUPIED' : t.status } : t)),
    }));
  },
  confirmTablePayment: async (tableNo) => {
    const table = get().tables.find((t) => t.table_no === tableNo);
    set((s) => ({
      tables: s.tables.map((t) => (t.table_no === tableNo ? { ...t, status: 'CLEANING', is_paid: true } : t)),
    }));
    if (table) {
      try {
        await tableApi.confirmPayment(table.id);
        const fresh = await tableApi.getAll();
        set({ tables: fresh });
      } catch (err) {
        console.error('Lỗi xác nhận thanh toán bàn:', err);
      }
    }
  },

  // ---------- Orders ----------
  updateOrderStatus: async (id, status) => {
    const prev = get().orders;
    set({ orders: prev.map((o) => (o.id === id ? { ...o, status } : o)) });
    try {
      await orderApi.updateStatus(id, status);
    } catch (err) {
      set({ orders: prev });
      throw err;
    }
  },
  addOrderFromClient: (order) => set((s) => ({ orders: upsertById(s.orders, order) })),
  handleWebSocketOrderEvent: ({ order }) => {
    if (!order) return;
    const normalized: Order = {
      id: order.id,
      order_number: (order as any).orderNumber || order.order_number || '',
      table_no: (order as any).tableNo || order.table_no,
      customer_name: (order as any).customerName || order.customer_name || 'Khách vãng lai',
      order_type: (order as any).orderType || order.order_type || 'DINE_IN',
      status: ((order.status || 'PENDING').toUpperCase()) as OrderStatus,
      payment_status: (order as any).paymentStatus || order.payment_status || 'UNPAID',
      payment_method: (order as any).paymentMethod || order.payment_method || 'CASH',
      total_amount: Number((order as any).totalAmount || order.total_amount || 0),
      items: ((order.items || []) as any[]).map((it) => ({
        id: it.id,
        name: it.name,
        quantity: it.quantity,
        price: Number(it.price || 0),
        notes: it.notes,
        status: it.status?.toUpperCase() || 'PENDING',
      })),
      created_at: (order as any).createdAt || order.created_at,
    };
    set((s) => ({ orders: upsertById(s.orders, normalized) }));
  },

  // ---------- Staff (Nối staffApi) ----------
  addStaff: async (staffData) => {
    const created = await staffApi.create(staffData);
    set((state) => ({ staff_list: [created, ...state.staff_list] }));
    return created;
  },
  toggleStaffStatus: async (id, status) => {
    const prev = get().staff_list;
    set({
      staff_list: prev.map((s) => (s.id === id ? { ...s, status } : s)),
    });
    try {
      await staffApi.updateStatus(id, status);
    } catch (err) {
      set({ staff_list: prev });
      throw err;
    }
  },

  // ---------- Service requests (tạm lưu cục bộ, sau này lấy từ backend) ----------
  addServiceRequest: ({ table_no, order_id, request_text }) =>
    set((s) => ({
      service_requests: [
        {
          id: `sr-${Date.now()}-${s.service_requests.length}`,
          table_no,
          order_id,
          request_text,
          timestamp: new Date().toISOString(),
          status: 'OPEN',
        },
        ...s.service_requests,
      ],
    })),
  resolveServiceRequest: async (id) => {
    set((s) => ({
      service_requests: s.service_requests.map((r) => (r.id === id ? { ...r, status: 'RESOLVED' } : r)),
    }));
    try {
      await serviceRequestApi.resolveRequest(id);
    } catch (err) {
      console.error('Lỗi giải quyết yêu cầu phục vụ:', err);
    }
  },
  resolveServiceRequestsByTable: async (table_no) => {
    set((s) => ({
      service_requests: s.service_requests.map((r) => (r.table_no === table_no ? { ...r, status: 'RESOLVED' } : r)),
    }));
    try {
      await serviceRequestApi.resolveTableRequests(table_no);
    } catch (err) {
      console.error('Lỗi giải quyết yêu cầu bàn:', err);
    }
  },
  clearAllServiceRequests: () => set({ service_requests: [] }),

  // Action Quản lý Voucher với Backend API
  addVoucher: async (voucherData) => {
    const created = await voucherApi.createVoucher(voucherData);
    set((state) => ({ vouchers: [created, ...state.vouchers] }));
    return created;
  },
  updateVoucher: async (id, voucherData) => {
    const updated = await voucherApi.updateVoucher(id, voucherData);
    set((state) => ({
      vouchers: state.vouchers.map((v) => (v.id === id ? updated : v)),
    }));
    return updated;
  },
  deleteVoucher: async (id) => {
    await voucherApi.deleteVoucher(id);
    set((state) => ({
      vouchers: state.vouchers.filter((v) => v.id !== id),
    }));
  },
  toggleVoucherStatus: async (id, status) => {
    const prev = get().vouchers;
    // Optimistic UI update
    set({ vouchers: prev.map((v) => (v.id === id ? { ...v, status } : v)) });
    try {
      await voucherApi.updateStatus(id, status);
    } catch (err) {
      // Revert if API fails
      set({ vouchers: prev });
      throw err;
    }
  },
}));

/**
 * Cầu nối sự kiện trong CÙNG MỘT trình duyệt (chỉ dùng khi phát triển, thử nhiều tab).
 * Khi khách và nhân viên dùng thiết bị khác nhau, dữ liệu phải đến từ backend (WebSocket).
 * Gọi hàm này trong useEffect của layout admin, hàm trả về cách gỡ listener,
 * nhờ đó không bị đăng ký lặp lại mỗi lần Vite tải lại nóng:
 *
 *   useEffect(() => registerLocalEventBridge(), []);
 *
 * Hai sự kiện payment_requested và payment_request_cancelled tạm chưa được xử lý
 * vì setTablePaymentRequested chưa nối backend.
 */
export function registerLocalEventBridge(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const onServiceRequest = (e: Event) => {
    const detail = (e as CustomEvent<any>).detail;
    const table_no = detail?.table_no || detail?.tableNo;
    const request_text = detail?.request_text || detail?.requestText;
    const order_id = detail?.order_id || detail?.orderId;
    if (table_no && request_text) {
      useAdminStore.getState().addServiceRequest({ table_no, order_id, request_text });
    }
  };

  window.addEventListener('omniresto:service_request', onServiceRequest);
  return () => window.removeEventListener('omniresto:service_request', onServiceRequest);
}