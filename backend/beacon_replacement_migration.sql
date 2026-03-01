-- Player Replacement Protection™ Migration
-- Run in phpMyAdmin

-- 1. Expand member status ENUM with new values
ALTER TABLE beacon_lobby_members
  MODIFY COLUMN status ENUM('joined','confirmed','left','seeking_replacement','replaced') DEFAULT 'joined';

-- 2. Create replacement_requests table
CREATE TABLE IF NOT EXISTS replacement_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lobby_id INT NOT NULL,
  departing_member_id INT NOT NULL,
  departing_user_id VARCHAR(64) NOT NULL,
  replacement_user_id VARCHAR(64) DEFAULT NULL,
  replacement_member_id INT DEFAULT NULL,
  status ENUM('open','filled','cancelled','expired') DEFAULT 'open',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  filled_at DATETIME DEFAULT NULL,
  FOREIGN KEY (lobby_id) REFERENCES beacon_lobbies(id) ON DELETE CASCADE,
  FOREIGN KEY (departing_member_id) REFERENCES beacon_lobby_members(id) ON DELETE RESTRICT,
  FOREIGN KEY (replacement_member_id) REFERENCES beacon_lobby_members(id) ON DELETE SET NULL,
  INDEX idx_lobby_status (lobby_id, status),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
