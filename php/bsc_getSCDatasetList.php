<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$rows = fetchAll(
    $conn,
    'SELECT s.sample_id, s.sample_name AS dataset_id, p.species, s.age, s.sex, s.`condition` AS conditions, s.tissue AS area, s.n_cells AS cells, p.technology AS way, "sc" AS scorst,
            "single" AS sample_scope, 0 AS is_integrated, p.has_integrated_umap
     FROM sample s JOIN project p ON s.project_id = p.project_id
     WHERE s.is_spatial = 0 AND s.project_id IN (1, 2)
     ORDER BY s.project_id, s.sample_id'
);
$conn->close();
jsonOut($rows);
