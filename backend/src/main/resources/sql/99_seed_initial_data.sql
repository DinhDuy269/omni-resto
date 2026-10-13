-- ============================================================================
-- OmniResto Initial Seed Data (Standardized with Base Size 0đ & Full Options)
-- Location: backend/src/main/resources/sql/99_seed_initial_data.sql
-- ============================================================================

-- 1. Categories
INSERT INTO categories (id, code, name, description, display_order)
VALUES
('cat-01', 'PHO_BUN', 'Phở & Bún Nước', 'Các món phở truyền thống hầm xương 24h và bún nước đặc sản 3 miền', 1),
('cat-02', 'COM_TAM', 'Cơm Tấm & Món Mặn', 'Cơm tấm sườn bì chả nướng than hoa và các món cơm gia đình đậm đà', 2),
('cat-03', 'BANH_MI', 'Bánh Mì & Điểm Tâm', 'Bánh mì giòn rụm, bánh cuốn nóng và xôi nếp thơm nức mũi', 3),
('cat-04', 'LAU_NHAM', 'Lẩu & Món Nhắm', 'Lẩu riêu cua đồng, lẩu hải sản tomyum và các món nhậu lai rai trứ danh', 4),
('cat-05', 'KHAI_VI', 'Khai Vị & Gỏi Cuốn', 'Nem rán rế, gỏi ngó sen tôm thịt, salad tươi mát khởi đầu bữa tiệc', 5),
('cat-06', 'DO_UONG', 'Đồ Uống & Cà Phê', 'Trà sen vàng, cà phê phin sữa đá, nước ép hoa quả nguyên chất thanh mát', 6),
('cat-07', 'TRANG_MIENG', 'Tráng Miệng & Chè', 'Chè hạt sen long nhãn, bánh flan caramel và kem tráng miệng thanh tao', 7),
('cat-08', 'MON_CHAY', 'Món Chay Thanh Tịnh', 'Món ăn thuần chay từ nấm tươi hữu cơ và rau củ quả Đà Lạt thanh lọc', 8),
('cat-09', 'HAI_SAN', 'Hải Sản Tươi Sống', 'Hải sản tươi sống hấp sả gừng, nướng mỡ hành, rang muối ớt thượng hạng', 9),
('cat-10', 'COMBO', 'Combo Tiết Kiệm', 'Set ăn trọn gói tiện lợi, cân đối dinh dưỡng và tiết kiệm', 10)
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), display_order=VALUES(display_order);

-- 2. Category Options (Tùy chọn kích cỡ & Topping cho toàn bộ 10 danh mục)
INSERT INTO category_options (id, category_id, name, option_type, price, status, display_order)
VALUES
-- 1. Phở & Bún Nước (cat-01)
('opt-01', 'cat-01', 'Tô Chuẩn (Vừa Vặn)', 'size', 0.00, 'AVAILABLE', 1),
('opt-02', 'cat-01', 'Tô Lớn (Nhiều Thịt & Bánh)', 'size', 15000.00, 'AVAILABLE', 2),
('opt-03', 'cat-01', 'Tô Đặc Biệt (Full Topping)', 'size', 25000.00, 'AVAILABLE', 3),
('opt-04', 'cat-01', 'Thêm Quẩy Giòn Rụm (Đĩa 3 cái)', 'topping', 8000.00, 'AVAILABLE', 4),
('opt-05', 'cat-01', 'Thêm Trứng Chần Lòng Đào', 'topping', 6000.00, 'AVAILABLE', 5),
('opt-06', 'cat-01', 'Thịt Bò Tái Thêm', 'topping', 20000.00, 'AVAILABLE', 6),
('opt-07', 'cat-01', 'Tiết Luộc / Nước Béo Hành Trần', 'topping', 5000.00, 'AVAILABLE', 7),

-- 2. Cơm Tấm & Món Mặn (cat-02)
('opt-08', 'cat-02', 'Dĩa Chuẩn (Vừa Vặn)', 'size', 0.00, 'AVAILABLE', 1),
('opt-09', 'cat-02', 'Dĩa Đầy Đặn (Thêm Cơm)', 'size', 10000.00, 'AVAILABLE', 2),
('opt-10', 'cat-02', 'Trứng Ốp La Lòng Đào', 'topping', 7000.00, 'AVAILABLE', 3),
('opt-11', 'cat-02', 'Chả Trứng Hấp Sài Gòn', 'topping', 12000.00, 'AVAILABLE', 4),
('opt-12', 'cat-02', 'Thêm Sườn Cốt Lết Nướng', 'topping', 30000.00, 'AVAILABLE', 5),
('opt-13', 'cat-02', 'Chén Canh Chua Thêm', 'topping', 10000.00, 'AVAILABLE', 6),

-- 3. Bánh Mì & Điểm Tâm (cat-03)
('opt-14', 'cat-03', 'Khẩu Phần Chuẩn (Vừa Vặn)', 'size', 0.00, 'AVAILABLE', 1),
('opt-15', 'cat-03', 'Khẩu Phần Đầy Đặn (Thêm Nhân)', 'size', 12000.00, 'AVAILABLE', 2),
('opt-16', 'cat-03', 'Pate Cột Đèn Hải Phòng Thêm', 'topping', 10000.00, 'AVAILABLE', 3),
('opt-17', 'cat-03', 'Xúc Xích Tiêu Đen Chiên', 'topping', 10000.00, 'AVAILABLE', 4),
('opt-18', 'cat-03', 'Chả Lụa Ước Lễ Thêm', 'topping', 10000.00, 'AVAILABLE', 5),
('opt-19', 'cat-03', 'Trứng Ốp La Thêm', 'topping', 7000.00, 'AVAILABLE', 6),

