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

$lobby_id = $input['lobby_id'] ?? null;
$user_id = $input['user_id'] ?? null;

if (!$lobby_id || !$user_id) {
    echo json_encode(['status' => 'error', 'message' => 'lobby_id and user_id are required']);
    exit;
}

$conn = getDBConnection();

// Verify lobby exists and is in gathering or locked status
$stmt = $conn->prepare("SELECT id, host_user_id, status FROM beacon_lobbies WHERE id = ?");
$stmt->bind_param('i', $lobby_id);
$stmt->execute();
$lobby = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$lobby) {
    $conn->close();
    echo json_encode(['status' => 'error', 'message' => 'Lobby not found']);
    exit;
}

if (!in_array($lobby['status'], ['gathering', 'locked'])) {
    $conn->close();
    echo json_encode(['status' => 'error', 'message' => 'Replacement can only be requested during gathering or locked phases']);
    exit;
}

// Host cannot be replaced
if ($lobby['host_user_id'] === $user_id) {
    $conn->close();
    echo json_encode(['status' => 'error', 'message' => 'The host cannot request a replacement. Cancel the beacon instead.']);
    exit;
}

// Verify user is a confirmed member
$stmt = $conn->prepare("SELECT id, status FROM beacon_lobby_members WHERE lobby_id = ? AND user_id = ?");
$stmt->bind_param('is', $lobby_id, $user_id);
$stmt->execute();
$member = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$member) {
    $conn->close();
    echo json_encode(['status' => 'error', 'message' => 'You are not a member of this lobby']);
    exit;
}

if ($member['status'] !== 'confirmed') {
    $conn->close();
    echo json_encode(['status' => 'error', 'message' => 'Only confirmed members can request a replacement']);
    exit;
}

// Check no existing open replacement request
$stmt = $conn->prepare("SELECT id FROM replacement_requests WHERE lobby_id = ? AND departing_user_id = ? AND status = 'open'");
$stmt->bind_param('is', $lobby_id, $user_id);
$stmt->execute();
$existing = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ($existing) {
    $conn->close();
    echo json_encode(['status' => 'error', 'message' => 'You already have an open replacement request']);
    exit;
}

// Create replacement request and update member status
$conn->begin_transaction();
try {
    // Insert replacement request
    $stmt = $conn->prepare(
        "INSERT INTO replacement_requests (lobby_id, departing_member_id, departing_user_id) VALUES (?, ?, ?)"
    );
    $member_id = $member['id'];
    $stmt->bind_param('iis', $lobby_id, $member_id, $user_id);
    $stmt->execute();
    $request_id = $conn->insert_id;
    $stmt->close();

    // Update member status
    $stmt = $conn->prepare("UPDATE beacon_lobby_members SET status = 'seeking_replacement' WHERE id = ?");
    $stmt->bind_param('i', $member_id);
    $stmt->execute();
    $stmt->close();

    $conn->commit();
} catch (Exception $e) {
    $conn->rollback();
    $conn->close();
    echo json_encode(['status' => 'error', 'message' => 'Failed to create replacement request']);
    exit;
}

$conn->close();

echo json_encode(['status' => 'success', 'request_id' => $request_id]);
