CREATE TABLE IF NOT EXISTS beacon_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  beacon_id INT NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (beacon_id, created_at),
  FOREIGN KEY (beacon_id) REFERENCES beacons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
