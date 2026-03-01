ALTER TABLE beacons MODIFY COLUMN status ENUM('active','expired','cancelled') NOT NULL DEFAULT 'active';
