ALTER TABLE beacons MODIFY COLUMN status ENUM('active','expired','cancelled') DEFAULT 'active';
