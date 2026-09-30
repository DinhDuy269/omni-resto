import { create } from 'zustand';
import type { MenuItem, Order, StaffUser, TableInfo } from '../../shared/types/admin';

interface AdminState {
  // Data Collections
  menuItems: MenuItem[];
  orders: Order[];
  staffList: StaffUser[];
  tables: TableInfo[];

  // Bulk Setters
  setMenuItems: (items: MenuItem[]) => void;
  setOrders: (orders: Order[]) => void;
  setStaffList: (staff: StaffUser[]) => void;
  setTables: (tables: TableInfo[]) => void;

  // Actions - Menu
  addMenuItem: (item: Omit<MenuItem, 'id'>) => void;
  toggleMenuItemStatus: (id: string, status: MenuItem['status']) => void;

  // Actions - Orders
  updateOrderStatus: (id: string, status: Order['status']) => void;
  addOrderFromClient: (order: Order) => void;
  handleWebSocketOrderEvent: (event: { eventType: string; order: Order }) => void;

  // Actions - Staff
  addStaff: (staff: Omit<StaffUser, 'id' | 'createdAt'>) => void;
  toggleStaffStatus: (id: string, status: StaffUser['status']) => void;
}

const INITIAL_MENU: MenuItem[] = [
  {
    id: 'm-01',
    code: 'PHO-01',
    name: 'Phở Bò Tái Nạm Đặc Biệt',
    category: 'Phở & Bún',
    basePrice: 89000,
    description: 'Nước dùng hầm xương 24h truyền thống, thịt bò Wagyu tái nạm mềm thơm ngậy.',
    ingredients: 'Bò Wagyu thái mỏng, Nạm bò gừng, Bánh phở tươi Hà Nội, Hành hoa, Ngò gai, Nước hầm xương bò 24h thảo mộc',
    status: 'AVAILABLE',
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-02',
    code: 'BUN-02',
    name: 'Bún Chả Hà Nội Than Hồng',
    category: 'Phở & Bún',
    basePrice: 79000,
    description: 'Chả nướng than hoa thơm lừng kèm bún tươi, nem rán giòn rụm và nước chấm chuẩn vị.',
    ingredients: 'Thịt ba chỉ nướng than, Chả viên nướng sả, Bún tươi, Đu đủ cà rốt chua, Nem rán giòn, Nước mắm tỏi ớt',
    status: 'AVAILABLE',
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-03',
    code: 'COM-01',
    name: 'Cơm Tấm Sườn Bì Chả Trứng',
    category: 'Cơm & Món Chính',
    basePrice: 85000,
    description: 'Sườn nướng mật ong đậm đà, chả trứng chưng chuẩn vị Sài Gòn, mỡ hành béo ngậy.',
    ingredients: 'Gạo tấm thơm, Sườn nướng mật ong hoa cà phê, Bì heo thính, Chả trứng hấp mộc nhĩ, Trứng ốp la, Mỡ hành tép mỡ',
    status: 'AVAILABLE',
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-04',
    code: 'GOI-01',
    name: 'Gỏi Cuốn Tôm Thịt Nem Tráng',
    category: 'Món Ăn Kèm',
    basePrice: 45000,
    description: 'Tôm tươi, thịt ba chỉ thanh mát cuộn bánh tráng chấm sốt tương đậu phộng.',
    ingredients: 'Tôm sú hấp, Thịt ba chỉ lát, Bún lá tươi, Rau húng quế, Xà lách, Bánh tráng cuốn, Sốt tương bơ đậu phộng',
    status: 'AVAILABLE',
    isBestSeller: false,
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-05',
    code: 'DRK-01',
    name: 'Trà Sen Vàng Hạt Hạt Cung Đình',
    category: 'Đồ Uống',
    basePrice: 39000,
    description: 'Trà sen Huế ướp lạnh tự nhiên kết hợp củ năng giòn ngọt và hạt sen thơm bùi.',
    ingredients: 'Trà sen Huế ướp lạnh, Hạt sen tươi ninh mềm, Củ năng giòn ngọt, Kem cheese béo mặn, Đường phèn thanh mát',
    status: 'AVAILABLE',
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-06',
    code: 'DES-01',
    name: 'Chè Hạt Sen Bọc Nhãn Lồng',
    category: 'Tráng Miệng',
    basePrice: 42000,
    description: 'Món tráng miệng thanh mát giải nhiệt, hạt sen bọc trong nhãn lồng mọng nước.',
    ingredients: 'Hạt sen Huế bùi bở, Cùi nhãn lồng tươi ngọt, Nước đường phèn ướp hoa nhài, Đá hoa tinh khiết',
    status: 'OUT_OF_STOCK',
    isBestSeller: false,
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop',
  },
];

