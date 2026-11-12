<?php
ini_set('memory_limit', '1024M');
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$datasetId = $_GET['id'] ?? '';
$peakId = $_GET['peak_id'] ?? '';
$peakName = $_GET['peak_name'] ?? '';

if ($datasetId === '' || ($peakId === '' && $peakName === '')) {
    $conn->close();
    http_response_code(400);
    jsonOut(['error' => 'Missing required parameters']);
    exit;
}

$sample = resolveAtacSample($conn, $datasetId);
$peak = resolvePeakFeature($conn, $peakId, $peakName);
if (!$sample || !$peak) {
    $conn->close();
    http_response_code(404);
    jsonOut(['error' => 'ATAC sample or peak not found']);
    exit;
}

$expr = fetchOne(
    $conn,
    'SELECT compressed_vector, expression_type, non_zero_count, min_val, max_val
     FROM expression_peak
     WHERE sample_id = ? AND feature_id = ? AND expression_type = "tfidf"
     LIMIT 1',
    'ii',
    (int)$sample['sample_id'],
    (int)$peak['feature_id']
);
if (!$expr) {
    $expr = fetchOne(
        $conn,
        'SELECT compressed_vector, expression_type, non_zero_count, min_val, max_val
         FROM expression_peak
         WHERE sample_id = ? AND feature_id = ?
         LIMIT 1',
        'ii',
        (int)$sample['sample_id'],
        (int)$peak['feature_id']
    );
}

if (!$expr) {
    $conn->close();
    gzipJson([]);
    exit;
}

$values = decompressFloat32Vector($expr['compressed_vector']);
$rows = expressionRowsForSample($conn, (int)$sample['sample_id'], $values, true);

$conn->close();
gzipJson($rows);
