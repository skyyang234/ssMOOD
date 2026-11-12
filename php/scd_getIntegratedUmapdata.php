<?php
ini_set('memory_limit', '1024M');
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$datasetId = $_GET['id'] ?? '';
$sample = resolveSample($conn, $datasetId, 0);

if (!$sample) {
    $conn->close();
    http_response_code(404);
    jsonOut(['error' => 'Sample not found']);
    exit;
}

$rows = fetchAll(
    $conn,
    'SELECT cell_id, legacy_cell_id, umap_x, umap_y, cell_type, cluster_label2
     FROM cell
     WHERE sample_id = ? AND is_spatial = 0 AND umap_x IS NOT NULL AND umap_y IS NOT NULL
     ORDER BY cell_index',
    'i',
    $sample['sample_id']
);

$umap_data = [];
$cluster_labels = [];
foreach ($rows as $row) {
    $label = clusterLabel($row);
    $umap_data[] = [
        'i' => $row['legacy_cell_id'] ?: $row['cell_id'],
        'sample_id' => (int)$sample['sample_id'],
        'u1' => $row['umap_x'],
        'u2' => $row['umap_y'],
        'c' => $label
    ];
    $cluster_labels[$label] = true;
}

$conn->close();
gzipJson(['umap_data' => $umap_data, 'cluster_labels' => array_values(array_keys($cluster_labels)), 'sample_scope' => 'integrated', 'is_integrated' => true]);
