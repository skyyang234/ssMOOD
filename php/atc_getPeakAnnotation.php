<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$peakId = $_GET['peak_id'] ?? '';
$peakName = $_GET['peak_name'] ?? '';
$peak = resolvePeakFeature($conn, $peakId, $peakName);

if (!$peak) {
    $conn->close();
    http_response_code(404);
    jsonOut(['error' => 'Peak not found']);
    exit;
}

$rows = fetchAll(
    $conn,
    'SELECT pga.feature_id, pga.gene_feature_id, gf.feature_name AS gene_name,
            pga.distance_to_tss, pga.annotation_type, pga.score, pga.source
     FROM peak_gene_annotation pga
     JOIN feature gf ON pga.gene_feature_id = gf.feature_id
     WHERE pga.feature_id = ?
     ORDER BY ABS(pga.distance_to_tss), pga.score DESC',
    'i',
    (int)$peak['feature_id']
);

$annotations = [];
foreach ($rows as $row) {
    $annotations[] = [
        'gene_feature_id' => (int)$row['gene_feature_id'],
        'gene' => $row['gene_name'],
        'distance' => $row['distance_to_tss'] === null ? null : (int)$row['distance_to_tss'],
        'type' => $row['annotation_type'],
        'score' => $row['score'] === null ? null : (float)$row['score'],
        'source' => $row['source']
    ];
}

$conn->close();
jsonOut([
    'peak_id' => (int)$peak['feature_id'],
    'peak_name' => $peak['feature_name'],
    'annotations' => $annotations
]);
