<?php
ini_set('memory_limit', '2048M');
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$datasetId = $_GET['id'] ?? ($_GET['dataset_id'] ?? '');
$traitId   = $_GET['trait_id'] ?? '';
$limit     = (int)($_GET['limit'] ?? 0);
$includeCoordinates = ($_GET['coordinates'] ?? $_GET['include_coordinates'] ?? '0') === '1';

if ($datasetId === '' || $traitId === '' || !is_numeric($traitId)) {
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

$trait = fetchOne($conn, 'SELECT trait_id, abbreviation, full_name, chinese_name, category FROM trait_meta WHERE trait_id = ? LIMIT 1', 'i', (int)$traitId);
if (!$trait) {
    $conn->close();
    http_response_code(404);
    jsonOut(['error' => 'Trait not found']);
    exit;
}

// 统计：利用 PK 前缀 (sample_id, trait_id)，极快（~0.03s）
$total = fetchOne(
    $conn,
    'SELECT COUNT(*) AS n, MIN(z) AS min_z, MAX(z) AS max_z
     FROM gsmap_spatial_score
     WHERE sample_id = ? AND trait_id = ?',
    'ii',
    (int)$sample['sample_id'],
    (int)$traitId
);

if (!$total || (int)$total['n'] === 0) {
    $conn->close();
    http_response_code(404);
    jsonOut(['error' => 'GSMap spatial scores not found']);
    exit;
}

$limitSql = $limit > 0 ? ' LIMIT ' . min($limit, 1000000) : '';
$rows = fetchAll(
    $conn,
    'SELECT spot_id, z
     FROM gsmap_spatial_score
     WHERE sample_id = ? AND trait_id = ?
     ORDER BY spot_id' . $limitSql,
    'ii',
    (int)$sample['sample_id'],
    (int)$traitId
);

$coordinateBySpot = [];
if ($includeCoordinates && $rows) {
    $spotIds = array_values(array_unique(array_map(
        static fn($row) => (string)$row['spot_id'], $rows
    )));
    if ($spotIds) {
        // 利用 idx_sample_barcode(sample_id, cell_barcode) 走索引，避免全表扫
        $ph = placeholders(count($spotIds));
        $types = 'i' . str_repeat('s', count($spotIds));
        $params = array_merge([(int)$sample['sample_id']], $spotIds);
        $coordRows = fetchAll(
            $conn,
            "SELECT cell_barcode, spatial_x, spatial_y, cell_type, cluster_label2
             FROM cell
             WHERE sample_id = ? AND cell_barcode IN ($ph)",
            $types,
            ...$params
        );
        foreach ($coordRows as $coordRow) {
            $coordinateBySpot[(string)$coordRow['cell_barcode']] = $coordRow;
        }
    }
}

$scores = [];
foreach ($rows as $row) {
    $spotId = (string)$row['spot_id'];
    $item = [
        'i' => $spotId,
        'z' => $row['z'] === null ? null : (float)$row['z'],
    ];
    if ($includeCoordinates) {
        $coord = $coordinateBySpot[$spotId] ?? null;
        $item['x'] = $coord && $coord['spatial_x'] !== null ? (float)$coord['spatial_x'] : null;
        $item['y'] = $coord && $coord['spatial_y'] !== null ? (float)$coord['spatial_y'] : null;
        $item['c'] = $coord ? clusterLabel($coord) : null;
    }
    $scores[] = $item;
}

$conn->close();
gzipJson([
    'sample_id'         => (int)$sample['sample_id'],
    'dataset_id'        => $sample['sample_name'],
    'trait' => [
        'id'        => (int)$trait['trait_id'],
        'abbr'      => $trait['abbreviation'],
        'name'      => $trait['chinese_name'] ?: $trait['full_name'],
        'full_name' => $trait['full_name'],
        'category'  => $trait['category']
    ],
    'n_spots'      => (int)$total['n'],
    'matched_spots'=> count($scores),
    'min_z'        => $total['min_z'] === null ? null : (float)$total['min_z'],
    'max_z'        => $total['max_z'] === null ? null : (float)$total['max_z'],
    'scores'       => $scores,
    'note' => $includeCoordinates
        ? 'i is the GSMap spot identifier (= cell.cell_barcode); x/y/c are joined from spatial cell coordinates.'
        : 'i is the GSMap spot identifier and should be aligned with std_getCoordinate.php coordinate_data.i.'
]);
