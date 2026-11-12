<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$datasetId = $_GET['id'] ?? '';
$sample = resolveSample($conn, $datasetId, null);

$cluster_labels = [];
if ($sample) {
    $projectId = (int)$sample['project_id'];
    if ($projectId === 1) {
        $rows = fetchAll(
            $conn,
            'SELECT DISTINCT cell_type
             FROM deg_binary
             WHERE project_id = 1 AND deg_category = "marker" AND cell_type IS NOT NULL AND cell_type <> ""
             ORDER BY cell_type
             LIMIT 1000'
        );
    } else {
        $rows = fetchAll(
            $conn,
            'SELECT DISTINCT COALESCE(cell_type, cluster_label2) AS cell_type
             FROM cell FORCE INDEX (idx_sample_id)
             WHERE sample_id = ? AND COALESCE(cell_type, cluster_label2) IS NOT NULL
             ORDER BY cell_type
             LIMIT 1000',
            'i',
            (int)$sample['sample_id']
        );
    }
    foreach ($rows as $row) {
        if ($row['cell_type'] !== null && $row['cell_type'] !== '') {
            $cluster_labels[] = $row['cell_type'];
        }
    }
}

$conn->close();
jsonOut($cluster_labels);