-- 4. Lẩu & Món Nhắm (cat-04)
('opt-20', 'cat-04', 'Set Tiêu Chuẩn (2-3 Người)', 'size', 0.00, 'AVAILABLE', 1),
('opt-21', 'cat-04', 'Set Đầy Đặn (4-5 Người)', 'size', 90000.00, 'AVAILABLE', 2),
('opt-22', 'cat-04', 'Dĩa Bắp Bò Nhúng Thêm', 'topping', 65000.00, 'AVAILABLE', 3),
('opt-23', 'cat-04', 'Dĩa Nấm Tươi Tổng Hợp', 'topping', 35000.00, 'AVAILABLE', 4),
('opt-24', 'cat-04', 'Đĩa Đậu Phụ & Váng Đậu', 'topping', 25000.00, 'AVAILABLE', 5),
('opt-25', 'cat-04', 'Mì Tôm / Bún Tươi Ăn Lẩu', 'topping', 15000.00, 'AVAILABLE', 6),
('opt-26', 'cat-04', 'Nước Lẩu Thêm (Ngọt/Cay)', 'topping', 30000.00, 'AVAILABLE', 7),

-- 5. Khai Vị & Gỏi Cuốn (cat-05)
('opt-27', 'cat-05', 'Dĩa Tiêu Chuẩn (Vừa Vặn)', 'size', 0.00, 'AVAILABLE', 1),
('opt-28', 'cat-05', 'Dĩa Lớn (Cho Nhóm Đông)', 'size', 25000.00, 'AVAILABLE', 2),
('opt-29', 'cat-05', 'Thêm Bánh Phồng Tôm Giòn', 'topping', 10000.00, 'AVAILABLE', 3),
('opt-30', 'cat-05', 'Thêm Chén Nước Chấm Chua Ngọt', 'topping', 5000.00, 'AVAILABLE', 4),

-- 6. Đồ Uống & Cà Phê (cat-06)
('opt-31', 'cat-06', 'Ly Chuẩn (Size M 500ml)', 'size', 0.00, 'AVAILABLE', 1),
('opt-32', 'cat-06', 'Ly Lớn (Size L 700ml)', 'size', 10000.00, 'AVAILABLE', 2),
('opt-33', 'cat-06', 'Trân Châu Hoàng Kim', 'topping', 8000.00, 'AVAILABLE', 3),
('opt-34', 'cat-06', 'Hạt Sen Huế Ninh Mềm', 'topping', 10000.00, 'AVAILABLE', 4),
('opt-35', 'cat-06', 'Thạch Củ Năng Giòn', 'topping', 8000.00, 'AVAILABLE', 5),
('opt-36', 'cat-06', 'Kem Sữa Macchiato / Kem Muối Béo', 'topping', 10000.00, 'AVAILABLE', 6),

-- 7. Tráng Miệng & Chè (cat-07)
('opt-37', 'cat-07', 'Chén Chuẩn (Vừa Miệng)', 'size', 0.00, 'AVAILABLE', 1),
('opt-38', 'cat-07', 'Phần Lớn (Nhiều Thạch & Sen)', 'size', 10000.00, 'AVAILABLE', 2),
('opt-39', 'cat-07', 'Thêm Nước Cốt Dừa Béo', 'topping', 5000.00, 'AVAILABLE', 3),
('opt-40', 'cat-07', 'Thêm Hạt Sen Bùi Bở', 'topping', 8000.00, 'AVAILABLE', 4),
('opt-41', 'cat-07', 'Thêm Dừa Sợi Nạo Giòn', 'topping', 5000.00, 'AVAILABLE', 5),

-- 8. Món Chay Thanh Tịnh (cat-08)
('opt-42', 'cat-08', 'Khẩu Phần Chuẩn (Vừa Vặn)', 'size', 0.00, 'AVAILABLE', 1),
('opt-43', 'cat-08', 'Khẩu Phần Lớn (Thêm Rau Nấm)', 'size', 15000.00, 'AVAILABLE', 2),
('opt-44', 'cat-08', 'Thêm Nấm Đùi Gà Nướng', 'topping', 15000.00, 'AVAILABLE', 3),
('opt-45', 'cat-08', 'Thêm Đậu Hũ Non Chiên Giòn', 'topping', 10000.00, 'AVAILABLE', 4),

-- 9. Hải Sản Tươi Sống (cat-09)
('opt-46', 'cat-09', 'Phần Tiêu Chuẩn (Đĩa Vừa)', 'size', 0.00, 'AVAILABLE', 1),
('opt-47', 'cat-09', 'Phần Lớn (Đĩa Lớn Đầy Đặn)', 'size', 50000.00, 'AVAILABLE', 2),
('opt-48', 'cat-09', 'Thêm Sốt Bơ Tỏi Béo Ngậy', 'topping', 15000.00, 'AVAILABLE', 3),
('opt-49', 'cat-09', 'Thêm Bánh Mì Chấm Sốt', 'topping', 8000.00, 'AVAILABLE', 4),

-- 10. Combo Tiết Kiệm (cat-10)
('opt-50', 'cat-10', 'Combo Tiêu Chuẩn (Vừa Vặn)', 'size', 0.00, 'AVAILABLE', 1),
('opt-51', 'cat-10', 'Nâng Cấp Nước Lớn & Thêm Quẩy', 'size', 15000.00, 'AVAILABLE', 2),
('opt-52', 'cat-10', 'Thêm Trứng Chần Gà Ta', 'topping', 6000.00, 'AVAILABLE', 3),
('opt-53', 'cat-10', 'Thêm Kem Béo Macchiato', 'topping', 8000.00, 'AVAILABLE', 4)
ON DUPLICATE KEY UPDATE name=VALUES(name), price=VALUES(price), status=VALUES(status);
