import { create } from 'zustand';
import { menuApi } from '../pages/menu/menuApi';
import { tableApi } from '../../shared/api/tableApi';
import { orderApi } from '../../shared/api/orderApi';
import { staffApi } from '../../shared/api/staffApi';
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

  // Bulk setters
  setMenuItems: (items: MenuItem[]) => void;
  setCategoryOptions: (options: CategoryOption[]) => void;
  setOrders: (orders: Order[]) => void;
  setStaffList: (staff: StaffUser[]) => void;
  setTables: (tables: TableInfo[]) => void;

  // Menu
  addMenuItem: (item: Omit<MenuItem, 'id'>) => void;
  updateMenuItem: (item: MenuItem) => void;
  deleteMenuItem: (id: string) => void;
  toggleMenuItemStatus: (id: string, status: MenuItem['status']) => void;

  // Category options (size, topping)
  addCategoryOption: (option: Omit<CategoryOption, 'id'>) => void;
  updateCategoryOption: (option: CategoryOption) => void;
  toggleCategoryOptionStatus: (id: string, status: string) => void;
  deleteCategoryOption: (id: string) => void;

  // Tables
  updateTableStatus: (tableId: string, status: TableInfo['status']) => Promise<void>;
  addTable: (table: Omit<TableInfo, 'id'>) => void;
  updateTable: (table: TableInfo) => void;
  deleteTable: (tableId: string) => void;
  regenerateTableQrToken: (tableId: string) => void;
  verifyTableSession: (tableNo: string) => void;
  setTablePaymentRequested: (tableNo: string, requested: boolean) => void;
  confirmTablePayment: (tableNo: string) => void;

  // Orders
  updateOrderStatus: (id: string, status: Order['status']) => Promise<void>;
  addOrderFromClient: (order: Order) => void;
  handleWebSocketOrderEvent: (event: { eventType: string; order: Order }) => void;

  // Staff
  addStaff: (staff: Omit<StaffUser, 'id' | 'created_at'>) => void;
  toggleStaffStatus: (id: string, status: StaffUser['status']) => void;

  // Service requests (gọi phục vụ tại bàn)
  addServiceRequest: (req: { table_no: string; order_id?: string; request_text: string }) => void;
  resolveServiceRequest: (id: string) => void;
resolveServiceRequestsByTable: (table_no: string) => void;
  clearAllServiceRequests: () => void;
}

/**
 * Các action bên dưới được đánh dấu TODO chưa nối backend.
 * Cố ý để chúng báo lỗi rõ ràng thay vì sửa dữ liệu cục bộ rồi giả vờ thành công,
 * vì dữ liệu chỉ nằm trên giao diện sẽ lệch với database.
 * Khi nối xong từng cái, thay `notWired(...)` bằng lời gọi API tương ứng.
 */
const notWired = (name: string): never => {
  throw new Error(`${name}: chưa được nối với API backend`);
};

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const exists = list.some((x) => x.id === item.id);
  return exists ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list];
}

export const useAdminStore = create<AdminState>((set, get) => ({
  // ---------- State ----------
  menu_items: [],
  category_options: [],
  orders: [],
  staff_list: [],
  tables: [],
  service_requests: [],
  isLoading: false,
  loadError: null,

  // ---------- Tải dữ liệu từ backend ----------
  fetchInitialData: async () => {
    set({ isLoading: true, loadError: null });

    const [menu, tables, orders, staff] = await Promise.allSettled([
      menuApi.getMenuItems(),
      tableApi.getAll(),
      orderApi.getAll(),
      staffApi.getAll(),
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

  // ---------- Menu (TODO: nối menuApi) ----------
  addMenuItem: () => notWired('addMenuItem'),
updateMenuItem: () => notWired('updateMenuItem'),
  deleteMenuItem: () => notWired('deleteMenuItem'),
  toggleMenuItemStatus: () => notWired('toggleMenuItemStatus'),

  // ---------- Category options (TODO: nối API) ----------
  addCategoryOption: () => notWired('addCategoryOption'),
  updateCategoryOption: () => notWired('updateCategoryOption'),
  toggleCategoryOptionStatus: () => notWired('toggleCategoryOptionStatus'),
  deleteCategoryOption: () => notWired('deleteCategoryOption'),

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
  addTable: () => notWired('addTable'),
  updateTable: () => notWired('updateTable'),
  deleteTable: () => notWired('deleteTable'),
  regenerateTableQrToken: () => notWired('regenerateTableQrToken'),
  verifyTableSession: () => notWired('verifyTableSession'),
  setTablePaymentRequested: () => notWired('setTablePaymentRequested'),
  confirmTablePayment: () => notWired('confirmTablePayment'),

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
// ---------- Staff (TODO: nối staffApi) ----------
  addStaff: () => notWired('addStaff'),
  toggleStaffStatus: () => notWired('toggleStaffStatus'),

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
  resolveServiceRequest: (id) =>
    set((s) => ({
      service_requests: s.service_requests.map((r) => (r.id === id ? { ...r, status: 'RESOLVED' } : r)),
    })),
  resolveServiceRequestsByTable: (table_no) =>
    set((s) => ({
      service_requests: s.service_requests.map((r) => (r.table_no === table_no ? { ...r, status: 'RESOLVED' } : r)),
    })),
  clearAllServiceRequests: () => set({ service_requests: [] }),
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