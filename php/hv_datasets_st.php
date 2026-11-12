<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$rows = fetchAll($conn, 'SELECT sample_name, n_cells FROM sample WHERE is_spatial = 1 AND project_id IN (3, 4) ORDER BY project_id, sample_id');
$data = [];
foreach ($rows as $row) {
    $data[$row['sample_name']] = (int)$row['n_cells'];
}
$conn->close();
jsonOut($data);