const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-101',
    orderNumber: 'ORD-8841',
    orderType: 'DINE_IN',
    tableNo: 'Bàn 06',
    status: 'PREPARING',
    items: [
      { id: '1', name: 'Phở Bò Tái Nạm Đặc Biệt', quantity: 2, price: 89000, notes: 'Không hành lá, nhiều bánh' },
      { id: '2', name: 'Trà Sen Vàng Hạt Hạt', quantity: 2, price: 39000 },
    ],
    totalAmount: 256000,
    createdAt: '10 phút trước',
    paymentMethod: 'QR_CODE',
  },
  {
    id: 'ord-102',
    orderNumber: 'ORD-9022',
    orderType: 'DELIVERY',
    status: 'PENDING',
    items: [
      { id: '3', name: 'Cơm Tấm Sườn Bì Chả Trứng', quantity: 3, price: 85000 },
      { id: '4', name: 'Gỏi Cuốn Tôm Thịt', quantity: 2, price: 45000 },
    ],
    totalAmount: 345000,
    createdAt: '3 phút trước',
    customerName: 'Chị Mai Phương',
    paymentMethod: 'CARD',
  },
  {
    id: 'ord-103',
    orderNumber: 'ORD-3310',
    orderType: 'DINE_IN',
    tableNo: 'Bàn 12',
    status: 'READY',
    items: [
      { id: '5', name: 'Bún Chả Hà Nội Than Hồng', quantity: 1, price: 79000 },
      { id: '6', name: 'Trà Sen Vàng Hạt Hạt', quantity: 1, price: 39000 },
    ],
    totalAmount: 118000,
    createdAt: '18 phút trước',
    paymentMethod: 'CASH',
  },
  {
    id: 'ord-104',
    orderNumber: 'ORD-8840',
    orderType: 'TAKEAWAY',
    status: 'COMPLETED',
    items: [
      { id: '7', name: 'Phở Bò Tái Nạm Đặc Biệt', quantity: 1, price: 89000 },
    ],
    totalAmount: 89000,
    createdAt: '25 phút trước',
    customerName: 'Anh Quốc Tuấn',
    paymentMethod: 'QR_CODE',
  },
];

const INITIAL_STAFF: StaffUser[] = [
  {
    id: 'usr-01',
    fullName: 'Lê Minh Tuấn',
    email: 'admin.tuan@omniresto.vn',
    phone: '0905 123 456',
    role: 'admin',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop',
    createdAt: '2025-01-15',
  },
  {
    id: 'usr-02',
    fullName: 'Nguyễn Văn Minh',
    email: 'minh.nguyen@omniresto.vn',
    phone: '0912 345 678',
    role: 'store_manager',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop',
    createdAt: '2025-02-01',
  },
  {
    id: 'usr-03',
    fullName: 'Trần Thị Thu Thảo',
    email: 'thao.tran@omniresto.vn',
    phone: '0988 777 666',
    role: 'cashier',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop',
    createdAt: '2025-02-10',
  },
  {
    id: 'usr-04',
    fullName: 'Bếp Trưởng Đỗ Hoàng',
    email: 'hoang.bep@omniresto.vn',
    phone: '0933 222 111',
    role: 'chef',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop',
    createdAt: '2025-03-01',
  },
  {
    id: 'usr-05',
    fullName: 'Phạm Hồng Nhung',
    email: 'nhung.order@omniresto.vn',
    phone: '0977 444 333',
    role: 'waiter',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop',
    createdAt: '2025-03-05',
  },
];

