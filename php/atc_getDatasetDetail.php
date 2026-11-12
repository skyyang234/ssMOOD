<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$datasetId = $_GET['id'] ?? '';
$sample = resolveAtacSample($conn, $datasetId);

$datasets = [];
if ($sample) {
    $row = fetchOne(
        $conn,
        'SELECT s.*, p.name AS project, p.description AS project_description,
                p.has_integrated_umap, p.species, p.technology,
                COUNT(DISTINCT COALESCE(c.cluster_label2, c.cell_type)) AS clusters
         FROM sample s
         JOIN project p ON s.project_id = p.project_id
         LEFT JOIN cell c ON s.sample_id = c.sample_id
         WHERE s.sample_id = ? AND s.project_id = 14
         GROUP BY s.sample_id',
        'i',
        (int)$sample['sample_id']
    );
    if ($row) {
        $information = normalizeDatasetInformation($row['metadata'], null, 'snATAC-seq', $row['technology']);
        $informationObj = datasetInformationObject($information);
        $metadata = json_decode($row['metadata'] ?? '', true);
        if (!is_array($metadata)) {
            $metadata = [];
        }
        $datasets[] = [
            'dataset_id' => $row['sample_name'],
            'sample_id' => (int)$row['sample_id'],
            'project' => $row['project'],
            'project_id' => (int)$row['project_id'],
            'project_description' => $row['project_description'],
            'has_integrated_umap' => (bool)$row['has_integrated_umap'],
            'original_sample_id' => $metadata['original_sample_id'] ?? null,
            'sample_description' => $metadata['description'] ?? null,
            'species' => $row['species'],
            'technology' => $row['technology'],
            'age' => $row['age'],
            'sex' => $row['sex'],
            'conditions' => $row['condition'],
            'area' => $row['tissue'],
            'cells' => (int)$row['n_cells'],
            'clusters' => (int)$row['clusters'],
            'detail' => $information,
            'detail_obj' => $informationObj,
            'scorst' => 'atac',
            'information' => $information,
            'information_obj' => $informationObj
        ];
    }
}

$conn->close();
jsonOut($datasets);
