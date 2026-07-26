import { create } from 'zustand';
import type { Branch, MenuItem, Order, StaffUser, TableInfo } from '../types/admin';

interface AdminState {
  // Global Filters
  selectedBranchId: string; // 'ALL' or specific branchId
  setSelectedBranchId: (id: string) => void;

  // Data Collections
  branches: Branch[];
  menuItems: MenuItem[];
  orders: Order[];
  staffList: StaffUser[];
  tables: TableInfo[];

  // Bulk Setters
  setBranches: (branches: Branch[]) => void;
  setMenuItems: (items: MenuItem[]) => void;
  setOrders: (orders: Order[]) => void;
  setStaffList: (staff: StaffUser[]) => void;
  setTables: (tables: TableInfo[]) => void;

  // Actions - Branch
  addBranch: (branch: Omit<Branch, 'id' | 'dailyRevenue' | 'activeOrdersCount'>) => void;
  updateBranchStatus: (id: string, status: Branch['status']) => void;

  // Actions - Menu
  addMenuItem: (item: Omit<MenuItem, 'id' | 'branchesCount'>) => void;
  toggleMenuItemStatus: (id: string, status: MenuItem['status']) => void;

  // Actions - Orders
  updateOrderStatus: (id: string, status: Order['status']) => void;

  // Actions - Staff
  addStaff: (staff: Omit<StaffUser, 'id' | 'createdAt'>) => void;
  toggleStaffStatus: (id: string, status: StaffUser['status']) => void;
}

const INITIAL_BRANCHES: Branch[] = [
  {
    id: 'br-01',
    code: 'HN-HK',
    name: 'OmniResto - Hoàn Kiếm',
    address: '42 Tràng Tiền, Q. Hoàn Kiếm, Hà Nội',
    phone: '024 3825 9999',
    managerName: 'Nguyễn Văn Minh',
    status: 'ACTIVE',
    tablesCount: 24,
    activeOrdersCount: 8,
    dailyRevenue: 28500000,
    rating: 4.9,
  },
  {
    id: 'br-02',
    code: 'HCM-Q1',
    name: 'OmniResto - Quận 1',
    address: '88 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
    phone: '028 3822 8888',
    managerName: 'Trần Thị Thu Thảo',
    status: 'ACTIVE',
    tablesCount: 30,
    activeOrdersCount: 12,
    dailyRevenue: 34200000,
    rating: 4.8,
  },
  {
    id: 'br-03',
    code: 'DN-HC',
    name: 'OmniResto - Hải Châu',
    address: '150 Bạch Đằng, Q. Hải Châu, Đà Nẵng',
    phone: '0236 3811 777',
    managerName: 'Lê Hoàng Nam',
    status: 'ACTIVE',
    tablesCount: 20,
    activeOrdersCount: 5,
    dailyRevenue: 19800000,
    rating: 4.7,
  },
  {
    id: 'br-04',
    code: 'HN-CG',
    name: 'OmniResto - Cầu Giấy',
    address: '102 Xuân Thủy, Q. Cầu Giấy, Hà Nội',
    phone: '024 3768 5555',
    managerName: 'Phạm Đức Anh',
    status: 'MAINTENANCE',
    tablesCount: 18,
    activeOrdersCount: 0,
    dailyRevenue: 0,
    rating: 4.6,
  },
];

const INITIAL_MENU: MenuItem[] = [
  {
    id: 'm-01',
    code: 'PHO-01',
    name: 'Phở Bò Tái Nạm Đặc Biệt',
    category: 'Phở & Bún',
    basePrice: 89000,
    description: 'Nước dùng hầm xương 24h truyền thống, thịt bò Wagyu tái nạm mềm thơm ngậy.',
    status: 'AVAILABLE',
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop',
    branchesCount: 4,
  },
  {
    id: 'm-02',
    code: 'BUN-02',
    name: 'Bún Chả Hà Nội Than Hồng',
    category: 'Phở & Bún',
    basePrice: 79000,
    description: 'Chả nướng than hoa thơm lừng kèm bún tươi, nem rán giòn rụm và nước chấm chuẩn vị.',
    status: 'AVAILABLE',
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop',
    branchesCount: 4,
  },
  {
    id: 'm-03',
    code: 'COM-01',
    name: 'Cơm Tấm Sườn Bì Chả Trứng',
    category: 'Cơm & Món Chính',
    basePrice: 85000,
    description: 'Sườn nướng mật ong đậm đà, chả trứng chưng chuẩn vị Sài Gòn, mỡ hành béo ngậy.',
    status: 'AVAILABLE',
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&auto=format&fit=crop',
    branchesCount: 4,
  },
  {
    id: 'm-04',
    code: 'GOI-01',
    name: 'Gỏi Cuốn Tôm Thịt Nem Tráng',
    category: 'Món Ăn Kèm',
    basePrice: 45000,
    description: 'Tôm tươi, thịt ba chỉ thanh mát cuộn bánh tráng chấm sốt tương đậu phộng.',
    status: 'AVAILABLE',
    isBestSeller: false,
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop',
    branchesCount: 4,
  },
  {
    id: 'm-05',
    code: 'DRK-01',
    name: 'Trà Sen Vàng Hạt Hạt Cung Đình',
    category: 'Đồ Uống',
    basePrice: 39000,
    description: 'Trà sen Huế ướp lạnh tự nhiên kết hợp củ năng giòn ngọt và hạt sen thơm bùi.',
    status: 'AVAILABLE',
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop',
    branchesCount: 4,
  },
  {
    id: 'm-06',
    code: 'DES-01',
    name: 'Chè Hạt Sen Bọc Nhãn Lồng',
    category: 'Tráng Miệng',
    basePrice: 42000,
    description: 'Món tráng miệng thanh mát giải nhiệt, hạt sen bọc trong nhãn lồng mọng nước.',
    status: 'OUT_OF_STOCK',
    isBestSeller: false,
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop',
    branchesCount: 3,
  },
];

