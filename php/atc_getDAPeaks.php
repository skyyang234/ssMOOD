<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$exists = fetchOne($conn, 'SHOW TABLES LIKE "differential_peak_result"');
if (!$exists) {
    $conn->close();
    gzipJson([
        'available' => false,
        'total' => 0,
        'limit' => min(max((int)($_GET['limit'] ?? 100), 1), 5000),
        'offset' => max((int)($_GET['offset'] ?? 0), 0),
        'peaks' => [],
        'message' => 'Differential accessible peak results have not been computed yet.'
    ]);
    exit;
}

$contrast = trim($_GET['contrast'] ?? '');
$cellType = trim($_GET['cell_type'] ?? ($_GET['cluster'] ?? ''));
$direction = trim($_GET['direction'] ?? 'all');
$padjLt = isset($_GET['padj_lt']) ? (float)$_GET['padj_lt'] : null;
$log2fcAbsGt = isset($_GET['log2fc_abs_gt']) ? (float)$_GET['log2fc_abs_gt'] : null;
$limit = min(max((int)($_GET['limit'] ?? 100), 1), 5000);
$offset = max((int)($_GET['offset'] ?? 0), 0);
$sort = $_GET['sort'] ?? 'padj';

$where = ['d.project_id = 14'];
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
if ($padjLt !== null) {
    $where[] = 'd.padj IS NOT NULL AND d.padj <= ?';
    $types .= 'd';
    $params[] = $padjLt;
}
if ($log2fcAbsGt !== null) {
    $where[] = 'ABS(d.log2fc) >= ?';
    $types .= 'd';
    $params[] = $log2fcAbsGt;
}
if ($direction === 'up') {
    $where[] = 'd.log2fc > 0';
} elseif ($direction === 'down') {
    $where[] = 'd.log2fc < 0';
}

$orderBy = $sort === 'log2fc' ? 'ABS(d.log2fc) DESC, d.padj ASC' : 'd.padj ASC, ABS(d.log2fc) DESC';

$countRow = fetchOne(
    $conn,
    'SELECT COUNT(*) AS total
     FROM differential_peak_result d
     JOIN feature f ON d.feature_id = f.feature_id
     WHERE f.feature_type = "peak" AND ' . implode(' AND ', $where),
    $types,
    ...$params
);

$queryTypes = $types . 'ii';
$queryParams = array_merge($params, [$limit, $offset]);
$rows = fetchAll(
    $conn,
    'SELECT d.feature_id, f.feature_name, f.chrom, f.peak_start, f.peak_end,
            d.contrast, d.cell_type, d.log2fc, d.pvalue, d.padj,
            d.avg_acc_group1, d.avg_acc_group2, d.pct_group1, d.pct_group2,
            d.n_group1, d.n_group2, d.n_samples_group1, d.n_samples_group2,
            d.method, d.comparison_scope, d.created_at
     FROM differential_peak_result d
     JOIN feature f ON d.feature_id = f.feature_id
     WHERE f.feature_type = "peak" AND ' . implode(' AND ', $where) . '
     ORDER BY ' . $orderBy . '
     LIMIT ? OFFSET ?',
    $queryTypes,
    ...$queryParams
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
        'n_group1' => $row['n_group1'] === null ? null : (int)$row['n_group1'],
        'n_group2' => $row['n_group2'] === null ? null : (int)$row['n_group2'],
        'n_samples_group1' => $row['n_samples_group1'] === null ? null : (int)$row['n_samples_group1'],
        'n_samples_group2' => $row['n_samples_group2'] === null ? null : (int)$row['n_samples_group2'],
        'method' => $row['method'],
        'scope' => $row['comparison_scope'],
        'created_at' => $row['created_at']
    ];
}

$conn->close();
gzipJson([
    'available' => count($peaks) > 0,
    'total' => (int)($countRow['total'] ?? 0),
    'limit' => $limit,
    'offset' => $offset,
    'peaks' => $peaks,
    'message' => count($peaks) > 0 ? null : 'Differential accessible peak results have not been computed yet or no peaks match filters.'
]);
