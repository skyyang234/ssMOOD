<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$row = fetchOne($conn, 'SELECT n_sc_cells, n_st_cells FROM dashboard_summary WHERE id = 1');

if ($row) {
    $resultArray = [
        'sc_cells_sum' => (int)$row['n_sc_cells'],
        'st_cells_sum' => (int)$row['n_st_cells']
    ];
} else {
    $row = fetchOne($conn, 'SELECT SUM(CASE WHEN is_spatial = 0 THEN n_cells ELSE 0 END) AS sc_cells_sum, SUM(CASE WHEN is_spatial = 1 THEN n_cells ELSE 0 END) AS st_cells_sum FROM sample');
    $resultArray = [
        'sc_cells_sum' => (int)($row['sc_cells_sum'] ?? 0),
        'st_cells_sum' => (int)($row['st_cells_sum'] ?? 0)
    ];
}

$conn->close();
jsonOut($resultArray);
