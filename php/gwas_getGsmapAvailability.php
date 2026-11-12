<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$datasetId = $_GET['id'] ?? ($_GET['dataset_id'] ?? '');

if ($datasetId !== '') {
    $sample = resolveSample($conn, $datasetId, 1);
    if (!$sample) {
        $conn->close();
        http_response_code(404);
        jsonOut(['error' => 'Spatial sample not found']);
        exit;
    }
    $rows = fetchAll(
        $conn,
        'SELECT sample_id, sample_name AS dataset_id, `condition` AS conditions, tissue AS area
         FROM sample
         WHERE sample_id = ? AND is_spatial = 1',
        'i',
        (int)$sample['sample_id']
    );
} else {
    // 遍历所有空间样本（sample_id 144-201），不再硬编码 ST0051/ST0055
    $rows = fetchAll(
        $conn,
        'SELECT s.sample_id, s.sample_name AS dataset_id, s.`condition` AS conditions, s.tissue AS area
         FROM sample s
         WHERE s.is_spatial = 1
         ORDER BY s.sample_id'
    );
}

$datasets = [];
foreach ($rows as $row) {
    $sid = (int)$row['sample_id'];
    $summary = gsmapSummaryForSampleId($conn, $sid);
    if (!$summary['has_gsmap_spatial'] && !$summary['has_gsmap_cauchy']) {
        continue;
    }
    $datasets[] = [
        'sample_id'          => $sid,
        'dataset_id'         => $row['dataset_id'],
        'conditions'         => $row['conditions'],
        'area'               => $row['area'],
        'has_gsmap_spatial'  => $summary['has_gsmap_spatial'],
        'has_gsmap_cauchy'   => $summary['has_gsmap_cauchy'],
        'spatial_rows'       => $summary['gsmap_spatial_rows'],
        'spatial_traits'     => $summary['gsmap_spatial_traits'],
        'spatial_spots'      => $summary['gsmap_spatial_spots'],
        'cauchy_rows'        => $summary['gsmap_cauchy_rows'],
        'cauchy_traits'      => $summary['gsmap_cauchy_traits'],
        'cauchy_annotations' => $summary['gsmap_cauchy_annotations']
    ];
}

$conn->close();
jsonOut(['datasets' => $datasets]);
