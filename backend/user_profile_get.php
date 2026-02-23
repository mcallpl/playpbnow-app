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

$user_id = $_GET['user_id'] ?? null;

if (!$user_id) {
    echo json_encode(['status' => 'error', 'message' => 'user_id is required']);
    exit;
}

$conn = getDBConnection();

$stmt = $conn->prepare(
    "SELECT user_id, phone, first_name, last_name, gender, created_at
     FROM user_profiles WHERE user_id = ?"
);
$stmt->bind_param('s', $user_id);
$stmt->execute();
$profile = $stmt->get_result()->fetch_assoc();
$stmt->close();

$conn->close();

if ($profile) {
    echo json_encode(['status' => 'success', 'profile' => $profile]);
} else {
    echo json_encode(['status' => 'success', 'profile' => null]);
}
