<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$datasetId = $_GET['id'] ?? '';
$sample = resolveSample($conn, $datasetId, 0);

$datasets = [];
if ($sample) {
    $row = fetchOne(
        $conn,
        'SELECT s.*, p.species, p.technology, p.has_integrated_umap, COUNT(DISTINCT COALESCE(c.cluster_label2, c.cell_type)) AS clusters
         FROM sample s
         JOIN project p ON s.project_id = p.project_id
         LEFT JOIN cell c ON s.sample_id = c.sample_id
         WHERE s.sample_id = ? AND s.is_spatial = 0
         GROUP BY s.sample_id',
        'i',
        $sample['sample_id']
    );
    if ($row) {
        $information = normalizeDatasetInformation($row['metadata'], null, 'Single-nucleus RNA-seq', $row['technology']);
        $informationObj = datasetInformationObject($information);
        $datasets[] = [
            'dataset_id' => $row['sample_name'],
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
            'detail' => $information,
            'detail_obj' => $informationObj,
            'scorst' => 'sc',
            'information' => $information,
            'information_obj' => $informationObj
        ];
    }

}

$conn->close();
jsonOut($datasets);
