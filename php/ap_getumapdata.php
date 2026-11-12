<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$datasetId = $_GET['id'] ?? '';
$sample = resolveSample($conn, $datasetId, null);

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
     WHERE sample_id = ?
     ORDER BY cell_index',
    'i',
    $sample['sample_id']
);

$umap_data = [];
foreach ($rows as $row) {
    $umap_data[] = [
        'i' => $row['legacy_cell_id'] ?: $row['cell_id'],
        'u1' => $row['umap_x'],
        'u2' => $row['umap_y'],
        'c' => clusterLabel($row)
    ];
}

$conn->close();
gzipJson($umap_data);
