<?php
ini_set('memory_limit', '512M');
require_once __DIR__ . '/helpers.php';

$conn = getDb();

$samples = [
    ['id' => 141, 'is_spatial' => 0],
    ['id' => 192, 'is_spatial' => 1],
    ['id' => 1, 'is_spatial' => 0],
    ['id' => 197, 'is_spatial' => 1],
];

$umap_datasets = [];
foreach ($samples as $index => $sample) {
    $rows = fetchAll(
        $conn,
        'SELECT cell_id, legacy_cell_id, umap_x, umap_y, spatial_x, spatial_y, cell_type, cluster_label2
         FROM cell
         WHERE sample_id = ? AND is_spatial = ?
         ORDER BY cell_index',
        'ii',
        $sample['id'],
        $sample['is_spatial']
    );

    $umap_data = [];
    $cluster_labels = [];
    foreach ($rows as $row) {
        $label = clusterLabel($row);
        $umap_data[] = [
            'i' => $row['legacy_cell_id'] ?: $row['cell_id'],
            'u1' => $sample['is_spatial'] ? $row['spatial_x'] : $row['umap_x'],
            'u2' => $sample['is_spatial'] ? $row['spatial_y'] : $row['umap_y'],
            'c' => $label
        ];
        $cluster_labels[$label] = true;
    }

    $umap_datasets[$index] = [
        'umap' => $umap_data,
        'cluster' => array_values(array_keys($cluster_labels))
    ];
}

$conn->close();
gzipJson($umap_datasets);
