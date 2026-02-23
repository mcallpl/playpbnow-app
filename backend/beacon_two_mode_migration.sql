-- Two-Mode Beacon System Migration
-- Run in phpMyAdmin

-- 1. Add beacon_type column (existing beacons default to 'structured')
ALTER TABLE beacons
  ADD COLUMN beacon_type ENUM('casual','structured') NOT NULL DEFAULT 'structured' AFTER user_id;

-- 2. Lightweight response tracking for casual beacons
CREATE TABLE IF NOT EXISTS beacon_responses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  beacon_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) DEFAULT '',
  response_type ENUM('on_my_way','interested') NOT NULL DEFAULT 'on_my_way',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_response (beacon_id, user_id),
  INDEX idx_beacon (beacon_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
