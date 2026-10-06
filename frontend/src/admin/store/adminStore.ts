import { create } from 'zustand';
import type { MenuItem, Order, StaffUser, TableInfo, CategoryOption, VoucherInfo } from '../../shared/types/admin';

export const DISH_CATEGORIES = [
  { id: 'cat-pho', name: 'Phở & Bún Nước' },
  { id: 'cat-com', name: 'Cơm Tấm & Món Mặn' },
  { id: 'cat-banhmi', name: 'Bánh Mì & Điểm Tâm' },
  { id: 'cat-lau', name: 'Lẩu & Món Nhắm' },
  { id: 'cat-drink', name: 'Đồ Uống & Tráng Miệng' },
];

export interface ServiceRequestItem {
  id: string;
  tableNo: string;
  orderId?: string;
  requestText: string;
  timestamp: string;
  status: 'OPEN' | 'RESOLVED';
}

interface AdminState {
  // Data Collections
  menuItems: MenuItem[];
  categoryOptions: CategoryOption[];
  orders: Order[];
  staffList: StaffUser[];
  tables: TableInfo[];
  vouchers: VoucherInfo[]; // <-- Thêm Vouchers
  serviceRequests: ServiceRequestItem[];

  // Bulk Setters
  setMenuItems: (items: MenuItem[]) => void;
  setCategoryOptions: (options: CategoryOption[]) => void;
  setOrders: (orders: Order[]) => void;
  setStaffList: (staff: StaffUser[]) => void;
  setTables: (tables: TableInfo[]) => void;
  setVouchers: (vouchers: VoucherInfo[]) => void; // <-- Thêm Setter cho Vouchers

  // Actions - Menu
  addMenuItem: (item: Omit<MenuItem, 'id'>) => void;
  updateMenuItem: (item: MenuItem) => void;
  deleteMenuItem: (id: string) => void;
  toggleMenuItemStatus: (id: string, status: MenuItem['status']) => void;

  // Actions - Category Options (Sizes & Toppings)
  addCategoryOption: (option: Omit<CategoryOption, 'id'>) => void;
  updateCategoryOption: (option: CategoryOption) => void;
  toggleCategoryOptionStatus: (id: string, status: string) => void;
  deleteCategoryOption: (id: string) => void;

  // Actions - Tables
  updateTableStatus: (tableId: string, status: TableInfo['status']) => void;
  addTable: (table: Omit<TableInfo, 'id'>) => void;
  updateTable: (table: TableInfo) => void;
  deleteTable: (tableId: string) => void;
  regenerateTableQrToken: (tableId: string) => void;
  verifyTableSession: (tableNo: string) => void;
  setTablePaymentRequested: (tableNo: string, requested: boolean) => void;
  confirmTablePayment: (tableNo: string) => void;

  // Actions - Orders
  updateOrderStatus: (id: string, status: Order['status']) => void;
  addOrderFromClient: (order: Order) => void;
  handleWebSocketOrderEvent: (event: { eventType: string; order: Order }) => void;

  // Actions - Staff
  addStaff: (staff: Omit<StaffUser, 'id' | 'createdAt'>) => void;
  toggleStaffStatus: (id: string, status: StaffUser['status']) => void;

  // Actions - Vouchers
  toggleVoucherStatus: (id: string, status: VoucherInfo['status']) => void; // <-- Thêm Action cho Vouchers
  // Actions - Service Requests (Gọi phục vụ tại bàn)
  addServiceRequest: (req: { tableNo: string; orderId?: string; requestText: string }) => void;
  resolveServiceRequest: (id: string) => void;
  resolveServiceRequestsByTable: (tableNo: string) => void;
  clearAllServiceRequests: () => void;
}

