<?php
ini_set('memory_limit', '2048M');
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$studyId = $_GET['id'] ?? '';
$resolved = resolveStudySamples($conn, $studyId);
$sampleIds = $resolved['sample_ids'];

$coordinate_data = [];
$cluster_labels = [];
if ($sampleIds) {
    $ph = placeholders(count($sampleIds));
    $types = str_repeat('i', count($sampleIds));
    $rows = fetchAll($conn, "SELECT s.sample_name, c.sample_id, c.cell_id, c.legacy_cell_id, c.spatial_x, c.spatial_y, c.cell_type, c.cluster_label2 FROM cell c FORCE INDEX (idx_sample_id) JOIN sample s ON c.sample_id = s.sample_id WHERE c.sample_id IN ($ph) AND c.is_spatial = 1 ORDER BY c.sample_id, c.cell_index", $types, ...$sampleIds);
    // 兜底：个别样本的 cell.is_spatial 标志未置 1，但空间坐标存在；取不到行时放宽 cell 级过滤。
    if (!$rows) {
        $rows = fetchAll($conn, "SELECT s.sample_name, c.sample_id, c.cell_id, c.legacy_cell_id, c.spatial_x, c.spatial_y, c.cell_type, c.cluster_label2 FROM cell c FORCE INDEX (idx_sample_id) JOIN sample s ON c.sample_id = s.sample_id WHERE c.sample_id IN ($ph) AND c.spatial_x IS NOT NULL AND c.spatial_y IS NOT NULL ORDER BY c.sample_id, c.cell_index", $types, ...$sampleIds);
    }
    foreach ($rows as $row) {
        $label = clusterLabel($row);
        $sampleName = $row['sample_name'];
        if (!isset($coordinate_data[$sampleName])) {
            $coordinate_data[$sampleName] = [];
        }
        $coordinate_data[$sampleName][] = [
            'i' => $row['legacy_cell_id'] ?: $row['cell_id'],
            'sample_id' => (int)$row['sample_id'],
            'x' => $row['spatial_x'],
            'y' => $row['spatial_y'],
            'c' => $label
        ];
        $cluster_labels[$label] = true;
    }
}

$conn->close();
gzipJson([
    'coordinate_data' => $coordinate_data,
    'cluster_labels' => array_values(array_keys($cluster_labels)),
    'sample_scope' => 'integrated',
    'sampleScope' => 'integrated',
    'is_integrated' => true,
    'isIntegrated' => true,
    'missing' => $resolved['missing']
]);
