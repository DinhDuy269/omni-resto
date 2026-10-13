-- ============================================================================
-- OmniResto - Unified F&B Experience Platform Database
-- Database: omnirestodb (MySQL 8.0+)
-- Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- Generated & Standardized for Clean Database Reset
-- ============================================================================

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE DATABASE IF NOT EXISTS `omnirestodb` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `omnirestodb`;

-- ============================================================================
-- 1. DROP EXISTING TABLES (Reverse Dependency Order)
-- ============================================================================
DROP TABLE IF EXISTS `service_requests`;
DROP TABLE IF EXISTS `payment_transactions`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `table_sessions`;
DROP TABLE IF EXISTS `tables`;
DROP TABLE IF EXISTS `menu_item_meal_periods`;
DROP TABLE IF EXISTS `menu_items`;
DROP TABLE IF EXISTS `category_options`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `customer_vouchers`;
DROP TABLE IF EXISTS `vouchers`;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `reservations`;
DROP TABLE IF EXISTS `events`;
DROP TABLE IF EXISTS `newsletter_subscribers`;
DROP TABLE IF EXISTS `staff`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `meal_periods`;
DROP TABLE IF EXISTS `restaurant_info`;

-- ============================================================================
-- 2. TABLE SCHEMAS & DEFINITIONS
-- ============================================================================

