<?php
ini_set('memory_limit', '2048M');
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$studyId = $_GET['id'] ?? '';
$gene = $_GET['gene'] ?? '';
if ($studyId === '' || $gene === '') {
    $conn->close();
    http_response_code(400);
    jsonOut(['error' => 'Missing required parameters']);
    exit;
}

$resolved = resolveStudySamples($conn, $studyId);
$rows = [];
foreach ($resolved['sample_ids'] as $sampleId) {
    $sample = resolveSample($conn, $sampleId, 0);
    if (!$sample) {
        continue;
    }
    $expr = getExpressionVector($conn, $sample, $gene);
    if (!$expr) {
        continue;
    }
    $values = decompressFloat32Vector($expr['compressed_vector']);
    foreach (expressionRowsForSample($conn, (int)$sample['sample_id'], $values, true) as $row) {
        $row['sample_id'] = (int)$sample['sample_id'];
        $rows[] = $row;
    }
}

$conn->close();
gzipJson(['data' => $rows, 'missing' => $resolved['missing']]);
