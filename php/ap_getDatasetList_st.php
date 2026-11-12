<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$rows = fetchAll(
    $conn,
    'SELECT s.sample_id, s.sample_name
     FROM sample s
     WHERE s.is_spatial = 1 AND s.project_id IN (3, 4)
     ORDER BY s.project_id, s.sample_id'
);

$spatialIds = [];
$spatial = fetchAll($conn, 'SELECT sample_id FROM sample WHERE sample_name = "ST0055_C_BA46" AND is_spatial = 1 LIMIT 1');
foreach ($spatial as $sr) {
    $spatialIds[(int)$sr['sample_id']] = true;
}
$cauchyIds = [];
$cauchy = fetchAll($conn, 'SELECT sample_id FROM sample WHERE sample_name IN ("ST0051_C_BA12", "ST0055_C_BA46") AND is_spatial = 1');
foreach ($cauchy as $cr) {
    $cauchyIds[(int)$cr['sample_id']] = true;
}
$datasets = [];
$i = 0;
foreach ($rows as $row) {
    $sid = (int)$row['sample_id'];
    $datasets[] = [
        'id' => $i++,
        'sample_id' => $sid,
        'name' => $row['sample_name'],
        'sample_scope' => 'single',
        'is_integrated' => false,
        'has_gsmap_spatial' => isset($spatialIds[$sid]),
        'has_gsmap_cauchy' => isset($cauchyIds[$sid])
    ];
}
$conn->close();
jsonOut(['datasets' => $datasets]);