-- Table: restaurant_info
CREATE TABLE `restaurant_info` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `brand_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OmniResto',
  `hotline` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1900 6868',
  `address` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '123 Đường Ẩm Thực, Quận 1, TP. Hồ Chí Minh',
  `wifi_ssid` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OmniResto_Guest',
  `wifi_password` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OmniRestoGuest2026',
  `bank_id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MB',
  `bank_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MBBank (Quân Đội)',
  `account_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0368295264',
  `account_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NHAN HANG OMNIRESTO',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: users (Nhân sự & Quản trị RBAC)
CREATE TABLE `users` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','store_manager','cashier','waiter','chef') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `avatar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: staff (Legacy/Support reference for POS & Shifts)
CREATE TABLE `staff` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `staff_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_staff_code` (`staff_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: categories (Danh mục thực đơn)
CREATE TABLE `categories` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_order` int DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_categories_code` (`code`),
  KEY `idx_categories_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: category_options (Tùy chọn kích cỡ & Topping dùng chung cho từng danh mục)
CREATE TABLE `category_options` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `option_type` enum('size','topping') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'topping',
  `price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AVAILABLE',
  `display_order` int DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `fk_category_options_cat` (`category_id`),
  CONSTRAINT `fk_category_options_cat` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: menu_items (Món ăn thực đơn chuẩn)
CREATE TABLE `menu_items` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(12,2) NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `ingredients` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'available',
  `is_best_seller` tinyint(1) DEFAULT '0',
  `meal_periods` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'MORNING,NOON,EVENING',
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_vegetarian` bit(1) DEFAULT b'0',
  `spicy_level` int DEFAULT '0',
  `allergens` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `allergen_verified` bit(1) DEFAULT b'0',
  `spicy_verified` bit(1) DEFAULT b'0',
  `verified_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `verified_at` datetime(6) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_menu_code` (`code`),
  KEY `idx_menu_category` (`category_id`),
  KEY `idx_menu_status` (`status`),
  CONSTRAINT `fk_menu_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_menu_price` CHECK ((`price` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: tables (Sơ đồ bàn ăn chi nhánh)
CREATE TABLE `tables` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `table_no` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `capacity` int NOT NULL DEFAULT '4',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'available',
  `current_order_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qr_secret_token` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_table_no` (`table_no`),
  UNIQUE KEY `uk_qr_secret_token` (`qr_secret_token`),
  KEY `idx_tables_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: table_sessions (Phiên bàn bảo mật Single-Device)
CREATE TABLE `table_sessions` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `table_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `table_no` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `session_token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `device_token` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `mode` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pay_after',
  `verified_at` datetime DEFAULT NULL,
  `verified_by_staff_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_activity_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `closed_at` datetime DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_session_token` (`session_token`),
  KEY `idx_session_table_status` (`table_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: customers
CREATE TABLE `customers` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'GUEST',
  `member_tier` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `points` int NOT NULL DEFAULT '0',
  `birthday` date DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_customers_email` (`email`),
  UNIQUE KEY `uk_customers_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: vouchers
CREATE TABLE `vouchers` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `discount_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `discount_value` decimal(12,2) NOT NULL,
  `max_discount_amount` decimal(12,2) DEFAULT NULL,
  `min_order_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_quantity` int NOT NULL DEFAULT '0',
  `used_quantity` int NOT NULL DEFAULT '0',
  `usage_limit_per_user` int NOT NULL DEFAULT '1',
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `is_welcome_voucher` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_vouchers_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: customer_vouchers
CREATE TABLE `customer_vouchers` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `voucher_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UNUSED',
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `used_at` datetime DEFAULT NULL,
  `order_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: orders (Đơn hàng chuỗi F&B)
CREATE TABLE `orders` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `table_session_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `table_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `table_no` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `order_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'dine_in',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `payment_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unpaid',
  `payment_method` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'cash',
  `voucher_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `voucher_code` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subtotal` decimal(15,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `created_by_staff_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by_user_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_orders_number` (`order_number`),
  KEY `idx_orders_status` (`status`),
  KEY `idx_orders_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: order_items (Chi tiết món theo từng đợt gọi món round_no)
CREATE TABLE `order_items` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `menu_item_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `item_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `unit_price` decimal(12,2) NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `round_no` int NOT NULL DEFAULT '1',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `added_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `confirmed_by_staff_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `confirmed_at` datetime DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `fk_order_items_order` (`order_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: payment_transactions (Giao dịch đối soát VietQR)
CREATE TABLE `payment_transactions` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `transaction_reference` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount_expected` decimal(15,2) NOT NULL,
  `amount_received` decimal(15,2) NOT NULL,
  `payment_gateway` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VIETQR',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'success',
  `raw_payload` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pay_tx_ref` (`transaction_reference`),
  KEY `idx_pay_tx_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: payments (Legacy tracking)
CREATE TABLE `payments` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `method` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CASH',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SUCCESS',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: service_requests (Gọi nhân viên / Xin đá / Hỗ trợ tại bàn)
CREATE TABLE `service_requests` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `table_session_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `table_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `table_no` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `resolved_at` datetime DEFAULT NULL,
  `resolved_by_staff_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_srv_req_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: reservations (Đặt bàn trực tuyến)
CREATE TABLE `reservations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `party_size` int NOT NULL DEFAULT '2',
  `reservation_date` date NOT NULL,
  `reservation_time` time NOT NULL,
  `table_no` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `reservation_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: events (Sự kiện ẩm thực & Workshop)
CREATE TABLE `events` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `short_description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `event_date` date NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `location` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price` decimal(12,0) DEFAULT '0',
  `max_capacity` int DEFAULT NULL,
  `registered_count` int DEFAULT '0',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'upcoming',
  `is_featured` tinyint(1) DEFAULT '0',
  `tags` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: newsletter_subscribers
CREATE TABLE `newsletter_subscribers` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `source` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'website',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_newsletter_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: meal_periods
CREATE TABLE `meal_periods` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: menu_item_meal_periods
CREATE TABLE `menu_item_meal_periods` (
  `menu_item_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `meal_period_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`menu_item_id`,`meal_period_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. INSERT STANDARDIZED SEED DATA
-- ============================================================================

-- 3.1. RESTAURANT MASTER INFO
INSERT INTO `restaurant_info` (`id`, `brand_name`, `hotline`, `address`, `wifi_ssid`, `wifi_password`, `bank_id`, `bank_name`, `account_number`, `account_name`)
VALUES ('rst-01', 'OmniResto - Hương Vị Việt Hợp Nhất', '1900 6868', '123 Đường Ẩm Thực, Quận 1, TP. Hồ Chí Minh', 'OmniResto_Guest', 'OmniRestoGuest2026', 'MB', 'MBBank (Quân Đội)', '0368295264', 'NHAN HANG OMNIRESTO');

-- 3.2. USERS & STAFF (Password bcrypt: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy = password123)
INSERT INTO `users` (`id`, `full_name`, `email`, `phone`, `password`, `role`, `status`, `avatar`, `created_at`, `updated_at`)
VALUES 
('usr-01', 'Lê Minh Tuấn (Admin)', 'admin@omniresto.vn', '0905123456', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', 'active', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop', NOW(), NOW()),
('usr-02', 'Nguyễn Văn Minh (Quản Lý)', 'manager@omniresto.vn', '0912345678', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'store_manager', 'active', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop', NOW(), NOW()),
('usr-03', 'Trần Thị Thu Thảo (Thu Ngân)', 'cashier@omniresto.vn', '0988777666', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'cashier', 'active', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop', NOW(), NOW()),
('usr-04', 'Đỗ Hoàng (Bếp Trưởng)', 'chef@omniresto.vn', '0933222111', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'chef', 'active', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop', NOW(), NOW()),
('usr-05', 'Phạm Hồng Nhung (Phục Vụ)', 'waiter@omniresto.vn', '0977444333', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'waiter', 'active', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop', NOW(), NOW()),
('usr-06', 'Nguyễn Khắc Việt (Phục Vụ)', 'waiter2@omniresto.vn', '0977444332', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'waiter', 'active', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop', NOW(), NOW()),
('usr-07', 'Phạm Quốc Bảo (Bếp Phó)', 'chef2@omniresto.vn', '0933222112', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'chef', 'active', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop', NOW(), NOW()),
('usr-08', 'Hoàng Thu Ngân (Thu Ngân 2)', 'cashier2@omniresto.vn', '0988777662', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'cashier', 'active', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop', NOW(), NOW()),
('usr-09', 'Vũ Mai Anh (Phục Vụ 3)', 'waiter3@omniresto.vn', '0977444335', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'waiter', 'active', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop', NOW(), NOW()),
('usr-10', 'Kỹ Thuật Viên Hệ Thống', 'dev@omniresto.vn', '0909999888', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', 'active', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop', NOW(), NOW());

INSERT INTO `staff` (`id`, `user_id`, `staff_code`, `full_name`, `position`, `phone`, `status`, `created_at`, `updated_at`)
VALUES
('stf-01', 'usr-01', 'EMP-001', 'Lê Minh Tuấn', 'Admin Chuỗi', '0905123456', 'ACTIVE', NOW(), NOW()),
('stf-02', 'usr-02', 'EMP-002', 'Nguyễn Văn Minh', 'Quản Lý Cửa Hàng', '0912345678', 'ACTIVE', NOW(), NOW()),
('stf-03', 'usr-03', 'EMP-003', 'Trần Thị Thu Thảo', 'Thu Ngân Quầy', '0988777666', 'ACTIVE', NOW(), NOW()),
('stf-04', 'usr-04', 'EMP-004', 'Đỗ Hoàng', 'Bếp Trưởng', '0933222111', 'ACTIVE', NOW(), NOW()),
('stf-05', 'usr-05', 'EMP-005', 'Phạm Hồng Nhung', 'Phục Vụ Bàn', '0977444333', 'ACTIVE', NOW(), NOW()),
('stf-06', 'usr-06', 'EMP-006', 'Nguyễn Khắc Việt', 'Phục Vụ Bàn', '0977444332', 'ACTIVE', NOW(), NOW()),
('stf-07', 'usr-07', 'EMP-007', 'Phạm Quốc Bảo', 'Bếp Phó', '0933222112', 'ACTIVE', NOW(), NOW()),
('stf-08', 'usr-08', 'EMP-008', 'Hoàng Thu Ngân', 'Thu Ngân Quầy', '0988777662', 'ACTIVE', NOW(), NOW()),
('stf-09', 'usr-09', 'EMP-009', 'Vũ Mai Anh', 'Phục Vụ Bàn', '0977444335', 'ACTIVE', NOW(), NOW()),
('stf-10', 'usr-10', 'EMP-010', 'Kỹ Thuật Viên', 'Quản Trị Hệ Thống', '0909999888', 'ACTIVE', NOW(), NOW());

-- 3.3. CATEGORIES (10 Danh mục chuẩn chỉ)
INSERT INTO `categories` (`id`, `code`, `name`, `description`, `display_order`, `created_at`, `updated_at`)
VALUES 
('cat-01', 'PHO_BUN', 'Phở & Bún Nước', 'Các món phở truyền thống hầm xương 24h và bún nước đặc sản 3 miền', 1, NOW(), NOW()),
('cat-02', 'COM_TAM', 'Cơm Tấm & Món Mặn', 'Cơm tấm sườn bì chả nướng than hoa và các món cơm gia đình đậm đà', 2, NOW(), NOW()),
('cat-03', 'BANH_MI', 'Bánh Mì & Điểm Tâm', 'Bánh mì giòn rụm, bánh cuốn nóng và xôi nếp thơm nức mũi', 3, NOW(), NOW()),
('cat-04', 'LAU_NHAM', 'Lẩu & Món Nhắm', 'Lẩu riêu cua đồng, lẩu hải sản tomyum và các món nhậu lai rai trứ danh', 4, NOW(), NOW()),
('cat-05', 'KHAI_VI', 'Khai Vị & Gỏi Cuốn', 'Nem rán rế, gỏi ngó sen tôm thịt, salad tươi mát khởi đầu bữa tiệc', 5, NOW(), NOW()),
('cat-06', 'DO_UONG', 'Đồ Uống & Cà Phê', 'Trà sen vàng, cà phê phin sữa đá, nước ép hoa quả nguyên chất thanh mát', 6, NOW(), NOW()),
('cat-07', 'TRANG_MIENG', 'Tráng Miệng & Chè', 'Chè hạt sen long nhãn, bánh flan caramel và kem tráng miệng thanh tao', 7, NOW(), NOW()),
('cat-08', 'MON_CHAY', 'Món Chay Thanh Tịnh', 'Món ăn thuần chay từ nấm tươi hữu cơ và rau củ quả Đà Lạt thanh lọc', 8, NOW(), NOW()),
('cat-09', 'HAI_SAN', 'Hải Sản Tươi Sống', 'Hải sản tươi sống hấp sả gừng, nướng mỡ hành, rang muối ớt thượng hạng', 9, NOW(), NOW()),
('cat-10', 'COMBO', 'Combo Tiết Kiệm', 'Set ăn trọn gói tiện lợi, cân đối dinh dưỡng và tiết kiệm', 10, NOW(), NOW());

-- 3.4. CATEGORY OPTIONS (ĐẦY ĐỦ SIZE CHUẨN 0đ & TOPPING CHO TẤT CẢ 10 DANH MỤC)
INSERT INTO `category_options` (`id`, `category_id`, `name`, `option_type`, `price`, `status`, `display_order`, `created_at`, `updated_at`)
VALUES
-- 1. Phở & Bún Nước (cat-01)
('opt-01', 'cat-01', 'Tô Chuẩn (Vừa Vặn)', 'size', 0.00, 'AVAILABLE', 1, NOW(), NOW()),
('opt-02', 'cat-01', 'Tô Lớn (Nhiều Thịt & Bánh)', 'size', 15000.00, 'AVAILABLE', 2, NOW(), NOW()),
('opt-03', 'cat-01', 'Tô Đặc Biệt (Full Topping)', 'size', 25000.00, 'AVAILABLE', 3, NOW(), NOW()),
('opt-04', 'cat-01', 'Thêm Quẩy Giòn Rụm (Đĩa 3 cái)', 'topping', 8000.00, 'AVAILABLE', 4, NOW(), NOW()),
('opt-05', 'cat-01', 'Thêm Trứng Chần Lòng Đào', 'topping', 6000.00, 'AVAILABLE', 5, NOW(), NOW()),
('opt-06', 'cat-01', 'Thịt Bò Tái Thêm', 'topping', 20000.00, 'AVAILABLE', 6, NOW(), NOW()),
('opt-07', 'cat-01', 'Tiết Luộc / Nước Béo Hành Trần', 'topping', 5000.00, 'AVAILABLE', 7, NOW(), NOW()),

-- 2. Cơm Tấm & Món Mặn (cat-02)
('opt-08', 'cat-02', 'Dĩa Chuẩn (Vừa Vặn)', 'size', 0.00, 'AVAILABLE', 1, NOW(), NOW()),
('opt-09', 'cat-02', 'Dĩa Đầy Đặn (Thêm Cơm)', 'size', 10000.00, 'AVAILABLE', 2, NOW(), NOW()),
('opt-10', 'cat-02', 'Trứng Ốp La Lòng Đào', 'topping', 7000.00, 'AVAILABLE', 3, NOW(), NOW()),
('opt-11', 'cat-02', 'Chả Trứng Hấp Sài Gòn', 'topping', 12000.00, 'AVAILABLE', 4, NOW(), NOW()),
('opt-12', 'cat-02', 'Thêm Sườn Cốt Lết Nướng', 'topping', 30000.00, 'AVAILABLE', 5, NOW(), NOW()),
('opt-13', 'cat-02', 'Chén Canh Chua Thêm', 'topping', 10000.00, 'AVAILABLE', 6, NOW(), NOW()),

-- 3. Bánh Mì & Điểm Tâm (cat-03)
('opt-14', 'cat-03', 'Khẩu Phần Chuẩn (Vừa Vặn)', 'size', 0.00, 'AVAILABLE', 1, NOW(), NOW()),
('opt-15', 'cat-03', 'Khẩu Phần Đầy Đặn (Thêm Nhân)', 'size', 12000.00, 'AVAILABLE', 2, NOW(), NOW()),
('opt-16', 'cat-03', 'Pate Cột Đèn Hải Phòng Thêm', 'topping', 10000.00, 'AVAILABLE', 3, NOW(), NOW()),
('opt-17', 'cat-03', 'Xúc Xích Tiêu Đen Chiên', 'topping', 10000.00, 'AVAILABLE', 4, NOW(), NOW()),
('opt-18', 'cat-03', 'Chả Lụa Ước Lễ Thêm', 'topping', 10000.00, 'AVAILABLE', 5, NOW(), NOW()),
('opt-19', 'cat-03', 'Trứng Ốp La Thêm', 'topping', 7000.00, 'AVAILABLE', 6, NOW(), NOW()),

-- 4. Lẩu & Món Nhắm (cat-04)
('opt-20', 'cat-04', 'Set Tiêu Chuẩn (2-3 Người)', 'size', 0.00, 'AVAILABLE', 1, NOW(), NOW()),
('opt-21', 'cat-04', 'Set Đầy Đặn (4-5 Người)', 'size', 90000.00, 'AVAILABLE', 2, NOW(), NOW()),
('opt-22', 'cat-04', 'Dĩa Bắp Bò Nhúng Thêm', 'topping', 65000.00, 'AVAILABLE', 3, NOW(), NOW()),
('opt-23', 'cat-04', 'Dĩa Nấm Tươi Tổng Hợp', 'topping', 35000.00, 'AVAILABLE', 4, NOW(), NOW()),
('opt-24', 'cat-04', 'Đĩa Đậu Phụ & Váng Đậu', 'topping', 25000.00, 'AVAILABLE', 5, NOW(), NOW()),
('opt-25', 'cat-04', 'Mì Tôm / Bún Tươi Ăn Lẩu', 'topping', 15000.00, 'AVAILABLE', 6, NOW(), NOW()),
('opt-26', 'cat-04', 'Nước Lẩu Thêm (Ngọt/Cay)', 'topping', 30000.00, 'AVAILABLE', 7, NOW(), NOW()),

-- 5. Khai Vị & Gỏi Cuốn (cat-05)
('opt-27', 'cat-05', 'Dĩa Tiêu Chuẩn (Vừa Vặn)', 'size', 0.00, 'AVAILABLE', 1, NOW(), NOW()),
('opt-28', 'cat-05', 'Dĩa Lớn (Cho Nhóm Đông)', 'size', 25000.00, 'AVAILABLE', 2, NOW(), NOW()),
('opt-29', 'cat-05', 'Thêm Bánh Phồng Tôm Giòn', 'topping', 10000.00, 'AVAILABLE', 3, NOW(), NOW()),
('opt-30', 'cat-05', 'Thêm Chén Nước Chấm Chua Ngọt', 'topping', 5000.00, 'AVAILABLE', 4, NOW(), NOW()),

-- 6. Đồ Uống & Cà Phê (cat-06)
('opt-31', 'cat-06', 'Ly Chuẩn (Size M 500ml)', 'size', 0.00, 'AVAILABLE', 1, NOW(), NOW()),
('opt-32', 'cat-06', 'Ly Lớn (Size L 700ml)', 'size', 10000.00, 'AVAILABLE', 2, NOW(), NOW()),
('opt-33', 'cat-06', 'Trân Châu Hoàng Kim', 'topping', 8000.00, 'AVAILABLE', 3, NOW(), NOW()),
('opt-34', 'cat-06', 'Hạt Sen Huế Ninh Mềm', 'topping', 10000.00, 'AVAILABLE', 4, NOW(), NOW()),
('opt-35', 'cat-06', 'Thạch Củ Năng Giòn', 'topping', 8000.00, 'AVAILABLE', 5, NOW(), NOW()),
('opt-36', 'cat-06', 'Kem Sữa Macchiato / Kem Muối Béo', 'topping', 10000.00, 'AVAILABLE', 6, NOW(), NOW()),

-- 7. Tráng Miệng & Chè (cat-07)
('opt-37', 'cat-07', 'Chén Chuẩn (Vừa Miệng)', 'size', 0.00, 'AVAILABLE', 1, NOW(), NOW()),
('opt-38', 'cat-07', 'Phần Lớn (Nhiều Thạch & Sen)', 'size', 10000.00, 'AVAILABLE', 2, NOW(), NOW()),
('opt-39', 'cat-07', 'Thêm Nước Cốt Dừa Béo', 'topping', 5000.00, 'AVAILABLE', 3, NOW(), NOW()),
('opt-40', 'cat-07', 'Thêm Hạt Sen Bùi Bở', 'topping', 8000.00, 'AVAILABLE', 4, NOW(), NOW()),
('opt-41', 'cat-07', 'Thêm Dừa Sợi Nạo Giòn', 'topping', 5000.00, 'AVAILABLE', 5, NOW(), NOW()),

-- 8. Món Chay Thanh Tịnh (cat-08)
('opt-42', 'cat-08', 'Khẩu Phần Chuẩn (Vừa Vặn)', 'size', 0.00, 'AVAILABLE', 1, NOW(), NOW()),
('opt-43', 'cat-08', 'Khẩu Phần Lớn (Thêm Rau Nấm)', 'size', 15000.00, 'AVAILABLE', 2, NOW(), NOW()),
('opt-44', 'cat-08', 'Thêm Nấm Đùi Gà Nướng', 'topping', 15000.00, 'AVAILABLE', 3, NOW(), NOW()),
('opt-45', 'cat-08', 'Thêm Đậu Hũ Non Chiên Giòn', 'topping', 10000.00, 'AVAILABLE', 4, NOW(), NOW()),

-- 9. Hải Sản Tươi Sống (cat-09)
('opt-46', 'cat-09', 'Phần Tiêu Chuẩn (Đĩa Vừa)', 'size', 0.00, 'AVAILABLE', 1, NOW(), NOW()),
('opt-47', 'cat-09', 'Phần Lớn (Đĩa Lớn Đầy Đặn)', 'size', 50000.00, 'AVAILABLE', 2, NOW(), NOW()),
('opt-48', 'cat-09', 'Thêm Sốt Bơ Tỏi Béo Ngậy', 'topping', 15000.00, 'AVAILABLE', 3, NOW(), NOW()),
('opt-49', 'cat-09', 'Thêm Bánh Mì Chấm Sốt', 'topping', 8000.00, 'AVAILABLE', 4, NOW(), NOW()),

-- 10. Combo Tiết Kiệm (cat-10)
('opt-50', 'cat-10', 'Combo Tiêu Chuẩn (Vừa Vặn)', 'size', 0.00, 'AVAILABLE', 1, NOW(), NOW()),
('opt-51', 'cat-10', 'Nâng Cấp Nước Lớn & Thêm Quẩy', 'size', 15000.00, 'AVAILABLE', 2, NOW(), NOW()),
('opt-52', 'cat-10', 'Thêm Trứng Chần Gà Ta', 'topping', 6000.00, 'AVAILABLE', 3, NOW(), NOW()),
('opt-53', 'cat-10', 'Thêm Kem Béo Macchiato', 'topping', 8000.00, 'AVAILABLE', 4, NOW(), NOW());

-- 3.5. MENU ITEMS (40 món ăn Việt Nam chuẩn chỉnh, phân loại rõ ràng)
INSERT INTO `menu_items` (`id`, `code`, `name`, `category_id`, `price`, `description`, `ingredients`, `status`, `is_best_seller`, `meal_periods`, `image_url`, `is_vegetarian`, `spicy_level`, `allergens`, `allergen_verified`, `spicy_verified`, `verified_by`, `verified_at`, `created_at`, `updated_at`)
VALUES
('dish-01', 'PHO-01', 'Phở Bò Tái Nạm Wagyu', 'cat-01', 89000.00, 'Nước dùng phở truyền thống hầm xương tủy bò 24 giờ thơm thảo quả quế hồi, thịt bò Wagyu tái mềm ngọt lịm.', 'Xương bò, Bò Wagyu thái lát, Bánh phở tươi, Hành hoa, Thảo mộc tự nhiên', 'available', 1, 'MORNING,NOON', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop', b'0', 0, 'Không có', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-02', 'PHO-02', 'Phở Gà Đồi Chặt Lá Chanh', 'cat-01', 69000.00, 'Phở gà mái đồi da vàng óng giòn sần sật, nước luộc gà thanh ngọt tự nhiên rắc lá chanh thái sợi thơm ngát.', 'Gà ta thả đồi, Bánh phở, Lá chanh tươi, Hành hoa, Nước hầm xương gà', 'available', 1, 'MORNING,NOON', 'https://images.unsplash.com/photo-1594998893017-36147cbcae05?w=500&auto=format&fit=crop', b'0', 0, 'Không có', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-03', 'BUN-01', 'Bún Bò Huế Chả Cua Giò Heo', 'cat-01', 79000.00, 'Đặc sản Cố Đô với nước dùng thơm mắm ruốc sả cay tê đầu lưỡi, giò heo hầm nhừ, bắp hoa bò và chả cua thơm bùi.', 'Thịt bắp bò, Giò heo, Chả cua bể, Bún sợi to Huế, Sả ớt mắm ruốc', 'available', 1, 'MORNING,NOON,EVENING', 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=500&auto=format&fit=crop', b'0', 2, 'Động vật giáp xác', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-04', 'BUN-02', 'Bún Chả Nem Cua Bể Hà Nội', 'cat-01', 75000.00, 'Chả miếng chả băm nướng than hoa vàng rụm ngâm nước mắm chua ngọt, ăn kèm nem cua bể giòn rụm và rau sống.', 'Thịt nạc vai băm, Cua bể tươi, Bún lá Hà Nội, Rau thơm, Nước mắm tỏi ớt', 'available', 1, 'NOON,EVENING', 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=500&auto=format&fit=crop', b'0', 1, 'Hải sản', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-05', 'BUN-03', 'Bún Đậu Mắm Tôm Thập Cẩm', 'cat-01', 75000.00, 'Mẹt tre bún lá, đậu Mơ chiên phồng giòn tan, thịt luộc chân giò, chả cốm Làng Vòng và mắm tôm Thanh Hóa sủi bọt.', 'Bún lá tươi, Đậu mơ, Chả cốm, Thịt chân giò giòn, Quất ớt tươi', 'available', 0, 'NOON,EVENING', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop', b'0', 1, 'Mắm tôm', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),

('dish-06', 'COM-01', 'Cơm Tấm Sườn Bì Chả Trứng Ốp La', 'cat-02', 79000.00, 'Cơm tấm nếp hạt tấm dẻo rưới mỡ hành tóp mỡ giòn, sườn cốt lết dày thịt ướp mật ong nướng than thơm lừng.', 'Gạo tấm, Sườn heo cốt lết, Bì heo sợi, Chả trứng hấp, Trứng gà ốp la, Mỡ hành', 'available', 1, 'NOON,EVENING', 'https://images.unsplash.com/photo-1539136788836-5699e78bfc75?w=500&auto=format&fit=crop', b'0', 0, 'Trứng', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-07', 'COM-02', 'Cơm Rang Dưa Bò Hoàng Cung', 'cat-02', 69000.00, 'Cơm đảo hạt vàng ruộm tơi xốp xào cùng bắp bò hoa giòn ngọt và dưa cải muối chua ngọt đưa cơm khó cưỡng.', 'Cơm nguội rang trứng, Bắp bò hoa thái mỏng, Dưa cải chua muối giòn, Tỏi phi giòn', 'available', 0, 'NOON,EVENING', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop', b'0', 0, 'Không có', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-08', 'COM-03', 'Cơm Đùi Gà Nướng Mật Ong Rừng', 'cat-02', 65000.00, 'Đùi gà ta góc tư ướp sốt mật ong rừng Tây Bắc và mắc khén nướng mọng nước, da giòn thịt ngọt ngào.', 'Đùi gà ta, Mật ong hoa rừng, Mắc khén, Cơm trắng dẻo, Đồ chua ăn kèm', 'available', 0, 'NOON,EVENING', 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500&auto=format&fit=crop', b'0', 0, 'Mật ong', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-09', 'COM-04', 'Cơm Niêu Cá Bống Kho Tộ Ba Chỉ', 'cat-02', 85000.00, 'Cơm niêu đất đáy cháy giòn thơm nức mũi ăn cùng cá bống sông kho tiêu tộ sền sệt đậm đà chuẩn vị quê hương.', 'Gạo tám xoan, Cá bống tươi, Thịt ba chỉ rim kẹo đắng, Tiêu sọ Phú Quốc', 'available', 0, 'NOON,EVENING', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop', b'0', 1, 'Cá', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-10', 'COM-05', 'Cơm Thịt Kho Tàu Trứng Vịt Lòng Đào', 'cat-02', 65000.00, 'Thịt ba chỉ rút sườn hầm nước dừa xiêm béo ngậy mềm rục tan trong miệng cùng quả trứng vịt lòng đào béo ngậy.', 'Thịt ba chỉ heo, Nước dừa xiêm tươi, Trứng vịt béo ngậy, Nước mắm cá cơm', 'available', 0, 'NOON,EVENING', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&auto=format&fit=crop', b'0', 0, 'Trứng', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),

('dish-11', 'BM-01', 'Bánh Mì Chảo Thập Cẩm Bò Xíu Mại', 'cat-03', 55000.00, 'Chảo gang bốc khói nghi ngút gồm bò xào tiêu mềm, xíu mại tôm thịt đậm vị sốt cà chua và 2 trứng ốp la lòng đào.', 'Bánh mì giòn, Thịt bò mềm, Xíu mại thịt, Trứng gà ốp la, Pate gan Cột Đèn', 'available', 1, 'MORNING,NOON', 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=500&auto=format&fit=crop', b'0', 0, 'Trứng, Đậu phộng', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-12', 'BM-02', 'Bánh Mì Heo Quay Giòn Rì Da Nổ', 'cat-03', 38000.00, 'Bánh mì nướng giòn rụm kẹp thịt heo quay nổ cốm giòn tan, đồ chua dưa leo và sốt thảo mộc đậm đà khó cưỡng.', 'Thịt heo quay da giòn, Dưa leo ngò gai, Đồ chua cà rốt củ cải, Sốt ớt cay ngọt', 'available', 0, 'MORNING,NOON', 'https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?w=500&auto=format&fit=crop', b'0', 1, 'Không có', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-13', 'XOI-01', 'Xôi Xéo Gà Xé Nấm Hương Mỡ Hành', 'cat-03', 45000.00, 'Xôi nếp cái hoa vàng đồ dẻo rưới mỡ gà thơm ngậy, rắc đậu xanh bùi bùi, ruốc gà xé cay và hành phi giòn tan.', 'Gạo nếp cái hoa vàng, Đậu xanh xát vỏ, Thịt gà ta xé sợi, Nấm hương Sa Pa, Hành phi', 'available', 1, 'MORNING', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop', b'0', 0, 'Không có', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-14', 'BC-01', 'Bánh Cuốn Nóng Thanh Trì Chả Quế', 'cat-03', 40000.00, 'Bánh tráng tay mỏng tang mềm mướt cuốn thịt nạc vai băm mộc nhĩ, chấm nước mắm pha cà cuống và chả quế thơm.', 'Bột gạo tẻ tráng mỏng, Thịt nạc vai băm, Mộc nhĩ nấm mèo, Chả quế nướng vàng, Nước mắm ấm', 'available', 0, 'MORNING,NOON', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop', b'0', 0, 'Không có', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-15', 'XOI-02', 'Xôi Khúc Hoàng Mai Chả Lụa Nóng', 'cat-03', 35000.00, 'Bánh khúc dẻo thơm nức mũi mùi lá khúc tươi vườn nhà, bọc đỗ xanh bùi bùi và thịt ba chỉ tiêu sọ kèm chả lụa.', 'Gạo nếp nương, Lá rau khúc tươi, Đậu xanh đồ nhuyễn, Thịt ba chỉ rim tiêu sọ, Chả lụa', 'available', 0, 'MORNING', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop', b'0', 0, 'Không có', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),

('dish-16', 'LAU-01', 'Set Lẩu Riêu Cua Bắp Bò Sườn Sụn', 'cat-04', 389000.00, 'Nồi lẩu riêu cua đồng xịn giã tay gạch béo ngậy chua dịu giấm bỗng nếp làng Vân, nhúng bắp bò hoa và sườn sụn tươi.', 'Cua đồng giã tay, Bắp bò hoa, Sườn sụn non heo, Giấm bỗng nếp, Hoa chuối, Mướp hương, Bún', 'available', 1, 'EVENING', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop', b'0', 1, 'Cua đồng', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-17', 'LAU-02', 'Set Lẩu Thái Hải Sản Tomyum Cốt Dừa', 'cat-04', 429000.00, 'Nước lẩu Tomyum chua cay xé lưỡi thơm lừng lá chanh sả ớt hòa quyện nước cốt dừa tươi, ngập tràn tôm mực tươi sống.', 'Tôm sú tươi, Mực ống câu Cô Tô, Nghêu biển trắng, Cốt dừa, Sả lá chanh ớt xiêm, Nấm rơm', 'available', 1, 'EVENING', 'https://images.unsplash.com/photo-1547496502-affa22d38842?w=500&auto=format&fit=crop', b'0', 3, 'Hải sản giáp xác', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-18', 'LAU-03', 'Lẩu Gà Đồi Nấu Lá É Phú Yên', 'cat-04', 369000.00, 'Gà ta thả đồi chắc thịt nấu cùng măng củ giòn ngọt và tiêu xanh thơm nồng, nhúng rổ lá é tươi thơm phức giải cảm.', 'Gà ta thả đồi chặt miếng, Lá é trắng tươi Phú Yên, Măng tươi luộc kỹ, Tiêu xanh Phú Quốc, Nấm tuyết', 'available', 0, 'EVENING', 'https://images.unsplash.com/photo-1547496502-affa22d38842?w=500&auto=format&fit=crop', b'0', 2, 'Không có', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-19', 'NHA-01', 'Gà Ta Ủ Muối Hoa Tiêu Nửa Con', 'cat-04', 160000.00, 'Gà đồi ủ muối thảo mộc da giòn sần sật vàng óng, thịt ngọt dai tự nhiên chấm sốt ớt đỏ sữa đặc lá chanh.', 'Nửa con gà đồi ủ muối, Muối hạt rang tiêu rừng, Lá chanh non, Sốt ớt đỏ sữa chua ngọt', 'available', 1, 'NOON,EVENING', 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&auto=format&fit=crop', b'0', 1, 'Sữa', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-20', 'NHA-02', 'Bò Tơ Cuộn Rau Rừng Bánh Tráng', 'cat-04', 155000.00, 'Thịt bò tơ Tây Ninh luộc mềm thái mỏng cuộn bánh tráng phơi sương Trảng Bàng cùng 10 loại rau rừng chấm mắm nêm.', 'Bò tơ luộc gừng sả, Bánh tráng phơi sương, Rau rừng Tây Ninh, Dứa chuối chát, Mắm nêm cá cơm', 'available', 0, 'NOON,EVENING', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop', b'0', 1, 'Mắm nêm cá cơm', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),

('dish-21', 'KV-01', 'Gỏi Ngó Sen Tôm Thịt Chua Ngọt', 'cat-05', 85000.00, 'Ngó sen trắng giòn ngâm chua ngọt bóp cùng tôm sú luộc nõn, thịt ba chỉ luộc, rau răm thơm nồng và lạc rang giã dập.', 'Ngó sen Đồng Tháp, Tôm sú tươi, Thịt ba chỉ, Rau răm, Đậu phộng rang, Nước mắm chua ngọt', 'available', 1, 'MORNING,NOON,EVENING', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop', b'0', 1, 'Tôm, Đậu phộng', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-22', 'KV-02', 'Gỏi Bưởi Da Xanh Mực Một Nắng', 'cat-05', 95000.00, 'Tép bưởi da xanh mọng nước chua thanh kết hợp mực một nắng nướng xé sợi dai ngọt và sốt nước mắm me hạt điều.', 'Bưởi da xanh Bến Tre, Mực một nắng Cô Tô, Hạt điều rang, Hành phi, Nước mắm chua cay', 'available', 0, 'NOON,EVENING', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop', b'0', 1, 'Hải sản, Hạt điều', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-23', 'KV-03', 'Nem Rán Hải Sản Sốt Mayonnaise (5 cuốn)', 'cat-05', 65000.00, 'Vỏ nem rế chiên vàng giòn rụm bọc nhân tôm sú băm, cua bể nấm hương và chấm sốt mayonnaise béo bùi thơm dịu.', 'Bánh tráng rế, Tôm sú băm, Thịt cua, Cà rốt mộc nhĩ, Mayonnaise béo ngậy', 'available', 0, 'MORNING,NOON,EVENING', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop', b'0', 0, 'Tôm, Trứng', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-24', 'KV-04', 'Khoai Tây Múi Cau Lắc Rong Biển Phô Mai', 'cat-05', 45000.00, 'Khoai tây Mỹ bổ múi cau chiên vàng ruộm giòn xốp bên ngoài mềm mịn bên trong lắc bột phô mai Cheddar rong biển.', 'Khoai tây cắt múi cau, Bột phô mai Parmesan Cheddar, Rong biển sấy giòn', 'available', 0, 'MORNING,NOON,EVENING', 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500&auto=format&fit=crop', b'0', 0, 'Sữa', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-25', 'KV-05', 'Nộm Bò Bóp Thấu Hành Tây Húng Lủi', 'cat-05', 90000.00, 'Thịt bắp bò tái chanh trộn hành tây giòn bớt hăng, chuối chát, khế chua, lá húng lủi và vừng trắng rang thơm.', 'Thịt bắp bò tươi, Khế chua, Chuối xanh, Hành tây ngâm đá, Vừng rang, Nước cốt chanh đường', 'available', 0, 'NOON,EVENING', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop', b'0', 1, 'Vừng', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),

('dish-26', 'DRK-01', 'Trà Sen Vàng Hạt Sen Kem Macchiato', 'cat-06', 42000.00, 'Trà Oolong ướp sen Bách Diệp Tây Hồ, củ năng giòn ngọt thanh kết hợp hạt sen tươi ninh nhừ và lớp bọt kem macchiato.', 'Cốt trà Oolong hoa sen, Hạt sen tươi hầm đường phèn, Củ năng giòn, Kem macchiato sữa tươi', 'available', 1, 'ALL_DAY', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop', b'1', 0, 'Sữa', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-27', 'DRK-02', 'Cà Phê Muối Kem Béo Phong Vị Huế', 'cat-06', 35000.00, 'Cà phê Robusta Đắk Lắk nguyên chất pha phin nhôm truyền thống kết hợp lớp kem sữa mặn nhẹ béo ngậy đượm đà.', 'Cà phê Robusta mộc pha phin, Sữa đặc nguyên chất, Lớp kem muối béo bồng bềnh', 'available', 1, 'ALL_DAY', 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&auto=format&fit=crop', b'1', 0, 'Sữa', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-28', 'DRK-03', 'Cà Phê Sữa Đá Phin Đậm Đà Buôn Ma Thuột', 'cat-06', 29000.00, 'Cà phê nguyên chất rang mộc thơm nức quyện cùng sữa đặc Ông Thọ sánh mịn và đá viên tinh khiết chuẩn gu Việt.', 'Hạt cà phê Robusta rang mộc Đắk Lắk, Sữa đặc có đường, Đá viên sạch', 'available', 1, 'ALL_DAY', 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&auto=format&fit=crop', b'1', 0, 'Sữa', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-29', 'DRK-04', 'Trà Đào Cam Sả Tươi Mát Thanh Nhiệt', 'cat-06', 42000.00, 'Vị thanh ngọt của trà đen Ceylon hòa quyện cam sành tươi vắt và sả cây đập dập thơm the mát xua tan mệt mỏi.', 'Trà đen Ceylon hảo hạng, Cam tươi vắt mọng nước, Sả cây đập dập, Đào miếng giòn ngọt', 'available', 0, 'ALL_DAY', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop', b'1', 0, 'Không có', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-30', 'DRK-05', 'Nước Ép Dưa Hấu Bạc Hà Nguyên Chất', 'cat-06', 38000.00, 'Nước ép dưa hấu ruột đỏ ngọt lịm ép chậm 100% không đường tinh luyện, thả lá bạc hà mát lạnh sảng khoái.', 'Dưa hấu Long An ép lạnh nguyên chất, Lá bạc hà vườn, Đá hoa tuyết', 'available', 0, 'ALL_DAY', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop', b'1', 0, 'Không có', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),

('dish-31', 'CHE-01', 'Chè Hạt Sen Long Nhãn Bột Sắn Dây', 'cat-07', 35000.00, 'Món tráng miệng thanh tao Cố Đô, hạt sen bùi ngậy lồng cùi nhãn ngọt giòn chan nước đường phèn thơm hoa bưởi.', 'Hạt sen Huế ninh bở, Nhãn lồng Hưng Yên giòn ngọt, Nước đường phèn hoa bưởi thanh khiết', 'available', 1, 'ALL_DAY', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop', b'1', 0, 'Không có', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-32', 'CHE-02', 'Bánh Flan Caramel Cà Phê Cốt Dừa', 'cat-07', 28000.00, 'Bánh flan mềm mịn núng nính thơm mùi trứng sữa béo ngậy, rưới cà phê đắng nhẹ và nước cốt dừa thơm béo.', 'Trứng gà ta tươi, Sữa tươi tiệt trùng, Nước đường caramel thắng đắng nhẹ, Cà phê phin giọt', 'available', 0, 'ALL_DAY', 'https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=500&auto=format&fit=crop', b'1', 0, 'Trứng, Sữa', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-33', 'CHE-03', 'Chè Dừa Dầm Hải Phòng Thạch Giòn', 'cat-07', 35000.00, 'Món chè hot trend đất Cảng với cùi dừa non giòn ngọt, thạch dừa giòn sần sật chan nước cốt dừa béo bùi ngậy lưỡi.', 'Cùi dừa non nạo sợi, Thạch rau câu dừa nước dừa, Nước cốt dừa thơm béo bùi, Trân châu sợi', 'available', 0, 'ALL_DAY', 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=500&auto=format&fit=crop', b'1', 0, 'Dừa', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-34', 'CHE-04', 'Sữa Chua Nếp Cẩm Mộc Châu Dẻo Quánh', 'cat-07', 30000.00, 'Sữa chua men tự nhiên sánh mịn kết hợp nếp cẩm Điện Biên ninh rượu nếp bùi thơm dẻo quánh kích thích tiêu hóa.', 'Sữa chua lên men tự nhiên, Nếp cẩm Tây Bắc dẻo thơm ninh đường phèn, Đá bào mịn', 'available', 0, 'ALL_DAY', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500&auto=format&fit=crop', b'1', 0, 'Sữa', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),

('dish-35', 'CHAY-01', 'Đậu Hũ Non Lướt Ván Chấm Nước Tương Nấm', 'cat-08', 45000.00, 'Đậu hũ non làng Mơ rán ngập dầu sôi da giòn rụm bên trong mọng nước mềm mịn chấm nước tương nấm hương gừng ớt.', 'Đậu hũ non hữu cơ, Hành hoa phi thơm dầu mè, Nước tương nấm hương cao cấp, Gừng tươi băm', 'available', 0, 'MORNING,NOON,EVENING', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop', b'1', 0, 'Đậu nành', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-36', 'CHAY-02', 'Nấm Đùi Gà Kho Tiêu Gừng Cơm Niêu', 'cat-08', 65000.00, 'Nấm đùi gọt sạch kho tộ xì dầu đặc sánh cay nồng tiêu sọ Phú Quốc ăn kèm rau củ luộc thanh lọc cơ thể.', 'Nấm đùi gà tươi Đà Lạt, Gừng già thái sợi, Tiêu sọ đập dập, Nước tương Tamari nguyên chất', 'available', 0, 'NOON,EVENING', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop', b'1', 1, 'Đậu nành', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-37', 'CHAY-03', 'Phở Nấm Hương Chay Nước Dùng Củ Quả', 'cat-08', 55000.00, 'Nước dùng phở ninh từ lê, táo, bắp ngọt và củ cải suốt 6 tiếng, kết hợp 4 loại nấm tươi ngọt thanh tự nhiên.', 'Nấm hương nấm bào ngư nấm đùi gà, Bánh phở tươi, Nước dùng lê táo bắp ngọt, Hành lá mùi tàu', 'available', 0, 'MORNING,NOON', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop', b'1', 0, 'Không có', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),

('dish-38', 'HS-01', 'Mực Trứng Phú Quốc Hấp Gừng Hành Hoa', 'cat-09', 145000.00, 'Mực ống câu trứng đầy ắp bụng hấp bia cùng sả gừng tươi giòn ngọt sần sật chấm muối tiêu chanh ớt xanh cay xé.', 'Mực trứng Phú Quốc tươi sống, Gừng củ thái sợi, Sả cây đập dập, Hành hoa chần, Muối ớt chanh xanh', 'available', 0, 'EVENING', 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=500&auto=format&fit=crop', b'0', 2, 'Hải sản', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),
('dish-39', 'HS-02', 'Tôm Sú Biển Nướng Muối Ớt Tây Ninh', 'cat-09', 150000.00, 'Tôm sú tươi sống nướng mọi than hoa phết muối ớt hột cay nồng thơm phức, vỏ giòn thịt chắc ngọt đậm đà.', 'Tôm sú biển còn bơi (6 con), Muối hột rang ớt hiểm Tây Ninh, Chanh tươi, Rau răm', 'available', 0, 'EVENING', 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=500&auto=format&fit=crop', b'0', 2, 'Tôm', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW()),

('dish-40', 'CB-01', 'Combo Trưa Công Sở Phở & Trà Sen Vàng', 'cat-10', 99000.00, 'Set ăn trưa hoàn hảo gồm 1 tô Phở Bò Tái Wagyu thơm nức kèm 1 ly Trà Sen Vàng Hạt Sen tráng miệng thanh nhiệt.', 'Phở bò tái Wagyu, Trà sen vàng macchiato, Đĩa quẩy giòn 3 chiếc', 'available', 1, 'NOON', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop', b'0', 0, 'Sữa', b'1', b'1', 'Bếp Trưởng Đỗ Hoàng', NOW(), NOW(), NOW());

-- 3.6. TABLES & TABLE SESSIONS
INSERT INTO `tables` (`id`, `table_no`, `capacity`, `status`, `current_order_id`, `qr_secret_token`, `created_at`, `updated_at`)
VALUES 
('tbl-01', 'Bàn 01', 2, 'available', NULL, 'qr-sec-tbl01-a1b2c3d4e5f6', NOW(), NOW()),
('tbl-02', 'Bàn 02', 4, 'occupied', 'ord-01', 'qr-sec-tbl02-b2c3d4e5f6g7', NOW(), NOW()),
('tbl-03', 'Bàn 03', 4, 'available', NULL, 'qr-sec-tbl03-c3d4e5f6g7h8', NOW(), NOW()),
('tbl-04', 'Bàn 04', 2, 'available', NULL, 'qr-sec-tbl04-d4e5f6g7h8i9', NOW(), NOW()),
('tbl-05', 'Bàn 05', 6, 'reserved', NULL, 'qr-sec-tbl05-e5f6g7h8i9j0', NOW(), NOW()),
('tbl-06', 'Bàn 06', 4, 'occupied', 'ord-02', 'qr-sec-tbl06-f6g7h8i9j0k1', NOW(), NOW()),
('tbl-07', 'Bàn 07', 2, 'available', NULL, 'qr-sec-tbl07-g7h8i9j0k1l2', NOW(), NOW()),
('tbl-08', 'Bàn 08', 6, 'available', NULL, 'qr-sec-tbl08-h8i9j0k1l2m3', NOW(), NOW()),
('tbl-09', 'Bàn 09', 8, 'available', NULL, 'qr-sec-tbl09-i9j0k1l2m3n4', NOW(), NOW()),
('tbl-10', 'Bàn 10', 10, 'reserved', NULL, 'qr-sec-tbl10-j0k1l2m3n4o5', NOW(), NOW());

INSERT INTO `table_sessions` (`id`, `table_id`, `table_no`, `session_token`, `device_token`, `status`, `mode`, `verified_at`, `verified_by_staff_id`, `last_activity_at`, `closed_at`, `expires_at`, `created_at`, `updated_at`)
VALUES 
('ses-01', 'tbl-02', 'Bàn 02', 'tok-ses-01-b2c3d4e5f6a1', 'dev-usr-phone-01', 'active', 'pay_after', NOW(), 'stf-05', NOW(), NULL, DATE_ADD(NOW(), INTERVAL 3 HOUR), NOW(), NOW()),
('ses-02', 'tbl-06', 'Bàn 06', 'tok-ses-02-c3d4e5f6a1b2', 'dev-usr-phone-02', 'active', 'pay_after', NOW(), 'stf-06', NOW(), NULL, DATE_ADD(NOW(), INTERVAL 3 HOUR), NOW(), NOW()),
('ses-03', 'tbl-01', 'Bàn 01', 'tok-ses-03-d4e5f6a1b2c3', 'dev-usr-phone-03', 'closed', 'pay_after', NOW(), 'stf-05', NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 3 HOUR), NOW(), NOW()),
('ses-04', 'tbl-03', 'Bàn 03', 'tok-ses-04-e5f6a1b2c3d4', 'dev-usr-phone-04', 'closed', 'pay_after', NOW(), 'stf-06', NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 3 HOUR), NOW(), NOW());

-- 3.7. CUSTOMERS & VOUCHERS
INSERT INTO `customers` (`id`, `full_name`, `email`, `phone`, `password`, `customer_type`, `member_tier`, `points`, `birthday`, `status`, `created_at`, `updated_at`)
VALUES 
('cus-01', 'Nguyễn Hải Đăng', 'haidang@gmail.com', '0911223344', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'MEMBER', 'DIAMOND', 1250, '1992-05-14', 'ACTIVE', NOW(), NOW()),
('cus-02', 'Trần Thị Mai', 'maitran@gmail.com', '0911223345', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'MEMBER', 'GOLD', 840, '1995-10-22', 'ACTIVE', NOW(), NOW()),
('cus-03', 'Phạm Quốc Cường', 'cuongpham@gmail.com', '0911223346', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'MEMBER', 'SILVER', 320, '1988-03-08', 'ACTIVE', NOW(), NOW()),
('cus-04', 'Lê Quỳnh Nga', 'ngale@gmail.com', '0911223347', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'MEMBER', 'SILVER', 210, '1999-12-01', 'ACTIVE', NOW(), NOW());

INSERT INTO `vouchers` (`id`, `code`, `name`, `description`, `discount_type`, `discount_value`, `max_discount_amount`, `min_order_amount`, `total_quantity`, `used_quantity`, `usage_limit_per_user`, `start_date`, `end_date`, `status`, `is_welcome_voucher`, `created_at`, `updated_at`)
VALUES 
('vch-01', 'CHAOBANMOI', 'Giảm 20% Cho Bạn Mới', 'Ưu đãi đặc biệt giảm 20% cho khách hàng mới đăng ký', 'PERCENTAGE', 20.00, 50000.00, 100000.00, 500, 32, 1, '2026-01-01 00:00:00', '2026-12-31 23:59:59', 'ACTIVE', 1, NOW(), NOW()),
('vch-02', 'OMNI50K', 'Giảm 50.000đ Đơn Từ 300K', 'Giảm trực tiếp 50K cho hóa đơn từ 300.000đ', 'FIXED_AMOUNT', 50000.00, 50000.00, 300000.00, 200, 45, 1, '2026-01-01 00:00:00', '2026-12-31 23:59:59', 'ACTIVE', 0, NOW(), NOW()),
('vch-03', 'TIECGIADINH', 'Giảm 10% Tiệc Gia Đình', 'Áp dụng cho hóa đơn gia đình từ 500.000đ', 'PERCENTAGE', 10.00, 150000.00, 500000.00, 100, 18, 2, '2026-01-01 00:00:00', '2026-12-31 23:59:59', 'ACTIVE', 0, NOW(), NOW());

-- 3.8. ORDERS & ORDER ITEMS (Đơn hàng mẫu phong phú, hỗ trợ multi-round)
INSERT INTO `orders` (`id`, `order_number`, `table_session_id`, `table_id`, `table_no`, `customer_id`, `customer_name`, `customer_phone`, `order_type`, `status`, `payment_status`, `payment_method`, `voucher_id`, `voucher_code`, `subtotal`, `discount_amount`, `tax_amount`, `total_amount`, `created_by_staff_id`, `created_by_user_id`, `created_at`, `updated_at`)
VALUES
('ord-01', 'ORD-20261001', 'ses-01', 'tbl-02', 'Bàn 02', 'cus-01', 'Nguyễn Hải Đăng', '0911223344', 'dine_in', 'preparing', 'unpaid', 'qr_code', 'vch-02', 'OMNI50K', 330000.00, 50000.00, 0.00, 280000.00, 'stf-05', 'usr-05', NOW(), NOW()),
('ord-02', 'ORD-20261002', 'ses-02', 'tbl-06', 'Bàn 06', 'cus-02', 'Trần Thị Mai', '0911223345', 'dine_in', 'confirmed', 'unpaid', 'cash', NULL, NULL, 534000.00, 0.00, 0.00, 534000.00, 'stf-06', 'usr-06', NOW(), NOW()),
('ord-03', 'ORD-20261003', NULL, NULL, NULL, 'cus-03', 'Phạm Quốc Cường', '0911223346', 'takeaway', 'completed', 'paid', 'qr_code', 'vch-01', 'CHAOBANMOI', 190000.00, 38000.00, 0.00, 152000.00, 'stf-03', 'usr-03', DATE_SUB(NOW(), INTERVAL 2 HOUR), NOW()),
('ord-04', 'ORD-20261004', 'ses-03', 'tbl-01', 'Bàn 01', 'cus-04', 'Lê Quỳnh Nga', '0911223347', 'dine_in', 'completed', 'paid', 'card', NULL, NULL, 234000.00, 0.00, 0.00, 234000.00, 'stf-05', 'usr-05', DATE_SUB(NOW(), INTERVAL 4 HOUR), NOW());

INSERT INTO `order_items` (`id`, `order_id`, `menu_item_id`, `item_name`, `quantity`, `unit_price`, `notes`, `round_no`, `status`, `added_at`, `confirmed_by_staff_id`, `confirmed_at`, `created_at`, `updated_at`)
VALUES
-- Đơn ord-01 (Bàn 02) - Đợt 1
('item-01', 'ord-01', 'dish-01', 'Phở Bò Tái Nạm Wagyu', 2, 89000.00, '1 tô không hành lá, 1 tô bình thường', 1, 'preparing', NOW(), 'stf-05', NOW(), NOW(), NOW()),
('item-02', 'ord-01', 'dish-26', 'Trà Sen Vàng Hạt Sen Kem Macchiato', 2, 42000.00, 'Ít ngọt, ít đá', 1, 'ready', NOW(), 'stf-05', NOW(), NOW(), NOW()),
-- Đơn ord-01 (Bàn 02) - Đợt 2 (Khách gọi thêm)
('item-03', 'ord-01', 'dish-11', 'Bánh Mì Chảo Thập Cẩm Bò Xíu Mại', 1, 55000.00, 'Trứng lòng đào chín tới', 2, 'preparing', NOW(), 'stf-05', NOW(), NOW(), NOW()),

-- Đơn ord-02 (Bàn 06)
('item-04', 'ord-02', 'dish-16', 'Set Lẩu Riêu Cua Bắp Bò Sườn Sụn', 1, 389000.00, 'Nước dùng cay vừa, thêm rau', 1, 'confirmed', NOW(), 'stf-06', NOW(), NOW(), NOW()),
('item-05', 'ord-02', 'dish-19', 'Gà Ta Ủ Muối Hoa Tiêu Nửa Con', 1, 160000.00, 'Chấm nhiều muối ớt chanh', 1, 'confirmed', NOW(), 'stf-06', NOW(), NOW(), NOW()),

-- Đơn ord-03 (Takeaway)
('item-06', 'ord-03', 'dish-06', 'Cơm Tấm Sườn Bì Chả Trứng Ốp La', 2, 79000.00, 'Thêm nhiều mỡ hành và nước mắm kẹo', 1, 'served', DATE_SUB(NOW(), INTERVAL 2 HOUR), 'stf-03', DATE_SUB(NOW(), INTERVAL 2 HOUR), NOW(), NOW()),
('item-07', 'ord-03', 'dish-28', 'Cà Phê Sữa Đá Phin Đậm Đà Buôn Ma Thuột', 1, 29000.00, 'Nhiều sữa, đậm vị', 1, 'served', DATE_SUB(NOW(), INTERVAL 2 HOUR), 'stf-03', DATE_SUB(NOW(), INTERVAL 2 HOUR), NOW(), NOW());

-- 3.9. PAYMENT TRANSACTIONS & PAYMENTS
INSERT INTO `payment_transactions` (`id`, `order_id`, `transaction_reference`, `amount_expected`, `amount_received`, `payment_gateway`, `status`, `raw_payload`, `created_at`, `updated_at`)
VALUES
('ptx-01', 'ord-03', 'TXN-VIETQR-20261003-01', 152000.00, 152000.00, 'VIETQR', 'success', '{"bank":"MB","content":"OMNIRESTO ORD-20261003","amount":152000}', NOW(), NOW()),
('ptx-02', 'ord-04', 'TXN-POS-20261004-01', 234000.00, 234000.00, 'POS_CARD', 'success', '{"cardType":"VISA","terminal":"POS-01","amount":234000}', NOW(), NOW());

INSERT INTO `payments` (`id`, `order_id`, `payment_number`, `amount`, `method`, `status`, `created_at`)
VALUES
('pay-01', 'ord-03', 'PAY-20261003-01', 152000.00, 'QR_CODE', 'SUCCESS', NOW()),
('pay-02', 'ord-04', 'PAY-20261004-01', 234000.00, 'CARD', 'SUCCESS', NOW());

-- 3.10. SERVICE REQUESTS (Yêu cầu phục vụ bàn)
INSERT INTO `service_requests` (`id`, `table_session_id`, `table_id`, `table_no`, `request_type`, `note`, `status`, `resolved_at`, `resolved_by_staff_id`, `created_at`, `updated_at`)
VALUES
('req-01', 'ses-01', 'tbl-02', 'Bàn 02', 'ice', 'Xin thêm 2 ly đá lạnh', 'pending', NULL, NULL, NOW(), NOW()),
('req-02', 'ses-02', 'tbl-06', 'Bàn 06', 'utensils', 'Thêm 2 bộ bát đũa và muỗng ăn lẩu', 'in_progress', NULL, 'stf-06', NOW(), NOW()),
('req-03', 'ses-03', 'tbl-01', 'Bàn 01', 'tissue', 'Xin thêm khăn giấy khô', 'resolved', NOW(), 'stf-05', NOW(), NOW());

-- 3.11. RESERVATIONS (Đặt bàn trước)
INSERT INTO `reservations` (`id`, `customer_name`, `customer_phone`, `customer_email`, `party_size`, `reservation_date`, `reservation_time`, `table_no`, `notes`, `status`, `reservation_code`, `created_at`, `updated_at`)
VALUES
('res-01', 'Hoàng Minh Quân', '0938112233', 'quanhoang@gmail.com', 6, CURDATE(), '19:00:00', 'Bàn 05', 'Tiệc kỷ niệm ngày cưới, xếp bàn gần cửa sổ', 'confirmed', 'RSV-OMNI-1001', NOW(), NOW()),
('res-02', 'Vũ Thảo Trang', '0945667788', 'trangvu@gmail.com', 10, CURDATE(), '19:30:00', 'Bàn 10', 'Tiệc liên hoan công ty, chuẩn bị sẵn chén đĩa', 'confirmed', 'RSV-OMNI-1002', NOW(), NOW()),
('res-03', 'Nguyễn Gia Bảo', '0903445566', 'baonguyen@gmail.com', 4, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '12:00:00', NULL, 'Họp đối tác ăn trưa', 'pending', 'RSV-OMNI-1003', NOW(), NOW());

-- 3.12. EVENTS (Sự kiện ẩm thực)
INSERT INTO `events` (`id`, `title`, `description`, `short_description`, `event_date`, `start_date`, `end_date`, `start_time`, `end_time`, `location`, `image_url`, `price`, `max_capacity`, `registered_count`, `status`, `is_featured`, `tags`, `created_at`, `updated_at`)
VALUES
('ev-01', 'Hành Trình Tinh Hoa Phở Việt & Bò Wagyu', 'Trải nghiệm ẩm thực thượng hạng với đầu bếp 5 sao hướng dẫn cách phân biệt các tầng hương nước dùng phở hầm xương 24h kết hợp cùng bò Wagyu trứ danh.', 'Thưởng thức và khám phá bí quyết nước dùng phở truyền thống cùng Bếp Trưởng.', DATE_ADD(CURDATE(), INTERVAL 5 DAY), DATE_ADD(CURDATE(), INTERVAL 5 DAY), DATE_ADD(CURDATE(), INTERVAL 5 DAY), '18:30:00', '21:00:00', 'OmniResto Chi Nhánh 1 - 123 Đường Ẩm Thực, Quận 1', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&auto=format&fit=crop', 299000, 30, 18, 'upcoming', 1, 'Ẩm thực truyền thống, Workshop, Thưởng thức', NOW(), NOW()),
('ev-02', 'Đêm Tiệc Trà Sen & Cà Phê Mộc Cao Nguyên', 'Giao lưu nghệ nhân pha chế cà phê Robusta rang mộc và thưởng trà sen Tây Hồ đượm hương.', 'Thưởng trà sen và cà phê phin mộc cùng nghệ nhân.', DATE_ADD(CURDATE(), INTERVAL 12 DAY), DATE_ADD(CURDATE(), INTERVAL 12 DAY), DATE_ADD(CURDATE(), INTERVAL 12 DAY), '19:00:00', '21:30:00', 'Phòng Trà OmniResto - Tầng 2', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop', 150000, 25, 12, 'upcoming', 1, 'Trà đạo, Cà phê mộc, Giao lưu', NOW(), NOW());

-- 3.13. NEWSLETTER SUBSCRIBERS
INSERT INTO `newsletter_subscribers` (`id`, `email`, `name`, `is_active`, `source`, `created_at`, `updated_at`)
VALUES
('nl-01', 'khachhang1@gmail.com', 'Đỗ Thành Long', 1, 'website', NOW(), NOW()),
('nl-02', 'khachhang2@gmail.com', 'Lê Quỳnh Nga', 1, 'website', NOW(), NOW()),
('nl-03', 'khachhang3@gmail.com', 'Vũ Bích Hạnh', 1, 'website', NOW(), NOW());

-- ============================================================================
-- 4. RESTORE ENVIRONMENT SETTINGS
-- ============================================================================
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- ============================================================================
-- OmniResto Database Refresh Script Completed Successfully!
-- ============================================================================