const INITIAL_TABLES: TableInfo[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `tbl-${i + 1}`,
  tableNo: `Bàn ${i + 1 < 10 ? '0' + (i + 1) : i + 1}`,
  capacity: (i % 3 === 0) ? 6 : (i % 2 === 0 ? 4 : 2),
  status: i === 1 || i === 4 || i === 7 ? 'OCCUPIED' : (i === 2 ? 'RESERVED' : (i === 9 ? 'CLEANING' : 'AVAILABLE')),
  currentOrderAmount: (i === 1 || i === 4 || i === 7) ? (i * 95000 + 120000) : undefined,
  occupiedSince: (i === 1 || i === 4 || i === 7) ? `${15 + i * 5} phút trước` : undefined,
}));

export const useAdminStore = create<AdminState>((set) => ({
  menuItems: INITIAL_MENU,
  orders: INITIAL_ORDERS,
  staffList: INITIAL_STAFF,
  tables: INITIAL_TABLES,

  setMenuItems: (menuItems) => set({ menuItems }),
  setOrders: (orders) => set({ orders }),
  setStaffList: (staffList) => set({ staffList }),
  setTables: (tables) => set({ tables }),

  addMenuItem: (newItemData) =>
    set((state) => ({
      menuItems: [
        ...state.menuItems,
        {
          ...newItemData,
          id: `m-${Date.now()}`,
        },
      ],
    })),

  toggleMenuItemStatus: (id, status) =>
    set((state) => ({
      menuItems: state.menuItems.map((item) => (item.id === id ? { ...item, status } : item)),
    })),

  updateOrderStatus: (id, status) =>
    set((state) => {
      const targetOrder = state.orders.find((o) => o.id === id);
      const updatedOrders = state.orders.map((o) => (o.id === id ? { ...o, status } : o));

      let updatedTables = state.tables;
      if (targetOrder && targetOrder.tableNo) {
        if (status === 'COMPLETED') {
          updatedTables = state.tables.map((t) =>
            t.tableNo.toLowerCase() === targetOrder.tableNo?.toLowerCase()
              ? { ...t, status: 'CLEANING', currentOrderAmount: undefined, occupiedSince: undefined }
              : t
          );
        } else if (status === 'PREPARING' || status === 'READY') {
          updatedTables = state.tables.map((t) =>
            t.tableNo.toLowerCase() === targetOrder.tableNo?.toLowerCase()
              ? { ...t, status: 'OCCUPIED' }
              : t
          );
        }
      }

      return { orders: updatedOrders, tables: updatedTables };
    }),

  addOrderFromClient: (newOrder) =>
    set((state) => {
      let updatedTables = state.tables;
      if (newOrder.orderType === 'DINE_IN' && newOrder.tableNo) {
        updatedTables = state.tables.map((t) =>
          t.tableNo.toLowerCase() === newOrder.tableNo?.toLowerCase()
            ? { ...t, status: 'OCCUPIED', currentOrderAmount: newOrder.totalAmount, occupiedSince: 'Vừa gọi đơn' }
            : t
        );
      }
      return {
        orders: [newOrder, ...state.orders.filter(o => o.id !== newOrder.id)],
        tables: updatedTables,
      };
    }),

  handleWebSocketOrderEvent: ({ eventType, order }) =>
    set((state) => {
      const exists = state.orders.some((o) => o.id === order.id);
      let newOrders = state.orders;
      if (eventType === 'ORDER_CREATED' || !exists) {
        newOrders = [order, ...state.orders.filter((o) => o.id !== order.id)];
      } else {
        newOrders = state.orders.map((o) => (o.id === order.id ? { ...o, ...order } : o));
      }
      return { orders: newOrders };
    }),

  addStaff: (newStaffData) =>
    set((state) => ({
      staffList: [
        ...state.staffList,
        {
          ...newStaffData,
          id: `usr-${Date.now()}`,
          createdAt: new Date().toISOString().split('T')[0],
        },
      ],
    })),

  toggleStaffStatus: (id, status) =>
    set((state) => ({
      staffList: state.staffList.map((usr) => (usr.id === id ? { ...usr, status } : usr)),
    })),
}));
