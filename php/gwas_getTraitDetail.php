<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$id = $_GET['id'] ?? ($_GET['trait_id'] ?? '');

if ($id === '' || !is_numeric($id)) {
    $conn->close();
    http_response_code(400);
    jsonOut(['error' => 'Invalid trait id']);
    exit;
}

$row = fetchOne($conn, 'SELECT * FROM trait_meta WHERE trait_id = ? LIMIT 1', 'i', (int)$id);
if (!$row) {
    $conn->close();
    http_response_code(404);
    jsonOut(['error' => 'Trait not found']);
    exit;
}

$row['trait_id'] = (int)$row['trait_id'];
$row['project_id'] = (int)$row['project_id'];
$row['sample_size'] = $row['sample_size'] === null ? null : (int)$row['sample_size'];
$row['pub_year'] = $row['pub_year'] === null ? null : (int)$row['pub_year'];
$row['lambda_gc'] = $row['lambda_gc'] === null ? null : (float)$row['lambda_gc'];
$row['has_full_stats'] = (int)$row['has_full_stats'];
$row['is_depression_related'] = (int)$row['is_depression_related'];
$row['has_data_files'] = (int)$row['has_data_files'];

$conn->close();
jsonOut(['trait' => $row]);
