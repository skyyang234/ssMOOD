<?php
ini_set('memory_limit', '512M');
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$datasetId = $_GET['id'] ?? '';
$sample = resolveAtacSample($conn, $datasetId);

if (!$sample) {
    $conn->close();
    http_response_code(404);
    jsonOut(['error' => 'ATAC sample not found']);
    exit;
}

$rows = fetchAll(
    $conn,
    'SELECT cell_id, legacy_cell_id, umap_x, umap_y, cell_type, cluster_label2
     FROM cell FORCE INDEX (idx_sample_id)
     WHERE sample_id = ?
     ORDER BY cell_index',
    'i',
    (int)$sample['sample_id']
);

$umapData = [];
$clusterLabels = [];
foreach ($rows as $row) {
    $label = clusterLabel($row);
    $umapData[] = [
        'i' => $row['legacy_cell_id'] ?: $row['cell_id'],
        'u1' => $row['umap_x'],
        'u2' => $row['umap_y'],
        'c' => $label
    ];
    $clusterLabels[$label] = true;
}

$conn->close();
gzipJson(['umap_data' => $umapData, 'cluster_labels' => array_values(array_keys($clusterLabels))]);
