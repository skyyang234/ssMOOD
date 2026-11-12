<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$datasetId = $_GET['id'] ?? '';
$sample = resolveAtacSample($conn, $datasetId);
$result = [];

if ($sample) {
    $rows = fetchAll(
        $conn,
        'SELECT COALESCE(cluster_label2, cell_type, "Unknown") AS cluster_label2, COUNT(*) AS cell_count
         FROM cell FORCE INDEX (idx_sample_id)
         WHERE sample_id = ?
         GROUP BY COALESCE(cluster_label2, cell_type, "Unknown")',
        'i',
        (int)$sample['sample_id']
    );
    foreach ($rows as $row) {
        $result[$row['cluster_label2']] = (int)$row['cell_count'];
    }
}

$conn->close();
jsonOut($result);
