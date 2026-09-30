-- Initial Seed Data for OmniResto F&B Chain (Cơm Văn Phòng & Phân Chia Theo Buổi)

-- Categories
INSERT INTO categories (id, code, name, description, display_order)
VALUES
('cat-01', 'BREAKFAST', 'Điểm Tâm Sáng', 'Các món xôi xéo, bánh mì, chè thanh mát', 1),
('cat-02', 'LUNCH', 'Cơm Văn Phòng & Bún Trưa', 'Cơm tấm sườn nướng, cơm gà xối mỡ, bún chả, phở bò', 2),
('cat-03', 'DINNER', 'Lẩu & Món Nhắm Ca Tối', 'Set lẩu riêu cua bắp bò, lẩu Thái tomyum, đĩa nhúng lẩu', 3),
('cat-04', 'DRINK', 'Đồ Uống Cả Ngày', 'Trà sen vàng, cà phê phin sữa đá, nước ép', 4)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Menu Items
INSERT INTO menu_items (id, code, name, category_id, price, description, ingredients, status, is_best_seller, meal_periods, image_url)
VALUES
-- ── SÁNG (06:00 - 10:30) ──
('m-01', 'XOI-01', 'Xôi Xéo Gà Xé Nấm Hương', 'cat-01', 45000.00, 'Xôi xéo dẻo thơm hạt nếp cái hoa vàng, gà xé đậm đà, hành phi giòn tan và rưới mỡ gà béo ngậy.', 'Gạo nếp cái hoa vàng, Đậu xanh đồ mịn, Thịt đùi gà xé sợi, Nấm hương Sa Pa, Hành khô phi giòn, Mỡ gà ta nguyên chất', 'available', TRUE, 'MORNING', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop'),
('m-02', 'BM-01', 'Bánh Mì Chảo Đặc Biệt Pate Trứng', 'cat-01', 55000.00, 'Chảo gang nóng hổi gồm trứng ốp la lòng đào, pate Cột Đèn béo ngậy, xúc xích tiêu đen và sốt cà chua bí truyền.', 'Bánh mì giòn vỏ, Pate gan heo Cột Đèn, 2 trứng gà ta ốp la, Xúc xích tiêu, Xíu mại thịt băm, Sốt vang cà chua', 'available', TRUE, 'MORNING', 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=500&auto=format&fit=crop'),
('m-03', 'BM-02', 'Bánh Mì Heo Quay Giòn Bì Dưa Chua', 'cat-01', 38000.00, 'Bánh mì nướng giòn rụm kẹp thịt ba chỉ heo quay nổ cốm giòn tan, dưa leo và sốt ớt cay ngọt.', 'Bánh mì nóng giòn, Heo quay nổ cốm da giòn, Dưa leo, Ngò rí, Đồ chua, Nước sốt heo quay thảo quả', 'available', FALSE, 'MORNING', 'https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?w=500&auto=format&fit=crop'),
('m-04', 'XOI-02', 'Xôi Khúc Hoàng Mai Chả Lụa Nóng', 'cat-01', 35000.00, 'Hạt xôi mềm dẻo bọc nhân rau khúc tươi thơm nức, đậu xanh tiêu sọ, thịt ba chỉ và kèm 2 lát chả lụa.', 'Nếp nương dẻo, Lá khúc tươi, Đậu xanh đồ nhuyễn, Thịt ba chỉ rim tiêu sọ, Chả lụa Ước Lễ', 'available', FALSE, 'MORNING', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop'),
('m-05', 'BC-01', 'Bánh Cuốn Nóng Thanh Trì Chả Quế', 'cat-01', 40000.00, 'Bánh tráng tay mỏng mướt trắng ngần rắc mộc nhĩ thịt băm, chấm nước mắm cà cuống ấm nóng và chả quế giòn sần sật.', 'Bột gạo tẻ tráng mỏng, Mộc nhĩ thịt nạc vai băm, Hành phi thơm lừng, Chả quế nướng vàng, Nước mắm chua ngọt', 'available', FALSE, 'MORNING', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop'),
('m-06', 'CHE-01', 'Chè Hạt Sen Bọc Nhãn Lồng Bột Sắn', 'cat-01', 35000.00, 'Món chè cung đình thanh tao, hạt sen bùi ngậy lồng trong cùi nhãn giòn ngọt, nước đường phèn hoa bưởi thanh mát.', 'Hạt sen Huế tươi ninh mềm, Cùi nhãn lồng Hưng Yên, Bột sắn dây hoa bưởi, Đường phèn Quảng Ngãi', 'out_of_stock', FALSE, 'MORNING', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop'),

-- ── TRƯA (10:30 - 14:30) ──
('m-07', 'COM-01', 'Cơm Tấm Sườn Bì Chả Trứng Sài Gòn', 'cat-02', 79000.00, 'Sườn cốt lết ướp mật ong nướng than hoa thơm lừng, chả trứng chưng chuẩn vị Sài Gòn, bì giòn và mỡ hành tép mỡ.', 'Gạo tấm thơm dẻo, Sườn cốt lết nướng than, Bì heo thính gạo rang, Chả trứng mộc nhĩ, Trứng ốp la, Mỡ hành tép mỡ, Nước mắm chua ngọt', 'available', TRUE, 'NOON', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&auto=format&fit=crop'),
('m-08', 'COM-02', 'Cơm Gà Xối Mỡ Dưa Chua Sốt Cay', 'cat-02', 75000.00, 'Góc phần tư đùi gà xối mỡ vàng ươm da giòn rụm, cơm rang hạt ngọc thơm phức, ăn kèm dưa muối giòn chua giải ngấy.', 'Đùi gà xối mỡ giòn da, Cơm chiên tỏi nghệ, Dưa cải chua xào tóp mỡ, Dưa leo, Cà chua, Nước tương tỏi ớt gừng', 'available', TRUE, 'NOON', 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&auto=format&fit=crop'),
('m-09', 'COM-03', 'Cơm Cá Basa Kho Tộ Canh Chua Bông Điên Điển', 'cat-02', 72000.00, 'Khúc cá basa kho tiêu tộ đất sánh đặc đậm đà keo vị, ăn kèm niêu canh chua cá bông điên điển thanh mát.', 'Cá basa tươi cắt khúc, Nước hàng dừa Bến Tre, Tiêu đen Phú Quốc, Nước cốt me, Bông điên điển, Bạc hà', 'available', FALSE, 'NOON', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop'),
('m-10', 'COM-04', 'Cơm Bò Lúc Lắc Khoai Tây Chiên Bơ Tỏi', 'cat-02', 85000.00, 'Thịt thăn bò Úc thái quân cờ xào lửa lớn sốt tiêu đen bóng mượt, dùng kèm khoai tây chiên bơ vàng ươm và cơm trắng.', 'Thăn bò Úc mềm ngọt, Ớt chuông Đà Lạt, Hành tây xào tiêu đen bơ tỏi, Khoai tây chiên giòn, Cơm thơm lài', 'available', FALSE, 'NOON', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop'),
('m-11', 'COM-05', 'Cơm Sườn Non Rim Mặn Ngọt Mỡ Hành', 'cat-02', 75000.00, 'Sườn non heo rim nước mắm tỏi ớt keo lại mặn ngọt đưa cơm, chan mỡ hành thơm phức.', 'Sườn non heo chọn lọc, Nước mắm cá cơm truyền thống, Tỏi ớt băm nhuyễn, Mỡ hành lá tép mỡ', 'out_of_stock', FALSE, 'NOON', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&auto=format&fit=crop'),
('m-12', 'BUN-01', 'Bún Chả Hà Nội Que Tre Than Hồng', 'cat-02', 75000.00, 'Thịt ba chỉ thái mỏng và chả băm kẹp que tre nướng than hoa thơm nức mũi, nước chấm đu đủ ấm nóng kèm bún tươi.', 'Thịt ba chỉ nướng than, Chả viên hành sả nướng que tre, Bún tươi Phú Đô, Đu đủ cà rốt muối chua, Rau sống kinh giới tía tô', 'available', TRUE, 'NOON', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop'),
('m-13', 'PHO-01', 'Phở Bò Tái Nạm Gầu Giòn Wagyu', 'cat-02', 89000.00, 'Nước dùng phở bò truyền thống hầm xương tủy 24h thơm mùi quế hồi thảo quả, thịt bò Wagyu tái mềm ngọt.', 'Bò Wagyu thái mỏng, Nạm gầu giòn, Bánh phở tươi Hà Nội, Nước hầm xương bò thảo mộc 24h, Hành hoa, Ngò gai, Giấm tỏi ớt', 'available', TRUE, 'NOON', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop'),
('m-14', 'BBH-01', 'Bún Bò Huế Chả Cua Giò Heo Cay Nồng', 'cat-02', 79000.00, 'Nước dùng bún bò hầm xương ống dậy mùi mắm ruốc sả ớt, khoanh giò heo mềm ngậy, chả cua bể và tiết luộc.', 'Sợi bún to Huế, Bắp bò hoa, Giò heo hầm mềm, Chả cua bể tươi, Nước dùng sả ớt mắm ruốc Bà Duệ', 'available', FALSE, 'NOON', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop'),
('m-15', 'BD-01', 'Bún Đậu Mắm Tôm Thập Cẩm Chả Cốm', 'cat-02', 75000.00, 'Mẹt bún lá cắt miếng, đậu hũ Mơ rán phồng giòn rụm chấm mắm tôm Thanh Hóa đánh sủi bọt với quất và ớt tươi.', 'Bún lá tươi cắt con cờ, Đậu hũ Mơ chiên phồng, Chả cốm làng Vòng, Nem rán giòn, Thịt chân giò luộc, Mắm tôm Thanh Hóa', 'available', FALSE, 'NOON', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop'),

-- ── TỐI (16:30 - 22:00) ──
('m-16', 'LAU-01', 'Set Lẩu Riêu Cua Bắp Bò Sườn Sụn', 'cat-03', 389000.00, 'Set lẩu riêu cua đồng xịn giã tay dậy mùi giấm bỗng nếp, thịt bắp bò hoa giòn ngọt và sườn sụn non chặt nhỏ.', 'Cua đồng tươi giã tay gạch béo ngậy, Bắp bò hoa thái mỏng, Sườn sụn non chặt con chì, Giấm bỗng nếp làng Vân, Mướp hương, Hoa chuối, Bún tươi', 'available', TRUE, 'EVENING', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop'),
('m-17', 'LAU-02', 'Set Lẩu Thái Hải Sản Tomyum Chua Cay', 'cat-03', 429000.00, 'Nước lẩu Tomyum đậm đà chuẩn vị Thái với cốt dừa thơm béo, lá chanh kaffir, tôm sú tươi nhảy tanh tách, mực ống và nghêu.', 'Tôm sú tươi sống, Mực ống câu Cô Tô, Nghêu biển trắng, Nước cốt lẩu Tomyum lá chanh sả ớt cốt dừa, Nấm kim châm, Rau muống giòn, Mì tôm', 'available', TRUE, 'EVENING', 'https://images.unsplash.com/photo-1547496502-affa22d38842?w=500&auto=format&fit=crop'),
('m-18', 'LAU-03', 'Set Lẩu Gà Lá É Phú Yên Nấm Tuyết', 'cat-03', 369000.00, 'Lẩu gà đồi thả vườn thịt săn chắc, nước lẩu ngọt thanh từ xương gà và tiêu xanh cay nồng, nhúng lá é tươi thơm mát.', 'Gà ta thả đồi 1.4kg, Lá é trắng tươi Phú Yên, Măng củ giòn ngọt, Tiêu xanh cay nồng, Nấm tuyết trắng, Bún tươi', 'available', FALSE, 'EVENING', 'https://images.unsplash.com/photo-1547496502-affa22d38842?w=500&auto=format&fit=crop'),
('m-19', 'NHU-01', 'Dĩa Ba Chỉ Bò Mỹ & Nấm Tươi Nhúng Lẩu', 'cat-03', 120000.00, 'Đĩa thịt ba chỉ bò Mỹ cuộn cuộn vân mỡ hoa đẹp mắt kèm đĩa nấm tươi tổng hợp nhúng lẩu.', 'Ba chỉ bò Black Angus Mỹ thái lát mỏng, Nấm kim châm, Nấm đùi gà baby, Nấm bào ngư', 'available', TRUE, 'EVENING', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop'),
('m-20', 'NHU-02', 'Dĩa Tôm Sú Biển & Mực Trứng Nhúng Lẩu', 'cat-03', 145000.00, 'Đĩa hải sản tươi sống gồm 6 con tôm sú biển tươi giòn và mực trứng Phú Quốc béo ngậy.', 'Tôm sú biển còn bơi, Mực trứng hấp sơ đá lạnh, Nước sốt tiêu chanh ớt xanh', 'available', FALSE, 'EVENING', 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=500&auto=format&fit=crop'),
('m-21', 'NHA-01', 'Gà Ta Ủ Muối Hoa Tiêu Nửa Con', 'cat-03', 160000.00, 'Gà đồi ủ muối hoa tiêu da vàng giòn sần sật, thịt ngọt thơm mùi lá chanh, chấm muối ớt chanh chuẩn vị nhắm bia.', 'Nửa con gà ta ủ muối, Muối hạt rang thơm, Tiêu sọ Phú Quốc, Lá chanh thái chỉ, Nước chấm sữa ớt đỏ', 'available', FALSE, 'EVENING', 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&auto=format&fit=crop'),
('m-22', 'NHA-02', 'Nộm Tai Heo Bóp Thấu Ngó Sen Giòn Cay', 'cat-03', 85000.00, 'Món khai vị nhắm lai rai giòn sần sật, ngó sen ngâm chua ngọt trộn tai heo giòn và lạc rang giã dập.', 'Tai heo luộc giòn thái chỉ, Ngó sen tươi muối chua ngọt, Rau răm, Húng lủi, Lạc rang giã thô, Nước mắm chua cay', 'available', FALSE, 'EVENING', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop'),
('m-23', 'NHA-03', 'Đậu Hũ Lướt Ván Giòn Rụm Chấm Mắm Tôm', 'cat-03', 45000.00, 'Đậu hũ non lướt chảo dầu sôi da giòn rụm bên trong mềm mịn tan trong miệng.', 'Đậu hũ non làng Mơ, Hành hoa phi mỡ, Mắm tôm Thanh Hóa đánh sủi bọt quất ớt tươi', 'out_of_stock', FALSE, 'EVENING', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop'),

-- ── CẢ NGÀY (06:00 - 22:00) ──
('m-24', 'DRK-01', 'Trà Sen Vàng Hạt Hạt Cung Đình', 'cat-04', 39000.00, 'Trà oolong ướp sen Huế tự nhiên kết hợp củ năng giòn rụm ngọt thanh và hạt sen tươi ninh mềm.', 'Trà oolong sen Huế, Hạt sen tươi ninh mềm, Củ năng giòn ngọt ngào, Kem macchiato béo nhẹ, Đường phèn thanh', 'available', TRUE, 'ALL_DAY', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop'),
('m-25', 'DRK-02', 'Cà Phê Sữa Đá Phin Đậm Đà Buôn Ma Thuột', 'cat-04', 29000.00, 'Cà phê Robusta Đắk Lắk nguyên chất pha phin nhôm truyền thống, hòa quyện sữa đặc thơm béo và đá viên mát lạnh.', 'Hạt Robusta mộc Buôn Ma Thuột, Sữa đặc có đường Ông Thọ, Đá viên sạch tinh khiết', 'available', TRUE, 'ALL_DAY', 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&auto=format&fit=crop'),
('m-26', 'DRK-03', 'Cà Phê Muối Kem Béo Xứ Huế', 'cat-04', 35000.00, 'Cà phê phin đậm vị kết hợp lớp kem sữa mặn béo ngậy chuẩn phong vị Cố Đô.', 'Cà phê phin Robusta Arabica phối trộn, Lớp kem muối béo mặn nhẹ, Sữa đặc nguyên chất', 'available', FALSE, 'ALL_DAY', 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&auto=format&fit=crop'),
('m-27', 'DRK-04', 'Trà Đào Cam Sả Tươi Mát Thanh Nhiệt', 'cat-04', 42000.00, 'Hương vị trà đào ngọt ngào kết hợp cam tươi vắt mọng nước và sả đập dập thơm lừng giải nhiệt.', 'Trà đen Ceylon hảo hạng, Đào miếng giòn ngọt ngào, Nước cam tươi vắt, Sả cây đập dập, Bạc hà', 'available', FALSE, 'ALL_DAY', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop'),
('m-28', 'DRK-05', 'Nước Ép Dưa Hấu Bạc Hà Tươi Nguyên Chất', 'cat-04', 38000.00, 'Nước ép dưa hấu đỏ ngọt lịm ép chậm 100% không thêm đường kết hợp lá bạc hà mát lạnh.', 'Dưa hấu Long An ngọt mọng nước ép chậm, Lá bạc hà vườn, Đá hoa tuyết', 'available', FALSE, 'ALL_DAY', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop')
ON DUPLICATE KEY UPDATE name=VALUES(name), status=VALUES(status), ingredients=VALUES(ingredients), meal_periods=VALUES(meal_periods), price=VALUES(price);

-- Tables
INSERT INTO tables (id, table_no, capacity, status)
VALUES
('tbl-1', 'Bàn 01', 2, 'available'),
('tbl-2', 'Bàn 02', 4, 'occupied'),
('tbl-3', 'Bàn 03', 6, 'available'),
('tbl-4', 'Bàn 04', 2, 'available'),
('tbl-5', 'Bàn 05', 4, 'reserved'),
('tbl-6', 'Bàn 06', 6, 'occupied'),
('tbl-7', 'Bàn 07', 2, 'available'),
('tbl-8', 'Bàn 08', 4, 'available'),
('tbl-9', 'Bàn 09', 6, 'available'),
('tbl-10', 'Bàn 10', 8, 'reserved'),
('tbl-11', 'Bàn 11', 2, 'available'),
('tbl-12', 'Bàn 12', 4, 'available')
ON DUPLICATE KEY UPDATE status=VALUES(status), capacity=VALUES(capacity);

-- Users (Staff)
INSERT INTO users (id, full_name, email, phone, password, role, status, avatar)
VALUES
('usr-01', 'Lê Minh Tuấn', 'admin@omniresto.vn', '0905123456', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8qS.w/uYv6XFv1gA2ZpMqm16s7k1mK', 'admin', 'active', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop'),
('usr-02', 'Nguyễn Văn Minh', 'manager@omniresto.vn', '0912345678', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8qS.w/uYv6XFv1gA2ZpMqm16s7k1mK', 'store_manager', 'active', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop'),
('usr-03', 'Trần Thị Thu Thảo', 'cashier@omniresto.vn', '0988777666', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8qS.w/uYv6XFv1gA2ZpMqm16s7k1mK', 'cashier', 'active', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop'),
('usr-04', 'Đỗ Hoàng (Bếp Trưởng)', 'chef@omniresto.vn', '0933222111', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8qS.w/uYv6XFv1gA2ZpMqm16s7k1mK', 'chef', 'active', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop'),
('usr-05', 'Phạm Hồng Nhung', 'waiter@omniresto.vn', '0977444333', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8qS.w/uYv6XFv1gA2ZpMqm16s7k1mK', 'waiter', 'active', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop')
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), role=VALUES(role), status=VALUES(status);

-- Orders
INSERT INTO orders (id, order_number, table_id, table_no, order_type, status, total_amount, customer_name, payment_method)
VALUES
('ord-101', 'ORD-8841', 'tbl-6', 'Bàn 06', 'DINE_IN', 'PREPARING', 256000.00, 'Anh Tuấn', 'QR_CODE'),
('ord-102', 'ORD-9022', NULL, NULL, 'DELIVERY', 'PENDING', 363000.00, 'Chị Mai Phương (FPT Tower, Tầng 8)', 'CARD'),
('ord-103', 'ORD-3310', 'tbl-2', 'Bàn 02', 'DINE_IN', 'READY', 208000.00, 'Khách bàn 02', 'CASH'),
('ord-104', 'ORD-8840', NULL, NULL, 'TAKEAWAY', 'COMPLETED', 180000.00, 'Anh Quốc Tuấn', 'QR_CODE'),
('ord-105', 'ORD-7712', 'tbl-10', 'Bàn 10', 'DINE_IN', 'PREPARING', 945000.00, 'Anh Hoàng Nam (Bàn tiệc tối)', 'TRANSFER')
ON DUPLICATE KEY UPDATE status=VALUES(status), total_amount=VALUES(total_amount);

-- Order Items
INSERT INTO order_items (id, order_id, menu_item_id, item_name, quantity, unit_price, notes)
VALUES
('oi-101-1', 'ord-101', 'm-13', 'Phở Bò Tái Nạm Gầu Giòn Wagyu', 2, 89000.00, 'Không hành lá, nhiều ớt'),
('oi-101-2', 'ord-101', 'm-24', 'Trà Sen Vàng Hạt Hạt Cung Đình', 2, 39000.00, NULL),
('oi-102-1', 'ord-102', 'm-07', 'Cơm Tấm Sườn Bì Chả Trứng Sài Gòn', 3, 79000.00, 'Nhiều mỡ hành tép mỡ'),
('oi-102-2', 'ord-102', 'm-27', 'Trà Đào Cam Sả Tươi Mát Thanh Nhiệt', 3, 42000.00, 'Ít đường, nhiều đá'),
('oi-103-1', 'ord-103', 'm-12', 'Bún Chả Hà Nội Que Tre Than Hồng', 2, 75000.00, NULL),
('oi-103-2', 'ord-103', 'm-25', 'Cà Phê Sữa Đá Phin Đậm Đà Buôn Ma Thuột', 2, 29000.00, NULL),
('oi-104-1', 'ord-104', 'm-02', 'Bánh Mì Chảo Đặc Biệt Pate Trứng', 2, 55000.00, NULL),
('oi-104-2', 'ord-104', 'm-26', 'Cà Phê Muối Kem Béo Xứ Huế', 2, 35000.00, NULL),
('oi-105-1', 'ord-105', 'm-16', 'Set Lẩu Riêu Cua Bắp Bò Sườn Sụn', 1, 389000.00, 'Nước dùng cay vừa, thêm rau'),
('oi-105-2', 'ord-105', 'm-19', 'Dĩa Ba Chỉ Bò Mỹ & Nấm Tươi Nhúng Lẩu', 2, 120000.00, NULL),
('oi-105-3', 'ord-105', 'm-21', 'Gà Ta Ủ Muối Hoa Tiêu Nửa Con', 1, 160000.00, NULL),
('oi-105-4', 'ord-105', 'm-24', 'Trà Sen Vàng Hạt Hạt Cung Đình', 4, 39000.00, NULL)
ON DUPLICATE KEY UPDATE quantity=VALUES(quantity), unit_price=VALUES(unit_price);
