<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$datasetId = $_GET['id'] ?? '';
$sample = resolveSample($conn, $datasetId, 1);

$datasets = [];
if ($sample) {
    $row = fetchOne(
        $conn,
        'SELECT s.*, p.species, p.technology, p.has_integrated_umap, COUNT(DISTINCT COALESCE(c.cluster_label2, c.cell_type)) AS clusters
         FROM sample s
         JOIN project p ON s.project_id = p.project_id
         LEFT JOIN cell c ON s.sample_id = c.sample_id
         WHERE s.sample_id = ? AND s.is_spatial = 1
         GROUP BY s.sample_id',
        'i',
        $sample['sample_id']
    );

    $gsmapSummary = gsmapSummaryForSampleId($conn, (int)$row['sample_id']);
    $sex_abbr = strtolower($row['sex']) === 'female' ? 'F' : (strtolower($row['sex']) === 'male' ? 'M' : strtoupper(substr($row['sex'] ?? 'U', 0, 1)));
    $tissue = $row['tissue'] ?? 'NA';
    $condition = $row['condition'] ?? 'NA';
    $repPos = fetchOne(
        $conn,
        'SELECT COUNT(*) AS pos FROM sample WHERE project_id = ? AND tissue = ? AND sex = ? AND `condition` = ? AND is_spatial = 1 AND sample_id <= ?',
        'isssi',
        (int)$row['project_id'], $row['tissue'], $row['sex'], $row['condition'], (int)$row['sample_id']
    );
    $display_name = "{$sex_abbr}_{$tissue}_{$condition}_rep" . ((int)($repPos['pos'] ?? 1));
    if ($row) {
        $information = normalizeDatasetInformation($row['metadata'], null, 'stereo-seq', $row['technology']);
        $informationObj = datasetInformationObject($information);
        $datasets[] = [
            'dataset_id' => $row['sample_name'],
            'display_name' => $display_name,
            'species' => $row['species'],
            'age' => $row['age'],
            'sex' => $row['sex'],
            'conditions' => $row['condition'],
            'area' => $row['tissue'],
            'cells' => $row['n_cells'],
            'clusters' => $row['clusters'],
            'sample_id' => (int)$row['sample_id'],
            'sample_scope' => 'single',
            'is_integrated' => false,
            'has_integrated_umap' => (bool)$row['has_integrated_umap'],
            'has_gsmap_spatial' => $gsmapSummary['has_gsmap_spatial'],
            'has_gsmap_cauchy' => $gsmapSummary['has_gsmap_cauchy'],
            'gsmap_spatial_rows' => $gsmapSummary['gsmap_spatial_rows'],
            'gsmap_spatial_traits' => $gsmapSummary['gsmap_spatial_traits'],
            'gsmap_spatial_spots' => $gsmapSummary['gsmap_spatial_spots'],
            'gsmap_cauchy_rows' => $gsmapSummary['gsmap_cauchy_rows'],
            'gsmap_cauchy_traits' => $gsmapSummary['gsmap_cauchy_traits'],
            'gsmap_cauchy_annotations' => $gsmapSummary['gsmap_cauchy_annotations'],
            'detail' => $information,
            'detail_obj' => $informationObj,
            'scorst' => 'st',
            'information' => $information,
            'information_obj' => $informationObj
        ];
    }

}

$conn->close();
jsonOut($datasets);
