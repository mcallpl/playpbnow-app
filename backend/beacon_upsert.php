<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db_config.php';

// Parse input
$input = json_decode(file_get_contents('php://input'), true);

$user_id = $input['user_id'] ?? null;
$court_id = $input['court_id'] ?? null;
$beacon_type = $input['beacon_type'] ?? 'structured';
$player_count = ($beacon_type === 'casual') ? 0 : ($input['player_count'] ?? 1);
$skill_level = $input['skill_level'] ?? null;
$message = $input['message'] ?? null;
$duration_minutes = (int)($input['duration_minutes'] ?? 60);

if (!$user_id || !$court_id) {
    echo json_encode(['status' => 'error', 'message' => 'user_id and court_id are required']);
    exit;
}

$conn = getDBConnection();

// Expire old beacons first
$conn->query("UPDATE beacons SET status='expired' WHERE expires_at < NOW() AND status='active'");

// Check if user already has an active beacon
$stmt = $conn->prepare("SELECT id FROM beacons WHERE user_id = ? AND status = 'active' LIMIT 1");
$stmt->bind_param('s', $user_id);
$stmt->execute();
$result = $stmt->get_result();
$existing = $result->fetch_assoc();
$stmt->close();

if ($existing) {
    // Update existing beacon
    $stmt = $conn->prepare(
        "UPDATE beacons SET court_id = ?, beacon_type = ?, player_count = ?, skill_level = ?, message = ?,
         expires_at = NOW() + INTERVAL ? MINUTE
         WHERE id = ?"
    );
    $stmt->bind_param('isiisii', $court_id, $beacon_type, $player_count, $skill_level, $message, $duration_minutes, $existing['id']);
    $stmt->execute();
    $stmt->close();
    $beacon_id = $existing['id'];
} else {
    // Insert new beacon
    $stmt = $conn->prepare(
        "INSERT INTO beacons (user_id, beacon_type, court_id, player_count, skill_level, message, status, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', NOW() + INTERVAL ? MINUTE)"
    );
    $stmt->bind_param('ssiissi', $user_id, $beacon_type, $court_id, $player_count, $skill_level, $message, $duration_minutes);
    $stmt->execute();
    $beacon_id = $conn->insert_id;
    $stmt->close();
}

// Fetch the beacon to return
$stmt = $conn->prepare("SELECT id, beacon_type, court_id, player_count, skill_level, message, status, expires_at FROM beacons WHERE id = ?");
$stmt->bind_param('i', $beacon_id);
$stmt->execute();
$beacon = $stmt->get_result()->fetch_assoc();
$stmt->close();

$conn->close();

echo json_encode(['status' => 'success', 'beacon' => $beacon]);
