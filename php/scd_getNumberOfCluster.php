<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$datasetId = $_GET['id'] ?? '';
$sample = resolveSample($conn, $datasetId, 0);
$resultArray = [];

if ($sample) {
    $rows = fetchAll(
        $conn,
        'SELECT COALESCE(cluster_label2, cell_type, "Unknown") AS cluster_label2, COUNT(*) AS cell_count
         FROM cell
         WHERE sample_id = ? AND is_spatial = 0
         GROUP BY COALESCE(cluster_label2, cell_type, "Unknown")',
        'i',
        $sample['sample_id']
    );
    foreach ($rows as $row) {
        $resultArray[$row['cluster_label2']] = (int)$row['cell_count'];
    }
}

$conn->close();
jsonOut($resultArray);
