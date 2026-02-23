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

$input = json_decode(file_get_contents('php://input'), true);

$beacon_id = $input['beacon_id'] ?? null;
$user_id = $input['user_id'] ?? null;

if (!$beacon_id || !$user_id) {
    echo json_encode(['status' => 'error', 'message' => 'beacon_id and user_id are required']);
    exit;
}

$conn = getDBConnection();

$stmt = $conn->prepare("DELETE FROM beacon_responses WHERE beacon_id = ? AND user_id = ?");
$stmt->bind_param('is', $beacon_id, $user_id);
$stmt->execute();
$stmt->close();

$conn->close();

echo json_encode(['status' => 'success']);
