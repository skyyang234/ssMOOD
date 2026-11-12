<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$exists = fetchOne($conn, 'SHOW TABLES LIKE "differential_peak_result"');
if (!$exists) {
    $conn->close();
    jsonOut([
        'available' => false,
        'contrasts' => [],
        'message' => 'Differential accessible peak results have not been computed yet.'
    ]);
    exit;
}

$cellType = trim($_GET['cell_type'] ?? ($_GET['cluster'] ?? ''));

$where = ['project_id = 14'];
$types = '';
$params = [];
if ($cellType !== '') {
    $where[] = 'cell_type = ?';
    $types .= 's';
    $params[] = $cellType;
}

$rows = fetchAll(
    $conn,
    'SELECT contrast, cell_type, method, comparison_scope,
            COUNT(*) AS n_peaks,
            SUM(CASE WHEN padj IS NOT NULL AND padj < 0.05 AND log2fc > 0 THEN 1 ELSE 0 END) AS up,
            SUM(CASE WHEN padj IS NOT NULL AND padj < 0.05 AND log2fc < 0 THEN 1 ELSE 0 END) AS down,
            MIN(created_at) AS created_at
     FROM differential_peak_result
     WHERE ' . implode(' AND ', $where) . '
     GROUP BY contrast, cell_type, method, comparison_scope
     ORDER BY contrast, cell_type',
    $types,
    ...$params
);

$contrasts = [];
foreach ($rows as $row) {
    $contrasts[] = [
        'contrast' => $row['contrast'],
        'cell_type' => $row['cell_type'],
        'method' => $row['method'],
        'scope' => $row['comparison_scope'],
        'n_peaks' => (int)$row['n_peaks'],
        'up' => (int)$row['up'],
        'down' => (int)$row['down'],
        'created_at' => $row['created_at']
    ];
}

$conn->close();
jsonOut([
    'available' => count($contrasts) > 0,
    'contrasts' => $contrasts,
    'message' => count($contrasts) > 0 ? null : 'Differential accessible peak results have not been computed yet.'
]);
