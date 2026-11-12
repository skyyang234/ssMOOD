<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$traitId = $_GET['trait_id'] ?? '';
$sex = $_GET['sex'] ?? '';

if ($traitId !== '' && is_numeric($traitId) && in_array($sex, ['male', 'female'], true)) {
    $rows = fetchAll($conn, 'SELECT DISTINCT dimension FROM scdrs_enrichment WHERE trait_id = ? AND sex = ? ORDER BY dimension', 'is', (int)$traitId, $sex);
} else {
    $rows = fetchAll($conn, 'SELECT DISTINCT dimension FROM scdrs_enrichment ORDER BY dimension');
}

$dimensions = [];
foreach ($rows as $row) {
    $dimensions[] = $row['dimension'];
}
$conn->close();
jsonOut(['dimensions' => $dimensions]);
