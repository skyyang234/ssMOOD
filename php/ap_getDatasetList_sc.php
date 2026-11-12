<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$rows = fetchAll($conn, 'SELECT sample_id, sample_name FROM sample WHERE is_spatial = 0 AND project_id IN (1, 2) ORDER BY project_id, sample_id');
$datasets = [];
$i = 0;
foreach ($rows as $row) {
    $datasets[] = ['id' => $i++, 'sample_id' => (int)$row['sample_id'], 'name' => $row['sample_name'], 'sample_scope' => 'single', 'is_integrated' => false];
}
$conn->close();
jsonOut(['datasets' => $datasets]);