const INITIAL_MENU: MenuItem[] = [
  // ── SÁNG (06:00 - 10:30) ──
  {
    id: 'm-01',
    code: 'XOI-01',
    name: 'Xôi Xéo Gà Xé Nấm Hương',
    category: 'Bánh Mì & Điểm Tâm',
    basePrice: 45000,
    description: 'Xôi xéo dẻo thơm hạt nếp cái hoa vàng, gà xé đậm đà, hành phi giòn tan và rưới mỡ gà béo ngậy.',
    ingredients: 'Gạo nếp cái hoa vàng, Đậu xanh đồ mịn, Thịt đùi gà xé sợi, Nấm hương Sa Pa, Hành khô phi giòn, Mỡ gà ta',
    mealPeriods: 'MORNING',
    status: 'AVAILABLE',
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-02',
    code: 'BM-01',
    name: 'Bánh Mì Chảo Đặc Biệt Pate Trứng',
    category: 'Bánh Mì & Điểm Tâm',
    basePrice: 55000,
    description: 'Chảo gang nóng hổi gồm trứng ốp la lòng đào, pate Cột Đèn béo ngậy, xúc xích tiêu đen và sốt cà chua bí truyền.',
    ingredients: 'Bánh mì giòn vỏ, Pate gan heo Cột Đèn, 2 trứng gà ta ốp la, Xúc xích tiêu, Xíu mại thịt băm, Sốt vang cà chua',
    mealPeriods: 'MORNING',
    status: 'AVAILABLE',
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-03',
    code: 'BM-02',
    name: 'Bánh Mì Heo Quay Giòn Bì Dưa Chua',
    category: 'Bánh Mì & Điểm Tâm',
    basePrice: 38000,
    description: 'Bánh mì nướng giòn rụm kẹp thịt ba chỉ heo quay nổ cốm giòn tan, dưa leo và sốt ớt cay ngọt.',
    ingredients: 'Bánh mì nóng giòn, Heo quay nổ cốm da giòn, Dưa leo, Ngò rí, Đồ chua, Nước sốt heo quay thảo quả',
    mealPeriods: 'MORNING',
    status: 'AVAILABLE',
    isBestSeller: false,
    image: 'https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-04',
    code: 'XOI-02',
    name: 'Xôi Khúc Hoàng Mai Chả Lụa Nóng',
    category: 'Bánh Mì & Điểm Tâm',
    basePrice: 35000,
    description: 'Hạt xôi mềm dẻo bọc nhân rau khúc tươi thơm nức, đậu xanh tiêu sọ, thịt ba chỉ và kèm 2 lát chả lụa.',
    ingredients: 'Nếp nương dẻo, Lá khúc tươi, Đậu xanh đồ nhuyễn, Thịt ba chỉ rim tiêu sọ, Chả lụa Ước Lễ',
    mealPeriods: 'MORNING',
    status: 'AVAILABLE',
    isBestSeller: false,
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-05',
    code: 'BC-01',
    name: 'Bánh Cuốn Nóng Thanh Trì Chả Quế',
    category: 'Bánh Mì & Điểm Tâm',
    basePrice: 40000,
    description: 'Bánh tráng tay mỏng mướt trắng ngần rắc mộc nhĩ thịt băm, chấm nước mắm ấm nóng và chả quế giòn sần sật.',
    ingredients: 'Bột gạo tẻ tráng mỏng, Mộc nhĩ thịt nạc vai băm, Hành phi thơm lừng, Chả quế nướng vàng, Nước mắm chua ngọt',
    mealPeriods: 'MORNING',
    status: 'AVAILABLE',
    isBestSeller: false,
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-06',
    code: 'CHE-01',
    name: 'Chè Hạt Sen Bọc Nhãn Lồng Bột Sắn',
    category: 'Đồ Uống & Tráng Miệng',
    basePrice: 35000,
    description: 'Món tráng miệng thanh tao giải nhiệt, hạt sen bùi ngậy lồng trong cùi nhãn ngọt giòn, nước đường phèn hoa bưởi.',
    ingredients: 'Hạt sen Huế tươi ninh mềm, Cùi nhãn lồng Hưng Yên, Bột sắn dây hoa bưởi, Đường phèn Quảng Ngãi',
    mealPeriods: 'MORNING',
    status: 'OUT_OF_STOCK',
    isBestSeller: false,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop',
  },

  // ── TRƯA (10:30 - 14:30) ──
  {
    id: 'm-07',
    code: 'COM-01',
    name: 'Cơm Tấm Sườn Bì Chả Trứng Sài Gòn',
    category: 'Cơm Tấm & Món Mặn',
    basePrice: 79000,
    description: 'Sườn cốt lết ướp mật ong nướng than hoa thơm lừng, chả trứng chưng chuẩn vị Sài Gòn, bì giòn và mỡ hành tép mỡ.',
    ingredients: 'Gạo tấm thơm dẻo, Sườn cốt lết nướng than, Bì heo thính gạo rang, Chả trứng mộc nhĩ, Trứng ốp la, Mỡ hành tép mỡ',
    mealPeriods: 'NOON',
    status: 'AVAILABLE',
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-08',
    code: 'COM-02',
    name: 'Cơm Gà Xối Mỡ Dưa Chua Sốt Cay',
    category: 'Cơm Tấm & Món Mặn',
    basePrice: 75000,
    description: 'Góc phần tư đùi gà xối mỡ vàng ươm da giòn rụm, cơm rang hạt ngọc thơm phức, ăn kèm dưa muối giòn chua giải ngấy.',
    ingredients: 'Đùi gà xối mỡ giòn da, Cơm chiên tỏi nghệ, Dưa cải chua xào tóp mỡ, Dưa leo, Cà chua, Nước tương tỏi ớt gừng',
    mealPeriods: 'NOON',
    status: 'AVAILABLE',
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-09',
    code: 'COM-03',
    name: 'Cơm Cá Basa Kho Tộ Canh Chua Bông Điên Điển',
    category: 'Cơm Tấm & Món Mặn',
    basePrice: 72000,
    description: 'Khúc cá basa kho tiêu tộ đất sánh đặc đậm đà keo vị, ăn kèm niêu canh chua cá bông điên điển thanh mát.',
    ingredients: 'Cá basa tươi cắt khúc, Nước hàng dừa Bến Tre, Tiêu đen Phú Quốc, Nước cốt me, Bông điên điển, Bạc hà',
    mealPeriods: 'NOON',
    status: 'AVAILABLE',
    isBestSeller: false,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-10',
    code: 'COM-04',
    name: 'Cơm Bò Lúc Lắc Khoai Tây Chiên Bơ Tỏi',
    category: 'Cơm Tấm & Món Mặn',
    basePrice: 85000,
    description: 'Thịt thăn bò Úc thái quân cờ xào lửa lớn sốt tiêu đen bóng mượt, dùng kèm khoai tây chiên bơ vàng ươm.',
    ingredients: 'Thăn bò Úc mềm ngọt, Ớt chuông Đà Lạt, Hành tây xào tiêu đen bơ tỏi, Khoai tây chiên giòn, Cơm thơm lài',
    mealPeriods: 'NOON',
    status: 'AVAILABLE',
    isBestSeller: false,
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-11',
    code: 'COM-05',
    name: 'Cơm Sườn Non Rim Mặn Ngọt Mỡ Hành',
    category: 'Cơm Tấm & Món Mặn',
    basePrice: 75000,
    description: 'Sườn non heo rim nước mắm tỏi ớt keo lại mặn ngọt đưa cơm, chan mỡ hành thơm phức.',
    ingredients: 'Sườn non heo chọn lọc, Nước mắm cá cơm truyền thống, Tỏi ớt băm nhuyễn, Mỡ hành lá tép mỡ',
    mealPeriods: 'NOON',
    status: 'OUT_OF_STOCK',
    isBestSeller: false,
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-12',
    code: 'BUN-01',
    name: 'Bún Chả Hà Nội Que Tre Than Hồng',
    category: 'Phở & Bún Nước',
    basePrice: 75000,
    description: 'Thịt ba chỉ thái mỏng và chả băm kẹp que tre nướng than hoa thơm nức mũi, nước chấm đu đủ ấm nóng kèm bún tươi.',
    ingredients: 'Thịt ba chỉ nướng than, Chả viên hành sả nướng que tre, Bún tươi Phú Đô, Đu đủ cà rốt muối chua, Rau sống kinh giới',
    mealPeriods: 'NOON',
    status: 'AVAILABLE',
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-13',
    code: 'PHO-01',
    name: 'Phở Bò Tái Nạm Gầu Giòn Wagyu',
    category: 'Phở & Bún Nước',
    basePrice: 89000,
    description: 'Nước dùng phở bò truyền thống hầm xương tủy 24h thơm mùi quế hồi thảo quả, thịt bò Wagyu tái mềm ngọt.',
    ingredients: 'Bò Wagyu thái mỏng, Nạm gầu giòn, Bánh phở tươi Hà Nội, Nước hầm xương bò thảo mộc 24h, Hành hoa, Ngò gai',
    mealPeriods: 'NOON',
    status: 'AVAILABLE',
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-14',
    code: 'BBH-01',
    name: 'Bún Bò Huế Chả Cua Giò Heo Cay Nồng',
    category: 'Phở & Bún Nước',
    basePrice: 79000,
    description: 'Nước dùng bún bò hầm xương ống dậy mùi mắm ruốc sả ớt, khoanh giò heo mềm ngậy, chả cua bể và tiết luộc.',
    ingredients: 'Sợi bún to Huế, Bắp bò hoa, Giò heo hầm mềm, Chả cua bể tươi, Nước dùng sả ớt mắm ruốc Bà Duệ',
    mealPeriods: 'NOON',
    status: 'AVAILABLE',
    isBestSeller: false,
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-15',
    code: 'BD-01',
    name: 'Bún Đậu Mắm Tôm Thập Cẩm Chả Cốm',
    category: 'Phở & Bún Nước',
    basePrice: 75000,
    description: 'Mẹt bún lá cắt miếng, đậu hũ Mơ rán phồng giòn rụm chấm mắm tôm Thanh Hóa đánh sủi bọt với quất và ớt tươi.',
    ingredients: 'Bún lá tươi cắt con cờ, Đậu hũ Mơ chiên phồng, Chả cốm làng Vòng, Nem rán giòn, Thịt chân giò luộc, Mắm tôm Thanh Hóa',
    mealPeriods: 'NOON',
    status: 'AVAILABLE',
    isBestSeller: false,
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop',
  },

  // ── TỐI (16:30 - 22:00) ──
  {
    id: 'm-16',
    code: 'LAU-01',
    name: 'Set Lẩu Riêu Cua Bắp Bò Sườn Sụn',
    category: 'Lẩu & Món Nhắm',
    basePrice: 389000,
    description: 'Set lẩu riêu cua đồng xịn giã tay dậy mùi giấm bỗng nếp, thịt bắp bò hoa giòn ngọt và sườn sụn non chặt nhỏ.',
    ingredients: 'Cua đồng tươi giã tay gạch béo ngậy, Bắp bò hoa thái mỏng, Sườn sụn non chặt con chì, Giấm bỗng nếp làng Vân, Hoa chuối, Bún tươi',
    mealPeriods: 'EVENING',
    status: 'AVAILABLE',
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-17',
    code: 'LAU-02',
    name: 'Set Lẩu Thái Hải Sản Tomyum Chua Cay',
    category: 'Lẩu & Món Nhắm',
    basePrice: 429000,
    description: 'Nước lẩu Tomyum đậm đà chuẩn vị Thái với cốt dừa thơm béo, lá chanh kaffir, tôm sú tươi nhảy tanh tách, mực ống và nghêu.',
    ingredients: 'Tôm sú tươi sống, Mực ống câu Cô Tô, Nghêu biển trắng, Nước cốt lẩu Tomyum lá chanh sả ớt cốt dừa, Nấm kim châm, Mì tôm',
    mealPeriods: 'EVENING',
    status: 'AVAILABLE',
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1547496502-affa22d38842?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-18',
    code: 'LAU-03',
    name: 'Set Lẩu Gà Lá É Phú Yên Nấm Tuyết',
    category: 'Lẩu & Món Nhắm',
    basePrice: 369000,
    description: 'Lẩu gà đồi thả vườn thịt săn chắc, nước lẩu ngọt thanh từ xương gà và tiêu xanh cay nồng, nhúng lá é tươi thơm mát.',
    ingredients: 'Gà ta thả đồi 1.4kg, Lá é trắng tươi Phú Yên, Măng củ giòn ngọt, Tiêu xanh cay nồng, Nấm tuyết trắng, Bún tươi',
    mealPeriods: 'EVENING',
    status: 'AVAILABLE',
    isBestSeller: false,
    image: 'https://images.unsplash.com/photo-1547496502-affa22d38842?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-19',
    code: 'NHU-01',
    name: 'Dĩa Ba Chỉ Bò Mỹ & Nấm Tươi Nhúng Lẩu',
    category: 'Lẩu & Món Nhắm',
    basePrice: 120000,
    description: 'Đĩa thịt ba chỉ bò Black Angus Mỹ thái lát mỏng cuộn tròn vân mỡ hoa đẹp mắt kèm đĩa nấm tươi tổng hợp nhúng lẩu.',
    ingredients: 'Ba chỉ bò Black Angus Mỹ thái lát mỏng, Nấm kim châm, Nấm đùi gà baby, Nấm bào ngư',
    mealPeriods: 'EVENING',
    status: 'AVAILABLE',
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-20',
    code: 'NHU-02',
    name: 'Dĩa Tôm Sú Biển & Mực Trứng Nhúng Lẩu',
    category: 'Lẩu & Món Nhắm',
    basePrice: 145000,
    description: 'Đĩa hải sản tươi sống gồm 6 con tôm sú biển tươi giòn và mực trứng Phú Quốc béo ngậy.',
    ingredients: 'Tôm sú biển còn bơi, Mực trứng hấp sơ đá lạnh, Nước sốt tiêu chanh ớt xanh',
    mealPeriods: 'EVENING',
    status: 'AVAILABLE',
    isBestSeller: false,
    image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-21',
    code: 'NHA-01',
    name: 'Gà Ta Ủ Muối Hoa Tiêu Nửa Con',
    category: 'Lẩu & Món Nhắm',
    basePrice: 160000,
    description: 'Gà đồi ủ muối hoa tiêu da vàng giòn sần sật, thịt ngọt thơm mùi lá chanh, chấm muối ớt chanh chuẩn vị nhắm bia.',
    ingredients: 'Nửa con gà ta ủ muối, Muối hạt rang thơm, Tiêu sọ Phú Quốc, Lá chanh thái chỉ, Nước chấm sữa ớt đỏ',
    mealPeriods: 'EVENING',
    status: 'AVAILABLE',
    isBestSeller: false,
    image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-22',
    code: 'NHA-02',
    name: 'Nộm Tai Heo Bóp Thấu Ngó Sen Giòn Cay',
    category: 'Lẩu & Món Nhắm',
    basePrice: 85000,
    description: 'Món khai vị nhắm lai rai giòn sần sật, ngó sen ngâm chua ngọt trộn tai heo giòn và lạc rang giã dập.',
    ingredients: 'Tai heo luộc giòn thái chỉ, Ngó sen tươi muối chua ngọt, Rau răm, Húng lủi, Lạc rang giã thô, Nước mắm chua cay',
    mealPeriods: 'EVENING',
    status: 'AVAILABLE',
    isBestSeller: false,
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-23',
    code: 'NHA-03',
    name: 'Đậu Hũ Lướt Ván Giòn Rụm Chấm Mắm Tôm',
    category: 'Lẩu & Món Nhắm',
    basePrice: 45000,
    description: 'Đậu hũ non lướt chảo dầu sôi da giòn rụm bên trong mềm mịn tan trong miệng.',
    ingredients: 'Đậu hũ non làng Mơ, Hành hoa phi mỡ, Mắm tôm Thanh Hóa đánh sủi bọt quất ớt tươi',
    mealPeriods: 'EVENING',
    status: 'OUT_OF_STOCK',
    isBestSeller: false,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop',
  },

  // ── ĐỒ UỐNG CẢ NGÀY (06:00 - 22:00) ──
  {
    id: 'm-24',
    code: 'DRK-01',
    name: 'Trà Sen Vàng Hạt Hạt Cung Đình',
    category: 'Đồ Uống & Tráng Miệng',
    basePrice: 39000,
    description: 'Trà oolong ướp sen Huế tự nhiên kết hợp củ năng giòn rụm ngọt thanh và hạt sen tươi ninh mềm.',
    ingredients: 'Trà oolong sen Huế, Hạt sen tươi ninh mềm, Củ năng giòn ngọt ngào, Kem macchiato béo nhẹ, Đường phèn thanh',
    mealPeriods: 'ALL_DAY',
    status: 'AVAILABLE',
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-25',
    code: 'DRK-02',
    name: 'Cà Phê Sữa Đá Phin Đậm Đà Buôn Ma Thuột',
    category: 'Đồ Uống & Tráng Miệng',
    basePrice: 29000,
    description: 'Cà phê Robusta Đắk Lắk nguyên chất pha phin nhôm truyền thống, hòa quyện sữa đặc thơm béo và đá viên mát lạnh.',
    ingredients: 'Hạt Robusta mộc Buôn Ma Thuột, Sữa đặc có đường Ông Thọ, Đá viên sạch tinh khiết',
    mealPeriods: 'ALL_DAY',
    status: 'AVAILABLE',
    isBestSeller: true,
    image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-26',
    code: 'DRK-03',
    name: 'Cà Phê Muối Kem Béo Xứ Huế',
    category: 'Đồ Uống & Tráng Miệng',
    basePrice: 35000,
    description: 'Cà phê phin đậm vị kết hợp lớp kem sữa mặn béo ngậy chuẩn phong vị Cố Đô.',
    ingredients: 'Cà phê phin Robusta Arabica phối trộn, Lớp kem muối béo mặn nhẹ, Sữa đặc nguyên chất',
    mealPeriods: 'ALL_DAY',
    status: 'AVAILABLE',
    isBestSeller: false,
    image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-27',
    code: 'DRK-04',
    name: 'Trà Đào Cam Sả Tươi Mát Thanh Nhiệt',
    category: 'Đồ Uống & Tráng Miệng',
    basePrice: 42000,
    description: 'Hương vị trà đào ngọt ngào kết hợp cam tươi vắt mọng nước và sả đập dập thơm lừng giải nhiệt.',
    ingredients: 'Trà đen Ceylon hảo hạng, Đào miếng giòn ngọt ngào, Nước cam tươi vắt, Sả cây đập dập, Bạc hà',
    mealPeriods: 'ALL_DAY',
    status: 'AVAILABLE',
    isBestSeller: false,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop',
  },
  {
    id: 'm-28',
    code: 'DRK-05',
    name: 'Nước Ép Dưa Hấu Bạc Hà Tươi Nguyên Chất',
    category: 'Đồ Uống & Tráng Miệng',
    basePrice: 38000,
    description: 'Nước ép dưa hấu đỏ ngọt lịm ép chậm 100% không thêm đường kết hợp lá bạc hà mát lạnh.',
    ingredients: 'Dưa hấu Long An ngọt mọng nước ép chậm, Lá bạc hà vườn, Đá hoa tuyết',
    mealPeriods: 'ALL_DAY',
    status: 'AVAILABLE',
    isBestSeller: false,
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop',
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
      { id: '1', name: 'Phở Bò Tái Nạm Gầu Giòn Wagyu', quantity: 2, price: 89000, notes: 'Không hành lá, nhiều ớt tươi' },
      { id: '2', name: 'Trà Sen Vàng Hạt Hạt Cung Đình', quantity: 2, price: 39000 },
    ],
    totalAmount: 256000,
    createdAt: '8 phút trước',
    paymentMethod: 'QR_CODE',
  },
  {
    id: 'ord-102',
    orderNumber: 'ORD-9022',
    orderType: 'DELIVERY',
    status: 'PENDING',
    items: [
      { id: '3', name: 'Cơm Tấm Sườn Bì Chả Trứng Sài Gòn', quantity: 3, price: 79000, notes: 'Nhiều nước mắm và mỡ hành tép mỡ' },
      { id: '4', name: 'Trà Đào Cam Sả Tươi Mát Thanh Nhiệt', quantity: 3, price: 42000, notes: 'Ít đường, nhiều đá' },
    ],
    totalAmount: 363000,
    createdAt: '3 phút trước',
    customerName: 'Chị Mai Phương (FPT Tower, Tầng 8)',
    paymentMethod: 'CARD',
  },
  {
    id: 'ord-103',
    orderNumber: 'ORD-3310',
    orderType: 'DINE_IN',
    tableNo: 'Bàn 02',
    status: 'READY',
    items: [
      { id: '5', name: 'Bún Chả Hà Nội Que Tre Than Hồng', quantity: 2, price: 75000 },
      { id: '6', name: 'Cà Phê Sữa Đá Phin Đậm Đà Buôn Ma Thuột', quantity: 2, price: 29000 },
    ],
    totalAmount: 208000,
    createdAt: '15 phút trước',
    paymentMethod: 'CASH',
  },
  {
    id: 'ord-104',
    orderNumber: 'ORD-8840',
    orderType: 'TAKEAWAY',
    status: 'COMPLETED',
    items: [
      { id: '7', name: 'Bánh Mì Chảo Đặc Biệt Pate Trứng', quantity: 2, price: 55000 },
      { id: '8', name: 'Cà Phê Muối Kem Béo Xứ Huế', quantity: 2, price: 35000 },
    ],
    totalAmount: 180000,
    createdAt: '32 phút trước',
    customerName: 'Anh Quốc Tuấn',
    paymentMethod: 'QR_CODE',
  },
  {
    id: 'ord-105',
    orderNumber: 'ORD-7712',
    orderType: 'DINE_IN',
    tableNo: 'Bàn 10',
    status: 'PREPARING',
    items: [
      { id: '9', name: 'Set Lẩu Riêu Cua Bắp Bò Sườn Sụn', quantity: 1, price: 389000, notes: 'Nước dùng cay vừa, thêm rau muống' },
      { id: '10', name: 'Dĩa Ba Chỉ Bò Mỹ & Nấm Tươi Nhúng Lẩu', quantity: 2, price: 120000 },
      { id: '11', name: 'Gà Ta Ủ Muối Hoa Tiêu Nửa Con', quantity: 1, price: 160000 },
      { id: '12', name: 'Trà Sen Vàng Hạt Hạt Cung Đình', quantity: 4, price: 39000 },
    ],
    totalAmount: 945000,
    createdAt: '12 phút trước',
    customerName: 'Anh Hoàng Nam (Bàn tiệc tối)',
    paymentMethod: 'QR_CODE',
  },
  {
    id: 'ord-106',
    orderNumber: 'ORD-6520',
    orderType: 'DELIVERY',
    status: 'COMPLETED',
    items: [
      { id: '13', name: 'Cơm Gà Xối Mỡ Dưa Chua Sốt Cay', quantity: 4, price: 75000 },
      { id: '14', name: 'Nước Ép Dưa Hấu Bạc Hà Tươi', quantity: 4, price: 38000 },
    ],
    totalAmount: 452000,
    createdAt: '55 phút trước',
    customerName: 'Công ty Techcombank — Khối Vận hành',
    paymentMethod: 'QR_CODE',
  },
  {
    id: 'ord-107',
    orderNumber: 'ORD-1102',
    orderType: 'DINE_IN',
    tableNo: 'Bàn 04',
    status: 'CANCELLED',
    items: [
      { id: '15', name: 'Cơm Sườn Non Rim Mặn Ngọt Mỡ Hành', quantity: 2, price: 75000, notes: 'Khách đổi ý do món tạm hết hàng' },
    ],
    totalAmount: 150000,
    createdAt: '1 giờ trước',
    customerName: 'Khách vãng lai',
    paymentMethod: 'CASH',
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

const INITIAL_CATEGORY_OPTIONS: CategoryOption[] = [
  // 1. Phở & Bún
  { id: 'opt-pho-01', categoryId: 'cat-pho', name: 'Tô Chuẩn (Vừa Vặn)', optionType: 'SIZE', price: 0, status: 'AVAILABLE', displayOrder: 1 },
  { id: 'opt-pho-02', categoryId: 'cat-pho', name: 'Tô Lớn (Nhiều Thịt & Bánh)', optionType: 'SIZE', price: 15000, status: 'AVAILABLE', displayOrder: 2 },
  { id: 'opt-pho-03', categoryId: 'cat-pho', name: 'Tô Đặc Biệt (Full Topping)', optionType: 'SIZE', price: 25000, status: 'AVAILABLE', displayOrder: 3 },
  { id: 'opt-pho-04', categoryId: 'cat-pho', name: 'Quẩy Giòn Rụm (Đĩa 3 cái)', optionType: 'TOPPING', price: 8000, status: 'AVAILABLE', displayOrder: 4 },
  { id: 'opt-pho-05', categoryId: 'cat-pho', name: 'Trứng Chần Lòng Đào', optionType: 'TOPPING', price: 6000, status: 'AVAILABLE', displayOrder: 5 },
  { id: 'opt-pho-06', categoryId: 'cat-pho', name: 'Thịt Bò Tái Thêm', optionType: 'TOPPING', price: 20000, status: 'AVAILABLE', displayOrder: 6 },
  { id: 'opt-pho-07', categoryId: 'cat-pho', name: 'Tiết Luộc / Nước Béo Hành Trần', optionType: 'TOPPING', price: 5000, status: 'AVAILABLE', displayOrder: 7 },

  // 2. Cơm Tấm & Món Mặn
  { id: 'opt-com-01', categoryId: 'cat-com', name: 'Dĩa Chuẩn (Vừa Vặn)', optionType: 'SIZE', price: 0, status: 'AVAILABLE', displayOrder: 1 },
  { id: 'opt-com-02', categoryId: 'cat-com', name: 'Dĩa Đầy Đặn (Thêm Cơm)', optionType: 'SIZE', price: 10000, status: 'AVAILABLE', displayOrder: 2 },
  { id: 'opt-com-03', categoryId: 'cat-com', name: 'Trứng Ốp La Lòng Đào', optionType: 'TOPPING', price: 7000, status: 'AVAILABLE', displayOrder: 3 },
  { id: 'opt-com-04', categoryId: 'cat-com', name: 'Chả Trứng Hấp Sài Gòn', optionType: 'TOPPING', price: 12000, status: 'AVAILABLE', displayOrder: 4 },
  { id: 'opt-com-05', categoryId: 'cat-com', name: 'Thêm Sườn Cốt Lết Nướng', optionType: 'TOPPING', price: 30000, status: 'AVAILABLE', displayOrder: 5 },
  { id: 'opt-com-06', categoryId: 'cat-com', name: 'Chén Canh Chua Thêm', optionType: 'TOPPING', price: 10000, status: 'AVAILABLE', displayOrder: 6 },

  // 3. Bánh Mì & Điểm Tâm
  { id: 'opt-bm-01', categoryId: 'cat-banhmi', name: 'Khẩu Phần Chuẩn', optionType: 'SIZE', price: 0, status: 'AVAILABLE', displayOrder: 1 },
  { id: 'opt-bm-02', categoryId: 'cat-banhmi', name: 'Khẩu Phần Đầy Đặn', optionType: 'SIZE', price: 12000, status: 'AVAILABLE', displayOrder: 2 },
  { id: 'opt-bm-03', categoryId: 'cat-banhmi', name: 'Pate Cột Đèn Thêm', optionType: 'TOPPING', price: 10000, status: 'AVAILABLE', displayOrder: 3 },
  { id: 'opt-bm-04', categoryId: 'cat-banhmi', name: 'Xúc Xích Tiêu Đen Chiên', optionType: 'TOPPING', price: 10000, status: 'AVAILABLE', displayOrder: 4 },
  { id: 'opt-bm-05', categoryId: 'cat-banhmi', name: 'Chả Lụa Ước Lễ Thêm', optionType: 'TOPPING', price: 10000, status: 'AVAILABLE', displayOrder: 5 },
  { id: 'opt-bm-06', categoryId: 'cat-banhmi', name: 'Trứng Ốp La Thêm', optionType: 'TOPPING', price: 7000, status: 'AVAILABLE', displayOrder: 6 },

  // 4. Lẩu & Món Nhắm
  { id: 'opt-lau-01', categoryId: 'cat-lau', name: 'Set Tiêu Chuẩn (2-3 Người)', optionType: 'SIZE', price: 0, status: 'AVAILABLE', displayOrder: 1 },
  { id: 'opt-lau-02', categoryId: 'cat-lau', name: 'Set Đầy Đặn (4-5 Người)', optionType: 'SIZE', price: 90000, status: 'AVAILABLE', displayOrder: 2 },
  { id: 'opt-lau-03', categoryId: 'cat-lau', name: 'Dĩa Bắp Bò Nhúng Thêm', optionType: 'TOPPING', price: 65000, status: 'AVAILABLE', displayOrder: 3 },
  { id: 'opt-lau-04', categoryId: 'cat-lau', name: 'Dĩa Nấm Tươi Tổng Hợp', optionType: 'TOPPING', price: 35000, status: 'AVAILABLE', displayOrder: 4 },
  { id: 'opt-lau-05', categoryId: 'cat-lau', name: 'Đĩa Đậu Phụ & Váng Đậu', optionType: 'TOPPING', price: 25000, status: 'AVAILABLE', displayOrder: 5 },
  { id: 'opt-lau-06', categoryId: 'cat-lau', name: 'Mì Tôm / Bún Tươi Ăn Lẩu', optionType: 'TOPPING', price: 15000, status: 'AVAILABLE', displayOrder: 6 },

  // 5. Đồ Uống & Tráng Miệng
  { id: 'opt-drk-01', categoryId: 'cat-drink', name: 'Size Tiêu Chuẩn (Size M)', optionType: 'SIZE', price: 0, status: 'AVAILABLE', displayOrder: 1 },
  { id: 'opt-drk-02', categoryId: 'cat-drink', name: 'Size Lớn Cỡ Bự (Size L)', optionType: 'SIZE', price: 10000, status: 'AVAILABLE', displayOrder: 2 },
  { id: 'opt-drk-03', categoryId: 'cat-drink', name: 'Trân Châu Hoàng Kim', optionType: 'TOPPING', price: 8000, status: 'AVAILABLE', displayOrder: 3 },
  { id: 'opt-drk-04', categoryId: 'cat-drink', name: 'Hạt Sen Huế Ninh Mềm', optionType: 'TOPPING', price: 10000, status: 'AVAILABLE', displayOrder: 4 },
  { id: 'opt-drk-05', categoryId: 'cat-drink', name: 'Thạch Củ Năng Giòn', optionType: 'TOPPING', price: 8000, status: 'AVAILABLE', displayOrder: 5 },
  { id: 'opt-drk-06', categoryId: 'cat-drink', name: 'Kem Sữa Macchiato Béo Ngậy', optionType: 'TOPPING', price: 10000, status: 'AVAILABLE', displayOrder: 6 },
];

const INITIAL_TABLES: TableInfo[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `tbl-${i + 1}`,
  tableNo: `Bàn ${i + 1 < 10 ? '0' + (i + 1) : i + 1}`,
  capacity: (i % 3 === 0) ? 6 : (i % 2 === 0 ? 4 : 2),
  status: i === 1 || i === 4 || i === 7 ? 'OCCUPIED' : (i === 2 ? 'RESERVED' : (i === 9 ? 'CLEANING' : 'AVAILABLE')),
  currentOrderAmount: (i === 1 || i === 4 || i === 7) ? (i * 95000 + 120000) : undefined,
  occupiedSince: (i === 1 || i === 4 || i === 7) ? `${15 + i * 5} phút trước` : undefined,
  qrSecretToken: `qr-token-tbl-${i + 1 < 10 ? '0' + (i + 1) : i + 1}-sec${(i + 1) * 7391}`,
}));

