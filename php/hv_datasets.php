<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$groups = [
    ['species' => 'mouse', 'is_spatial' => 0],
    ['species' => 'mouse', 'is_spatial' => 1],
    ['species' => 'human', 'is_spatial' => 0],
    ['species' => 'human', 'is_spatial' => 1],
];

$results = [];
foreach ($groups as $group) {
    $rows = fetchAll(
        $conn,
        'SELECT s.sample_name, s.n_cells FROM sample s JOIN project p ON s.project_id = p.project_id WHERE p.species = ? AND s.is_spatial = ? ORDER BY s.project_id, s.sample_id',
        'si',
        $group['species'],
        $group['is_spatial']
    );
    $data = [];
    foreach ($rows as $row) {
        $data[$row['sample_name']] = (int)$row['n_cells'];
    }
    $results[] = $data;
}

$conn->close();
gzipJson($results);
