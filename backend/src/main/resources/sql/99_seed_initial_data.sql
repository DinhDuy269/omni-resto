-- Initial Seed Data for OmniResto F&B Chain

-- Branches
INSERT INTO branches (id, code, name, address, phone, manager_name, status, tables_count, daily_revenue, rating)
VALUES 
('br-01', 'HN-HK', 'OmniResto - Hoàn Kiếm', '42 Tràng Tiền, Q. Hoàn Kiếm, Hà Nội', '024 3825 9999', 'Nguyễn Văn Minh', 'active', 24, 28500000.00, 4.9),
('br-02', 'HCM-Q1', 'OmniResto - Quận 1', '88 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM', '028 3822 8888', 'Trần Thị Thu Thảo', 'active', 30, 34200000.00, 4.8),
('br-03', 'DN-HC', 'OmniResto - Hải Châu', '150 Bạch Đằng, Q. Hải Châu, Đà Nẵng', '0236 3811 777', 'Lê Hoàng Nam', 'active', 20, 19800000.00, 4.7)
ON DUPLICATE KEY UPDATE name=VALUES(name), status=VALUES(status);

-- Categories
INSERT INTO categories (id, code, name, description, display_order)
VALUES
('cat-01', 'PHO_BUN', 'Phở & Bún', 'Các món phở truyền thống và bún nước đặc sắc', 1),
('cat-02', 'COM_MAIN', 'Cơm & Món Chính', 'Cơm tấm Sài Gòn, cơm chiên mắm ruốc', 2),
('cat-03', 'SIDE_DISH', 'Món Ăn Kèm', 'Gỏi cuốn, nem rán, chả giò giòn rụm', 3),
('cat-04', 'DRINK', 'Đồ Uống', 'Trà sen vàng, nước ép trái cây tươi mát', 4)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Menu Items
INSERT INTO menu_items (id, code, name, category_id, base_price, description, status, is_best_seller, image_url)
VALUES
('m-01', 'PHO-01', 'Phở Bò Tái Nạm Đặc Biệt', 'cat-01', 89000.00, 'Nước dùng hầm xương 24h truyền thống, thịt bò Wagyu tái nạm mềm thơm ngậy.', 'available', TRUE, 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop'),
('m-02', 'BUN-02', 'Bún Chả Hà Nội Than Hồng', 'cat-01', 79000.00, 'Chả nướng than hoa thơm lừng kèm bún tươi, nem rán giòn rụm và nước chấm chuẩn vị.', 'available', TRUE, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop'),
('m-03', 'COM-01', 'Cơm Tấm Sườn Bì Chả Trứng', 'cat-02', 85000.00, 'Sườn nướng mật ong đậm đà, chả trứng chưng chuẩn vị Sài Gòn, mỡ hành béo ngậy.', 'available', TRUE, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&auto=format&fit=crop'),
('m-04', 'DRK-01', 'Trà Sen Vàng Hạt Hạt Cung Đình', 'cat-04', 39000.00, 'Trà sen Huế ướp lạnh tự nhiên kết hợp củ năng giòn ngọt và hạt sen thơm bùi.', 'available', TRUE, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop')
ON DUPLICATE KEY UPDATE name=VALUES(name), status=VALUES(status);
