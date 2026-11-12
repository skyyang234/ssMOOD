<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$datasetId = $_GET['id'] ?? ($_GET['dataset_id'] ?? '');
$traitId = $_GET['trait_id'] ?? '';
$limit = (int)($_GET['limit'] ?? 0);

if ($datasetId === '') {
    $conn->close();
    http_response_code(400);
    jsonOut(['error' => 'Invalid parameters']);
    exit;
}

$sample = resolveSample($conn, $datasetId, 1);
if (!$sample) {
    $conn->close();
    http_response_code(404);
    jsonOut(['error' => 'Spatial sample not found']);
    exit;
}

$where = 'gc.sample_id = ?';
$types = 'i';
$params = [(int)$sample['sample_id']];
if ($traitId !== '') {
    if (!is_numeric($traitId)) {
        $conn->close();
        http_response_code(400);
        jsonOut(['error' => 'Invalid trait_id']);
        exit;
    }
    $where .= ' AND gc.trait_id = ?';
    $types .= 'i';
    $params[] = (int)$traitId;
}

$limitSql = $limit > 0 ? ' LIMIT ' . min($limit, 10000) : '';
$rows = fetchAll(
    $conn,
    "SELECT gc.id, gc.sample_id, gc.trait_id, gc.annotation, gc.p_cauchy, gc.p_median,
            tm.abbreviation, tm.full_name, tm.chinese_name, tm.category
     FROM gsmap_cauchy_score gc
     LEFT JOIN trait_meta tm ON tm.trait_id = gc.trait_id
     WHERE $where
     ORDER BY gc.p_cauchy ASC, gc.p_median ASC, gc.annotation" . $limitSql,
    $types,
    ...$params
);

$results = [];
foreach ($rows as $row) {
    $results[] = [
        'id' => (int)$row['id'],
        'sample_id' => (int)$row['sample_id'],
        'dataset_id' => $sample['sample_name'],
        'trait_id' => (int)$row['trait_id'],
        'trait_abbr' => $row['abbreviation'],
        'trait_name' => $row['chinese_name'] ?: $row['full_name'],
        'trait_full_name' => $row['full_name'],
        'category' => $row['category'],
        'annotation' => $row['annotation'],
        'p_cauchy' => $row['p_cauchy'] === null ? null : (float)$row['p_cauchy'],
        'p_median' => $row['p_median'] === null ? null : (float)$row['p_median']
    ];
}

$conn->close();
jsonOut([
    'sample_id' => (int)$sample['sample_id'],
    'dataset_id' => $sample['sample_name'],
    'trait_id' => $traitId === '' ? null : (int)$traitId,
    'results' => $results
]);
