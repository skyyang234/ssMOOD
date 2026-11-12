<?php
ini_set('memory_limit', '2048M');
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$traitId = $_GET['trait_id'] ?? '';
$sex = $_GET['sex'] ?? 'male';
$datasetId = $_GET['id'] ?? ($_GET['dataset_id'] ?? '');
$omics = strtolower($_GET['omics'] ?? $_GET['type'] ?? 'sc');
$expectedSpatial = in_array($omics, ['st', 'spatial', 'spatialtranscriptome'], true) ? 1 : 0;
$limit = (int)($_GET['limit'] ?? 0);

if ($traitId === '' || !is_numeric($traitId) || !in_array($sex, ['male', 'female'], true)) {
    $conn->close();
    http_response_code(400);
    jsonOut(['error' => 'Invalid parameters']);
    exit;
}

function addScdrsCellIdVariants(&$set, $id) {
    $id = trim((string)$id);
    if ($id === '') {
        return;
    }
    $set[$id] = true;

    $withoutSexSuffix = preg_replace('/-(male|female)$/', '', $id);
    if ($withoutSexSuffix !== null && $withoutSexSuffix !== $id && $withoutSexSuffix !== '') {
        $set[$withoutSexSuffix] = true;
    }
}

$cellIdSet = null;
if ($datasetId !== '') {
    $sample = resolveSample($conn, $datasetId, $expectedSpatial);
    if (!$sample) {
        $conn->close();
        http_response_code(404);
        jsonOut(['error' => $expectedSpatial ? 'Spatial sample not found' : 'Single-cell sample not found']);
        exit;
    }

    $cells = fetchAll(
        $conn,
        'SELECT cell_id, legacy_cell_id
         FROM cell FORCE INDEX (idx_sample_id)
         WHERE sample_id = ? AND is_spatial = ?',
        'ii',
        (int)$sample['sample_id'],
        $expectedSpatial
    );
    $cellIdSet = [];
    foreach ($cells as $cell) {
        addScdrsCellIdVariants($cellIdSet, $cell['legacy_cell_id'] ?: $cell['cell_id']);
        addScdrsCellIdVariants($cellIdSet, $cell['cell_id']);
    }
}

$row = fetchOne(
    $conn,
    'SELECT trait_id, sex, compressed_data, n_cells, min_score, max_score
     FROM scdrs_cell_score
     WHERE trait_id = ? AND sex = ?
     LIMIT 1',
    'is',
    (int)$traitId,
    $sex
);

if (!$row) {
    $conn->close();
    http_response_code(404);
    jsonOut(['error' => 'Cell scores not found']);
    exit;
}

$allScores = scdrsRowsFromCompressedJson($row['compressed_data'], 0);
if ($cellIdSet !== null) {
    $scores = [];
    foreach ($allScores as $score) {
        $cellKey = (string)($score['i'] ?? '');
        if ($cellKey !== '' && isset($cellIdSet[$cellKey])) {
            $scores[] = $score;
            if ($limit > 0 && count($scores) >= $limit) {
                break;
            }
        }
    }
} else {
    $scores = $limit > 0 ? array_slice($allScores, 0, $limit) : $allScores;
}

$conn->close();
gzipJson([
    'trait_id' => (int)$row['trait_id'],
    'sex' => $row['sex'],
    'n_cells' => (int)$row['n_cells'],
    'matched_cells' => count($scores),
    'min_score' => $row['min_score'] === null ? null : (float)$row['min_score'],
    'max_score' => $row['max_score'] === null ? null : (float)$row['max_score'],
    'scores' => $scores,
    'note' => $cellIdSet === null
        ? 'i is the scDRS cell identifier from compressed_data; raw keeps the original row for frontend alignment.'
        : ($expectedSpatial
            ? 'scores are filtered by the current spatial dataset using legacy_cell_id ?: cell_id.'
            : 'scores are filtered by the current single-cell dataset using legacy_cell_id ?: cell_id.')
]);
