-- Live Beacon Feature — Database Migrations
-- Run these on the PlayPBNow database (MariaDB at peoplestar.com)

-- 1. Beacons: A player broadcasting availability at a court
CREATE TABLE IF NOT EXISTS beacons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  beacon_type ENUM('casual','structured') NOT NULL DEFAULT 'structured',
  court_id INT NOT NULL,
  player_count INT NOT NULL DEFAULT 1,
  skill_level VARCHAR(20) DEFAULT NULL,
  message VARCHAR(255) DEFAULT NULL,
  status ENUM('active','expired','cancelled') NOT NULL DEFAULT 'active',
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_court_status (court_id, status),
  INDEX idx_user (user_id),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Beacon Lobbies: Gathering point before match starts
CREATE TABLE IF NOT EXISTS beacon_lobbies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  beacon_id INT NOT NULL,
  host_user_id VARCHAR(64) NOT NULL,
  court_id INT NOT NULL,
  status ENUM('gathering','locked','started','completed','cancelled') DEFAULT 'gathering',
  target_players INT NOT NULL DEFAULT 4,
  schedule_json TEXT DEFAULT NULL,
  match_quality_percent INT DEFAULT NULL,
  collab_session_id INT DEFAULT NULL,
  session_code VARCHAR(10) DEFAULT NULL,
  UNIQUE KEY uk_session_code (session_code),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (beacon_id) REFERENCES beacons(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_host (host_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Beacon Lobby Members: Players in a lobby
CREATE TABLE IF NOT EXISTS beacon_lobby_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lobby_id INT NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  player_id INT DEFAULT NULL,
  first_name VARCHAR(100) DEFAULT NULL,
  last_name VARCHAR(100) DEFAULT NULL,
  gender VARCHAR(10) DEFAULT NULL,
  status ENUM('joined','confirmed','left','seeking_replacement','replaced') DEFAULT 'joined',
  reliability_pct DECIMAL(5,2) DEFAULT NULL,
  CHECK (reliability_pct IS NULL OR (reliability_pct >= 0 AND reliability_pct <= 100)),
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lobby_id) REFERENCES beacon_lobbies(id) ON DELETE CASCADE,
  UNIQUE KEY unique_member (lobby_id, user_id),
  INDEX idx_lobby (lobby_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
