<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$rows = fetchAll($conn, 'SELECT category, COUNT(*) AS count FROM trait_meta GROUP BY category ORDER BY category');
$categories = [];
foreach ($rows as $row) {
    $categories[] = ['category' => $row['category'], 'count' => (int)$row['count']];
}
$conn->close();
jsonOut(['categories' => $categories]);
