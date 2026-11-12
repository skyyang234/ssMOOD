<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$studyId = $_GET['id'] ?? '';
$resolved = resolveStudySamples($conn, $studyId);
$resultArray = [];

$sampleIds = $resolved['sample_ids'];
if ($sampleIds) {
    $ph = placeholders(count($sampleIds));
    $types = str_repeat('i', count($sampleIds));
    $rows = fetchAll($conn, "SELECT COALESCE(cluster_label2, cell_type, 'Unknown') AS cluster_label2, COUNT(*) AS cell_count FROM cell FORCE INDEX (idx_sample_id) WHERE sample_id IN ($ph) GROUP BY COALESCE(cluster_label2, cell_type, 'Unknown')", $types, ...$sampleIds);
    foreach ($rows as $row) {
        $resultArray[$row['cluster_label2']] = (int)$row['cell_count'];
    }
}

$conn->close();
jsonOut($resultArray);