const INITIAL_VOUCHERS: VoucherInfo[] = [
  {
    id: 'vch-01',
    code: 'WELCOME100',
    name: 'Quà Tặng Thành Viên Mới',
    description: 'Giảm ngay 100.000đ cho đơn hàng đầu tiên. Tự động tặng khi khách hàng mới đăng ký tài khoản thành công.',
    discountType: 'FIXED_AMOUNT',
    discountValue: 100000,
    minOrderAmount: 0, // Đơn tối thiểu 200k mới được áp dụng
    totalQuantity: 99999, // Gần như không giới hạn
    usedQuantity: 1250,
    usageLimitPerUser: 1, // Mỗi người chỉ dùng 1 lần
    startDate: '2026-01-01T00:00:00',
    endDate: '2027-12-31T23:59:59',
    status: 'ACTIVE',
    isWelcomeVoucher: true, // <-- Cờ đánh dấu đây là mã cho New Member
    createdAt: '2026-01-01T00:00:00',
  },
  {
    id: 'vch-02',
    code: 'FREELUNCH20',
    name: 'Trưa Vui Vẻ Giảm 20%',
    description: 'Giảm 20% tổng hóa đơn, tối đa 50.000đ. Áp dụng cho các bữa trưa tại nhà hàng.',
    discountType: 'PERCENTAGE',
    discountValue: 20,
    maxDiscountAmount: 50000,
    minOrderAmount: 150000,
    totalQuantity: 500,
    usedQuantity: 498, // Sắp hết lượt
    usageLimitPerUser: 2, // Cho phép dùng 2 lần
    startDate: '2026-09-01T00:00:00',
    endDate: '2026-11-30T23:59:59',
    status: 'ACTIVE',
    isWelcomeVoucher: false,
    createdAt: '2026-08-25T00:00:00',
  },
  {
    id: 'vch-03',
    code: 'SUMMER2026',
    name: 'Chào Hè Rực Rỡ',
    description: 'Giảm 50.000đ phí giao hàng cho các đơn Takeaway / Delivery.',
    discountType: 'FIXED_AMOUNT',
    discountValue: 50000,
    minOrderAmount: 200000,
    totalQuantity: 1000,
    usedQuantity: 1000, // Đã dùng hết
    usageLimitPerUser: 1,
    startDate: '2026-05-01T00:00:00',
    endDate: '2026-08-31T23:59:59',
    status: 'EXPIRED', // Đã hết hạn hoặc hết lượt
    isWelcomeVoucher: false,
    createdAt: '2026-04-15T00:00:00',
  }
];

