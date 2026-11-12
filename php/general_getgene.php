<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$datasetId = $_GET['id'] ?? '';
$projectId = null;

if (strpos($datasetId, 'study') !== false) {
    $resolved = resolveStudySamples($conn, $datasetId);
    if (!empty($resolved['sample_ids'])) {
        $sample = resolveSample($conn, $resolved['sample_ids'][0], null);
        $projectId = $sample ? (int)$sample['project_id'] : null;
    }
} else {
    $sample = resolveSample($conn, $datasetId, null);
    $projectId = $sample ? (int)$sample['project_id'] : null;
}

$genes = [];
if ($projectId !== null) {
    $rows = fetchAll($conn, 'SELECT feature_name FROM feature WHERE project_id = ? AND feature_type = "gene" ORDER BY feature_name', 'i', $projectId);
    foreach ($rows as $row) {
        $genes[] = $row['feature_name'];
    }
}

$conn->close();
gzipJson(['genes' => $genes]);
