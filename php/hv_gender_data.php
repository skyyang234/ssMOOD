<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$rows = fetchAll($conn, 'SELECT p.species, COUNT(*) AS count FROM sample s JOIN project p ON s.project_id = p.project_id WHERE p.species IN ("mouse", "human") GROUP BY p.species');

$resultArray = [
    'mouse' => 0,
    'human' => 0
];

foreach ($rows as $row) {
    $resultArray[$row['species']] = (int)$row['count'];
}

$conn->close();
jsonOut($resultArray);
