<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$rows = fetchAll(
    $conn,
    'SELECT s.sample_id, s.sample_name, s.`condition`, s.tissue, s.sex, s.age, s.n_cells, s.metadata,
            p.species, p.technology
     FROM sample s
     JOIN project p ON s.project_id = p.project_id
     WHERE s.project_id = 14
     ORDER BY s.sample_id'
);

$datasets = [];
foreach ($rows as $row) {
    $datasets[] = [
        'id' => (int)$row['sample_id'],
        'name' => $row['sample_name'],
        'condition' => $row['condition'],
        'tissue' => $row['tissue'],
        'sex' => $row['sex'],
        'age' => $row['age'],
        'cells' => (int)$row['n_cells'],
        'species' => $row['species'],
        'technology' => $row['technology'],
        'metadata' => $row['metadata']
    ];
}

$conn->close();
jsonOut(['datasets' => $datasets]);
