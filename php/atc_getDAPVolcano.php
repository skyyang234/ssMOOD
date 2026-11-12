<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$exists = fetchOne($conn, 'SHOW TABLES LIKE "differential_peak_result"');
if (!$exists) {
    $conn->close();
    gzipJson([
        'available' => false,
        'points' => [],
        'message' => 'Differential accessible peak results have not been computed yet.'
    ]);
    exit;
}

$contrast = trim($_GET['contrast'] ?? '');
$cellType = trim($_GET['cell_type'] ?? ($_GET['cluster'] ?? ''));
$limit = min(max((int)($_GET['limit'] ?? 20000), 1), 100000);

$where = ['d.project_id = 14', 'd.padj IS NOT NULL', 'd.log2fc IS NOT NULL'];
$types = '';
$params = [];
if ($contrast !== '') {
    $where[] = 'd.contrast = ?';
    $types .= 's';
    $params[] = $contrast;
}
if ($cellType !== '') {
    $where[] = 'd.cell_type = ?';
    $types .= 's';
    $params[] = $cellType;
}
$types .= 'i';
$params[] = $limit;

$rows = fetchAll(
    $conn,
    'SELECT d.feature_id, f.feature_name, d.log2fc, d.padj
     FROM differential_peak_result d
     JOIN feature f ON d.feature_id = f.feature_id
     WHERE f.feature_type = "peak" AND ' . implode(' AND ', $where) . '
     ORDER BY d.padj ASC
     LIMIT ?',
    $types,
    ...$params
);

$points = [];
foreach ($rows as $row) {
    $padj = max((float)$row['padj'], 1e-300);
    $points[] = [
        'feature_id' => (int)$row['feature_id'],
        'peak' => $row['feature_name'],
        'log2fc' => (float)$row['log2fc'],
        'padj' => (float)$row['padj'],
        'neg_log10_padj' => -log10($padj)
    ];
}

$conn->close();
gzipJson([
    'available' => count($points) > 0,
    'points' => $points,
    'message' => count($points) > 0 ? null : 'Differential accessible peak results have not been computed yet.'
]);