const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-101',
    orderNumber: 'ORD-HN-8841',
    branchId: 'br-01',
    branchName: 'OmniResto - Hoàn Kiếm',
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
    orderNumber: 'ORD-HCM-9022',
    branchId: 'br-02',
    branchName: 'OmniResto - Quận 1',
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
    orderNumber: 'ORD-DN-3310',
    branchId: 'br-03',
    branchName: 'OmniResto - Hải Châu',
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
    orderNumber: 'ORD-HN-8840',
    branchId: 'br-01',
    branchName: 'OmniResto - Hoàn Kiếm',
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
    branchId: 'ALL',
    branchName: 'Trụ Sở Chính (HQ)',
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
    branchId: 'br-01',
    branchName: 'OmniResto - Hoàn Kiếm',
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
    branchId: 'br-01',
    branchName: 'OmniResto - Hoàn Kiếm',
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
    branchId: 'br-01',
    branchName: 'OmniResto - Hoàn Kiếm',
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
    branchId: 'br-01',
    branchName: 'OmniResto - Hoàn Kiếm',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop',
    createdAt: '2025-03-05',
  },
];

const INITIAL_TABLES: TableInfo[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `tbl-${i + 1}`,
  tableNo: `Bàn ${i + 1 < 10 ? '0' + (i + 1) : i + 1}`,
  branchId: 'br-01',
  capacity: (i % 3 === 0) ? 6 : (i % 2 === 0 ? 4 : 2),
  status: i === 1 || i === 4 || i === 7 ? 'OCCUPIED' : (i === 2 ? 'RESERVED' : (i === 9 ? 'CLEANING' : 'AVAILABLE')),
  currentOrderAmount: (i === 1 || i === 4 || i === 7) ? (i * 95000 + 120000) : undefined,
  occupiedSince: (i === 1 || i === 4 || i === 7) ? `${15 + i * 5} phút trước` : undefined,
}));

export const useAdminStore = create<AdminState>((set) => ({
  selectedBranchId: 'ALL',
  setSelectedBranchId: (id) => set({ selectedBranchId: id }),

  branches: INITIAL_BRANCHES,
  menuItems: INITIAL_MENU,
  orders: INITIAL_ORDERS,
  staffList: INITIAL_STAFF,
  tables: INITIAL_TABLES,

  setBranches: (branches) => set({ branches }),
  setMenuItems: (menuItems) => set({ menuItems }),
  setOrders: (orders) => set({ orders }),
  setStaffList: (staffList) => set({ staffList }),
  setTables: (tables) => set({ tables }),

  addBranch: (newBranchData) =>
    set((state) => ({
      branches: [
        ...state.branches,
        {
          ...newBranchData,
          id: `br-${Date.now()}`,
          dailyRevenue: 0,
          activeOrdersCount: 0,
        },
      ],
    })),

  updateBranchStatus: (id, status) =>
    set((state) => ({
      branches: state.branches.map((b) => (b.id === id ? { ...b, status } : b)),
    })),

  addMenuItem: (newItemData) =>
    set((state) => ({
      menuItems: [
        ...state.menuItems,
        {
          ...newItemData,
          id: `m-${Date.now()}`,
          branchesCount: state.branches.length,
        },
      ],
    })),

  toggleMenuItemStatus: (id, status) =>
    set((state) => ({
      menuItems: state.menuItems.map((item) => (item.id === id ? { ...item, status } : item)),
    })),

  updateOrderStatus: (id, status) =>
    set((state) => ({
      orders: state.orders.map((o) => (o.id === id ? { ...o, status } : o)),
    })),

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
