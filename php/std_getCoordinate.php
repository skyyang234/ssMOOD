<?php
ini_set('memory_limit', '512M');
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$datasetId = $_GET['id'] ?? '';
$sample = resolveSample($conn, $datasetId, 1);

if (!$sample) {
    $conn->close();
    http_response_code(404);
    jsonOut(['error' => 'Sample not found']);
    exit;
}

$rows = fetchAll(
    $conn,
    'SELECT cell_id, legacy_cell_id, spatial_x, spatial_y, cell_type, cluster_label2
     FROM cell
     WHERE sample_id = ? AND is_spatial = 1
     ORDER BY cell_index',
    'i',
    $sample['sample_id']
);
// 兜底：个别空转样本的 cell.is_spatial 标志未置 1（数据导入遗漏），但坐标其实存在。
// 严格查询取不到任何行时放宽 cell 级过滤，仍要求空间坐标非空，避免把非空间细胞也算进来。
if (!$rows) {
    $rows = fetchAll(
        $conn,
        'SELECT cell_id, legacy_cell_id, spatial_x, spatial_y, cell_type, cluster_label2
         FROM cell
         WHERE sample_id = ? AND spatial_x IS NOT NULL AND spatial_y IS NOT NULL
         ORDER BY cell_index',
        'i',
        $sample['sample_id']
    );
}

$coordinate_data = [];
$cluster_labels = [];
foreach ($rows as $row) {
    $label = clusterLabel($row);
    $coordinate_data[] = [
        'i' => $row['legacy_cell_id'] ?: $row['cell_id'],
        'x' => $row['spatial_x'],
        'y' => $row['spatial_y'],
        'c' => $label
    ];
    $cluster_labels[$label] = true;
}

$conn->close();
gzipJson(['coordinate_data' => $coordinate_data, 'cluster_labels' => array_values(array_keys($cluster_labels))]);
