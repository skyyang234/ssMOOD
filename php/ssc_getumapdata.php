<?php
ini_set('memory_limit', '1024M');
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$studyId = $_GET['id'] ?? '';
$resolved = resolveStudySamples($conn, $studyId);
$sampleIds = $resolved['sample_ids'];

$umap_data = [];
$cluster_labels = [];
if ($sampleIds) {
    $ph = placeholders(count($sampleIds));
    $types = str_repeat('i', count($sampleIds));
    $rows = fetchAll($conn, "SELECT sample_id, cell_id, legacy_cell_id, umap_x, umap_y, cell_type, cluster_label2 FROM cell FORCE INDEX (idx_sample_id) WHERE sample_id IN ($ph) AND is_spatial = 0 ORDER BY sample_id, cell_index", $types, ...$sampleIds);
    foreach ($rows as $row) {
        $label = clusterLabel($row);
        $umap_data[] = [
            'i' => $row['legacy_cell_id'] ?: $row['cell_id'],
            'sample_id' => (int)$row['sample_id'],
            'u1' => $row['umap_x'],
            'u2' => $row['umap_y'],
            'c' => $label
        ];
        $cluster_labels[$label] = true;
    }
}

$conn->close();
gzipJson([
    'umap_data' => $umap_data,
    'cluster_labels' => array_values(array_keys($cluster_labels)),
    'sample_scope' => 'integrated',
    'sampleScope' => 'integrated',
    'is_integrated' => true,
    'isIntegrated' => true,
    'missing' => $resolved['missing']
]);
