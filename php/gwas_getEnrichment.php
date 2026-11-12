<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$traitId = $_GET['trait_id'] ?? '';
$sex = $_GET['sex'] ?? 'male';
$dimension = trim($_GET['dimension'] ?? '');

if ($traitId === '' || !is_numeric($traitId) || !in_array($sex, ['male', 'female'], true)) {
    $conn->close();
    http_response_code(400);
    jsonOut(['error' => 'Invalid parameters']);
    exit;
}

$trait = fetchOne($conn, 'SELECT trait_id, abbreviation, full_name, chinese_name, category FROM trait_meta WHERE trait_id = ? LIMIT 1', 'i', (int)$traitId);
if (!$trait) {
    $conn->close();
    http_response_code(404);
    jsonOut(['error' => 'Trait not found']);
    exit;
}

if ($dimension !== '') {
    $rows = fetchAll(
        $conn,
        'SELECT enrichment_id, trait_id, sex, dimension, group_name, n_cell, n_ctrl,
                assoc_mcp, assoc_mcz, hetero_mcp, hetero_mcz,
                n_fdr_005, n_fdr_01, n_fdr_02
         FROM scdrs_enrichment
         WHERE trait_id = ? AND sex = ? AND dimension = ?
         ORDER BY assoc_mcp ASC, group_name',
        'iss',
        (int)$traitId,
        $sex,
        $dimension
    );
} else {
    $rows = fetchAll(
        $conn,
        'SELECT enrichment_id, trait_id, sex, dimension, group_name, n_cell, n_ctrl,
                assoc_mcp, assoc_mcz, hetero_mcp, hetero_mcz,
                n_fdr_005, n_fdr_01, n_fdr_02
         FROM scdrs_enrichment
         WHERE trait_id = ? AND sex = ?
         ORDER BY dimension, assoc_mcp ASC, group_name',
        'is',
        (int)$traitId,
        $sex
    );
}

$results = [];
foreach ($rows as $row) {
    $results[] = [
        'enrichment_id' => (int)$row['enrichment_id'],
        'dimension' => $row['dimension'],
        'group' => $row['group_name'],
        'n_cell' => $row['n_cell'] === null ? null : (float)$row['n_cell'],
        'n_ctrl' => $row['n_ctrl'] === null ? null : (float)$row['n_ctrl'],
        'assoc_mcp' => $row['assoc_mcp'] === null ? null : (float)$row['assoc_mcp'],
        'assoc_mcz' => $row['assoc_mcz'] === null ? null : (float)$row['assoc_mcz'],
        'hetero_mcp' => $row['hetero_mcp'] === null ? null : (float)$row['hetero_mcp'],
        'hetero_mcz' => $row['hetero_mcz'] === null ? null : (float)$row['hetero_mcz'],
        'n_fdr_005' => $row['n_fdr_005'] === null ? null : (float)$row['n_fdr_005'],
        'n_fdr_01' => $row['n_fdr_01'] === null ? null : (float)$row['n_fdr_01'],
        'n_fdr_02' => $row['n_fdr_02'] === null ? null : (float)$row['n_fdr_02']
    ];
}

$conn->close();
jsonOut([
    'trait' => [
        'id' => (int)$trait['trait_id'],
        'abbr' => $trait['abbreviation'],
        'name' => $trait['chinese_name'] ?: $trait['full_name'],
        'full_name' => $trait['full_name'],
        'category' => $trait['category']
    ],
    'sex' => $sex,
    'dimension' => $dimension === '' ? null : $dimension,
    'results' => $results
]);
