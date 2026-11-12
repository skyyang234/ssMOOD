<?php
ini_set('memory_limit', '1024M');
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$datasetId = $_GET['id'] ?? '';
$gene = $_GET['gene'] ?? '';

if ($datasetId === '' || $gene === '') {
    $conn->close();
    http_response_code(400);
    jsonOut(['error' => 'Missing required parameters']);
    exit;
}

$sample = resolveSample($conn, $datasetId, 0);
if (!$sample) {
    $conn->close();
    http_response_code(404);
    jsonOut(['error' => 'Sample not found']);
    exit;
}

$expr = getExpressionVector($conn, $sample, $gene);
if (!$expr) {
    $conn->close();
    gzipJson([]);
    exit;
}

$values = decompressFloat32Vector($expr['compressed_vector']);
$rows = expressionRowsForSample($conn, (int)$sample['sample_id'], $values, true);

$conn->close();
gzipJson($rows);
