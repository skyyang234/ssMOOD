<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$exists = fetchOne($conn, 'SHOW TABLES LIKE "differential_peak_result"');
if (!$exists) {
    $conn->close();
    gzipJson([
        'available' => false,
        'peaks' => [],
        'message' => 'Differential accessible peak results have not been computed yet.'
    ]);
    exit;
}

$cellType = trim($_GET['cluster'] ?? ($_GET['cell_type'] ?? ''));
$contrast = trim($_GET['contrast'] ?? '');
$limit = min(max((int)($_GET['limit'] ?? 1000), 1), 5000);

$where = ['d.project_id = 14'];
$types = '';
$params = [];
if ($cellType !== '') {
    $where[] = 'd.cell_type = ?';
    $types .= 's';
    $params[] = $cellType;
}
if ($contrast !== '') {
    $where[] = 'd.contrast = ?';
    $types .= 's';
    $params[] = $contrast;
}
$types .= 'i';
$params[] = $limit;

$rows = fetchAll(
    $conn,
    'SELECT f.feature_id, f.feature_name, f.chrom, f.peak_start, f.peak_end,
            d.contrast, d.cell_type, d.log2fc, d.pvalue, d.padj,
            d.avg_acc_group1, d.avg_acc_group2, d.pct_group1, d.pct_group2,
            d.n_samples_group1, d.n_samples_group2, d.method, d.comparison_scope
     FROM differential_peak_result d
     JOIN feature f ON d.feature_id = f.feature_id
     WHERE f.feature_type = "peak" AND ' . implode(' AND ', $where) . '
     ORDER BY d.padj ASC
     LIMIT ?',
    $types,
    ...$params
);

$peaks = [];
foreach ($rows as $row) {
    $peaks[] = [
        'feature_id' => (int)$row['feature_id'],
        'peak' => $row['feature_name'],
        'chrom' => $row['chrom'],
        'start' => $row['peak_start'] === null ? null : (int)$row['peak_start'],
        'end' => $row['peak_end'] === null ? null : (int)$row['peak_end'],
        'contrast' => $row['contrast'],
        'cell_type' => $row['cell_type'],
        'log2fc' => $row['log2fc'] === null ? null : (float)$row['log2fc'],
        'pvalue' => $row['pvalue'] === null ? null : (float)$row['pvalue'],
        'padj' => $row['padj'] === null ? null : (float)$row['padj'],
        'avg_acc_group1' => $row['avg_acc_group1'] === null ? null : (float)$row['avg_acc_group1'],
        'avg_acc_group2' => $row['avg_acc_group2'] === null ? null : (float)$row['avg_acc_group2'],
        'pct_group1' => $row['pct_group1'] === null ? null : (float)$row['pct_group1'],
        'pct_group2' => $row['pct_group2'] === null ? null : (float)$row['pct_group2'],
        'n_samples_group1' => $row['n_samples_group1'] === null ? null : (int)$row['n_samples_group1'],
        'n_samples_group2' => $row['n_samples_group2'] === null ? null : (int)$row['n_samples_group2'],
        'method' => $row['method'],
        'scope' => $row['comparison_scope']
    ];
}

$conn->close();
gzipJson([
    'available' => count($peaks) > 0,
    'peaks' => $peaks,
    'message' => count($peaks) > 0 ? null : 'Differential accessible peak results have not been computed yet.'
]);
