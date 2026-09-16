-- ===================================================
-- OSD NOC2 Database Schema (Full Version)
-- ===================================================
CREATE DATABASE IF NOT EXISTS noc_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE noc_db;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS zabbix_link;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS maintenance_plans;
DROP TABLE IF EXISTS notification_settings;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS repair_history;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS staff_queue;
DROP TABLE IF EXISTS users;

-- ===================================================
-- TABLES
-- ===================================================

CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  must_change_password TINYINT(1) NOT NULL DEFAULT 0
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE staff_queue (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL,
  current_device VARCHAR(100) NULL,
  current_ticket_id VARCHAR(50) NULL,
  last_response_seconds INT NOT NULL DEFAULT 0,
  queue_order INT NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE alerts (
  id VARCHAR(50) PRIMARY KEY,
  device_name VARCHAR(100) NOT NULL,
  problem_name VARCHAR(255) NULL,
  severity VARCHAR(20) NOT NULL,
  status VARCHAR(30) NOT NULL,
  assigned_to VARCHAR(50) NULL,
  assigned_name VARCHAR(100) NULL,
  queue_position INT NULL,
  created_at DATETIME NOT NULL,
  response_started_at DATETIME NULL,
  diagnosis TEXT NULL,
  fix_method TEXT NULL,
  closed_at DATETIME NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE repair_history (
  id VARCHAR(50) PRIMARY KEY,
  alert_id VARCHAR(50) NOT NULL,
  device_name VARCHAR(100) NOT NULL,
  staff_id VARCHAR(50) NOT NULL,
  staff_name VARCHAR(100) NOT NULL,
  root_cause VARCHAR(255) NOT NULL,
  fix_method VARCHAR(255) NOT NULL,
  mttr_minutes INT NOT NULL,
  queue_missed TINYINT(1) NOT NULL DEFAULT 0,
  closed_at DATETIME NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE inventory (
  id VARCHAR(50) PRIMARY KEY,
  device_name VARCHAR(100) NOT NULL,
  serial_number VARCHAR(100) NOT NULL,
  ip_address VARCHAR(45) NULL DEFAULT NULL,
  warranty_until DATE NULL,
  location VARCHAR(255) NOT NULL DEFAULT ''
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE notification_settings (
  id INT PRIMARY KEY,
  line_notify TINYINT(1) NOT NULL DEFAULT 1,
  telegram TINYINT(1) NOT NULL DEFAULT 0,
  min_severity VARCHAR(20) NOT NULL,
  receivers JSON NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE customers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  location VARCHAR(255) NOT NULL DEFAULT ''
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE maintenance_plans (
  id VARCHAR(50) PRIMARY KEY,
  customer_name VARCHAR(200) NULL,
  title VARCHAR(200) NOT NULL,
  location VARCHAR(255) NOT NULL DEFAULT '',
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  pause_zabbix_alert TINYINT(1) NOT NULL DEFAULT 0,
  created_by VARCHAR(50) NOT NULL,
  assignee_id VARCHAR(50) NULL,
  assignee_name VARCHAR(100) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  acknowledged_by VARCHAR(50) NULL,
  acknowledged_at DATETIME NULL,
  acknowledged_by_name VARCHAR(100) NULL,
  completed_by VARCHAR(50) NULL,
  completed_at DATETIME NULL,
  completed_by_name VARCHAR(100) NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE zabbix_link (
  id INT PRIMARY KEY DEFAULT 1,
  base_url VARCHAR(500) NOT NULL DEFAULT '',
  api_url VARCHAR(500) NOT NULL DEFAULT '',
  api_token VARCHAR(500) NOT NULL DEFAULT ''
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ===================================================
-- SEED DATA
-- ===================================================

INSERT INTO users (id, full_name, username, password, role) VALUES
  ('u-admin-01', 'NOC Admin', 'admin', 'admin123', 'admin'),
  ('u-admin-11', 'สรวุฒิ', 'sarawut', 'sarawut123', 'user'),
  ('u-admin-12', 'สุทธิกานต์', 'sutthikan', 'sutthikan123', 'user'),
  ('u-admin-13', 'เจตนา', 'jattana', 'jattana123', 'user'),
  ('u-super-01', 'NOC Super Admin', 'super', 'super123', 'admin'),
  ('u-super-11', 'สาทร', 'sathorn', 'sathorn123', 'admin'),
  ('u-super-12', 'นคร', 'nakorn', 'nakorn123', 'admin'),
  ('u-super-13', 'ณัฐกรณ์', 'nattakorn', 'nattakorn123', 'admin');

INSERT INTO staff_queue (id, name, role, is_active, status, current_device, current_ticket_id, last_response_seconds, queue_order) VALUES
  ('s-01', 'Anan', 'user', 1, 'Available', NULL, NULL, 142, 1),
  ('s-02', 'Benz', 'user', 1, 'Busy', 'SW-Core-01', 'a-002', 221, 2),
  ('s-03', 'Chat', 'user', 1, 'Available', NULL, NULL, 97, 3),
  ('s-04', 'Dome', 'user', 1, 'Busy', 'RTR-BKK-22', 'a-001', 269, 4);

INSERT INTO repair_history (id, alert_id, device_name, staff_id, staff_name, root_cause, fix_method, mttr_minutes, queue_missed, closed_at) VALUES
  ('h-001', 'a-old-001', 'SW-Access-77', 'u-admin-01', 'NOC Admin', 'Fiber Link', 'Re-terminate fiber connector', 18, 0, '2026-02-23 05:40:00'),
  ('h-002', 'a-old-002', 'RTR-CNX-03', 'u-super-01', 'NOC Super Admin', 'Configuration Drift', 'Restore baseline config', 26, 1, '2026-02-24 08:20:00');

INSERT INTO inventory (id, device_name, serial_number, warranty_until, location) VALUES
  ('inv-001', 'RTR-BKK-22', 'RTBKK22-AX78', '2027-11-30', 'Bangkok HQ - Rack A1'),
  ('inv-002', 'SW-Core-01', 'SWCR01-Z9K2', '2028-03-15', 'Bangkok HQ - Rack C2');

INSERT INTO notification_settings (id, line_notify, telegram, min_severity, receivers) VALUES
  (1, 1, 0, 'High', JSON_ARRAY('noc-oncall', 'supervisor'));

INSERT INTO customers (id, name, location) VALUES
  ('c-001', 'Bangkok HQ', 'Bangkok'),
  ('c-002', 'Data Center BKK', 'Bangkok - Bangna'),
  ('c-003', 'CNX Branch', 'Chiang Mai');

INSERT INTO zabbix_link (id, base_url, api_url, api_token) VALUES (1, '', 'http://192.168.56.110/api_jsonrpc.php', 'd5144844d2325743ae09eede597fb44b');
