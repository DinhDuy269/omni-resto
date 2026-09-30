-- Initial Seed Data for OmniResto F&B Chain

-- Categories
INSERT INTO categories (id, code, name, description, display_order)
VALUES
('cat-01', 'PHO_BUN', 'Phở & Bún', 'Các món phở truyền thống và bún nước đặc sắc', 1),
('cat-02', 'COM_MAIN', 'Cơm & Món Chính', 'Cơm tấm Sài Gòn, cơm chiên mắm ruốc', 2),
('cat-03', 'SIDE_DISH', 'Món Ăn Kèm', 'Gỏi cuốn, nem rán, chả giò giòn rụm', 3),
('cat-04', 'DRINK', 'Đồ Uống', 'Trà sen vàng, nước ép trái cây tươi mát', 4)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Menu Items
INSERT INTO menu_items (id, code, name, category_id, price, description, ingredients, status, is_best_seller, meal_periods, image_url)
VALUES
('m-01', 'PHO-01', 'Phở Bò Tái Nạm Đặc Biệt', 'cat-01', 89000.00, 'Nước dùng hầm xương 24h truyền thống, thịt bò Wagyu tái nạm mềm thơm ngậy.', 'Bò Wagyu thái mỏng, Nạm bò gừng, Bánh phở tươi Hà Nội, Hành hoa, Ngò gai, Nước hầm xương bò 24h thảo mộc', 'available', TRUE, 'MORNING,NOON', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop'),
('m-02', 'BUN-02', 'Bún Chả Hà Nội Than Hồng', 'cat-01', 79000.00, 'Chả nướng than hoa thơm lừng kèm bún tươi, nem rán giòn rụm và nước chấm chuẩn vị.', 'Thịt ba chỉ nướng than, Chả viên nướng sả, Bún tươi, Đu đủ cà rốt chua, Nem rán giòn, Nước mắm tỏi ớt', 'available', TRUE, 'NOON,EVENING', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop'),
('m-03', 'COM-01', 'Cơm Tấm Sườn Bì Chả Trứng', 'cat-02', 85000.00, 'Sườn nướng mật ong đậm đà, chả trứng chưng chuẩn vị Sài Gòn, mỡ hành béo ngậy.', 'Gạo tấm thơm, Sườn nướng mật ong hoa cà phê, Bì heo thính, Chả trứng hấp mộc nhĩ, Trứng ốp la, Mỡ hành tép mỡ', 'available', TRUE, 'MORNING,NOON,EVENING', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&auto=format&fit=crop'),
('m-04', 'DRK-01', 'Trà Sen Vàng Hạt Hạt Cung Đình', 'cat-04', 39000.00, 'Trà sen Huế ướp lạnh tự nhiên kết hợp củ năng giòn ngọt và hạt sen thơm bùi.', 'Trà oolong sen Huế, Hạt sen tươi ninh mềm, Củ năng giòn ngọt, Kem cheese béo ngậy, Đường phèn thanh mát', 'available', TRUE, 'MORNING,NOON,EVENING', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop')
ON DUPLICATE KEY UPDATE name=VALUES(name), status=VALUES(status), ingredients=VALUES(ingredients), meal_periods=VALUES(meal_periods);