export const useAdminStore = create<AdminState>((set) => ({
  menuItems: INITIAL_MENU,
  categoryOptions: INITIAL_CATEGORY_OPTIONS,
  orders: INITIAL_ORDERS,
  staffList: INITIAL_STAFF,
  tables: INITIAL_TABLES,
  vouchers: INITIAL_VOUCHERS, // <-- Khởi tạo Vouchers
  serviceRequests: [],

  setMenuItems: (menuItems) => set({ menuItems }),
  setCategoryOptions: (categoryOptions) => set({ categoryOptions }),
  setOrders: (orders) => set({ orders }),
  setStaffList: (staffList) => set({ staffList }),
  setTables: (tables) => set({ tables }),
  setVouchers: (vouchers) => set({ vouchers }), // <-- Thêm Setter cho Vouchers

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

  updateMenuItem: (updatedItem) =>
    set((state) => ({
      menuItems: state.menuItems.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
    })),

  deleteMenuItem: (id) =>
    set((state) => ({
      menuItems: state.menuItems.filter((item) => item.id !== id),
    })),

  toggleMenuItemStatus: (id, status) =>
    set((state) => ({
      menuItems: state.menuItems.map((item) => (item.id === id ? { ...item, status } : item)),
    })),


  // Category Options Actions
  addCategoryOption: (optionData) =>
    set((state) => ({
      categoryOptions: [
        ...state.categoryOptions,
        {
          ...optionData,
          id: `opt-${Date.now()}`,
        },
      ],
    })),

  updateCategoryOption: (updatedOption) =>
    set((state) => ({
      categoryOptions: state.categoryOptions.map((opt) => (opt.id === updatedOption.id ? updatedOption : opt)),
    })),

  toggleCategoryOptionStatus: (id, status) =>
    set((state) => ({
      categoryOptions: state.categoryOptions.map((opt) => (opt.id === id ? { ...opt, status } : opt)),
    })),

  deleteCategoryOption: (id) =>
    set((state) => ({
      categoryOptions: state.categoryOptions.filter((opt) => opt.id !== id),
    })),

  // Tables Actions
  updateTableStatus: (tableId, status) =>
    set((state) => ({
      tables: state.tables.map((tbl) =>
        tbl.id === tableId || tbl.tableNo.toLowerCase() === tableId.toLowerCase()
          ? {
            ...tbl,
            status,
            currentOrderAmount: status === 'OCCUPIED' ? (tbl.currentOrderAmount || 180000) : undefined,
            occupiedSince: status === 'OCCUPIED' ? (tbl.occupiedSince || 'Vừa vào bàn') : undefined,
          }
          : tbl
      ),
    })),

  addTable: (newTableData) =>
    set((state) => ({
      tables: [
        ...state.tables,
        {
          ...newTableData,
          id: `tbl-${Date.now()}`,
        },
      ],
    })),

  updateTable: (updatedTable) =>
    set((state) => ({
      tables: state.tables.map((t) => (t.id === updatedTable.id ? updatedTable : t)),
    })),

  deleteTable: (tableId) =>
    set((state) => ({
      tables: state.tables.filter((t) => t.id !== tableId),
    })),

  regenerateTableQrToken: (tableId) => {
    // Attempt backend API call
    fetch(`/api/tables/${tableId}/regenerate-qr`, { method: 'POST' }).catch(() => { });
    const newToken = `qr-token-${tableId}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === tableId ? { ...t, qrSecretToken: newToken } : t
      ),
    }));
  },

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

      // Dispatch event for client real-time synchronization
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('omniresto:order_status_updated', {
            detail: { id, status },
          })
        );
      }

      return { orders: updatedOrders, tables: updatedTables };
    }),

  addOrderFromClient: (newOrder) =>
    set((state) => {
      let updatedTables = state.tables;
      if (newOrder.orderType === 'DINE_IN' && newOrder.tableNo) {
        updatedTables = state.tables.map((t) =>
          t.tableNo.toLowerCase() === newOrder.tableNo?.toLowerCase()
            ? {
              ...t,
              status: 'OCCUPIED',
              currentOrderAmount: newOrder.totalAmount,
              occupiedSince: t.occupiedSince || 'Vừa gọi đơn',
              activeOrderNumber: newOrder.orderNumber,
              isVerified: t.isVerified ?? (newOrder.status !== 'PENDING'),
            }
            : t
        );
      }
      return {
        orders: [newOrder, ...state.orders.filter((o) => o.id !== newOrder.id)],
        tables: updatedTables,
      };
    }),

  verifyTableSession: (tableNo: string) =>
    set((state) => {
      const updatedTables = state.tables.map((t) =>
        t.tableNo.toLowerCase() === tableNo.toLowerCase()
          ? { ...t, isVerified: true }
          : t
      );
      const updatedOrders = state.orders.map((o) =>
        o.tableNo?.toLowerCase() === tableNo.toLowerCase() && o.status === 'PENDING'
          ? { ...o, status: 'PREPARING' as const }
          : o
      );

      // Attempt backend verify
      fetch(`/api/table-sessions/verify?tableNo=${encodeURIComponent(tableNo)}&staffId=STAFF-POS`, {
        method: 'POST',
      }).catch(() => { });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('omniresto:table_session_verified', {
            detail: { tableNo },
          })
        );
      }
      return { tables: updatedTables, orders: updatedOrders };
    }),

  setTablePaymentRequested: (tableNo: string, requested: boolean) =>
    set((state) => ({
      tables: state.tables.map((t) =>
        t.tableNo.toLowerCase() === tableNo.toLowerCase()
          ? { ...t, paymentRequested: requested }
          : t
      ),
    })),

  confirmTablePayment: (tableNo: string) =>
    set((state) => {
      const updatedTables = state.tables.map((t) =>
        t.tableNo.toLowerCase() === tableNo.toLowerCase()
          ? { ...t, isPaid: true, paymentRequested: false }
          : t
      );
      const updatedOrders = state.orders.map((o) =>
        o.tableNo?.toLowerCase() === tableNo.toLowerCase()
          ? { ...o, status: 'COMPLETED' as const }
          : o
      );

      // Attempt backend confirm payment
      const targetTable = state.tables.find(t => t.tableNo.toLowerCase() === tableNo.toLowerCase());
      if (targetTable?.activeSessionToken) {
        fetch(`/api/table-sessions/confirm-payment?sessionToken=${encodeURIComponent(targetTable.activeSessionToken)}&staffId=STAFF-POS`, {
          method: 'POST',
        }).catch(() => { });
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('omniresto:order_status_updated', {
            detail: { tableNo, status: 'COMPLETED' },
          })
        );
      }

      return { tables: updatedTables, orders: updatedOrders };
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

  // <-- Action Bật/Tắt trạng thái Voucher
  toggleVoucherStatus: (id, status) =>
    set((state) => ({
      vouchers: state.vouchers.map((v) => (v.id === id ? { ...v, status } : v)),
    })),
  // Service Requests actions
  addServiceRequest: (req) =>
    set((state) => {
      const newReq: ServiceRequestItem = {
        id: `sr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        tableNo: req.tableNo,
        orderId: req.orderId,
        requestText: req.requestText,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        status: 'OPEN',
      };
      return { serviceRequests: [newReq, ...state.serviceRequests] };
    }),

  resolveServiceRequest: (id) =>
    set((state) => ({
      serviceRequests: state.serviceRequests.map((sr) =>
        sr.id === id ? { ...sr, status: 'RESOLVED' } : sr
      ),
    })),

  resolveServiceRequestsByTable: (tableNo) =>
    set((state) => ({
      serviceRequests: state.serviceRequests.map((sr) =>
        sr.tableNo.toLowerCase() === tableNo.toLowerCase() ? { ...sr, status: 'RESOLVED' } : sr
      ),
    })),

  clearAllServiceRequests: () =>
    set((state) => ({
      serviceRequests: state.serviceRequests.map((sr) => ({ ...sr, status: 'RESOLVED' })),
    })),
}))

// Listen to Client events across the window/tab
if (typeof window !== 'undefined') {
  window.addEventListener('omniresto:service_request', ((e: CustomEvent<{ tableNo: string; orderId?: string; requestText: string }>) => {
    if (e.detail?.tableNo && e.detail?.requestText) {
      useAdminStore.getState().addServiceRequest(e.detail);
    }
  }) as EventListener);

  window.addEventListener('omniresto:payment_requested', ((e: CustomEvent<{ tableNo: string }>) => {
    if (e.detail?.tableNo) {
      useAdminStore.getState().setTablePaymentRequested(e.detail.tableNo, true);
    }
  }) as EventListener);

  window.addEventListener('omniresto:payment_request_cancelled', ((e: CustomEvent<{ tableNo: string }>) => {
    if (e.detail?.tableNo) {
      useAdminStore.getState().setTablePaymentRequested(e.detail.tableNo, false);
    }
  }) as EventListener);
}

