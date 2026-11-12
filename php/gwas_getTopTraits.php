<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$sex = $_GET['sex'] ?? '';
$dimension = $_GET['dimension'] ?? 'cell_type';
$limit = min(max((int)($_GET['limit'] ?? 20), 1), 200);

if (in_array($sex, ['male', 'female'], true)) {
    $rows = fetchAll(
        $conn,
        'SELECT se.trait_id, tm.abbreviation, tm.chinese_name, tm.full_name, tm.category,
                se.sex, se.dimension, se.group_name, se.assoc_mcp, se.assoc_mcz,
                se.n_fdr_005, se.n_fdr_01, se.n_fdr_02
         FROM scdrs_enrichment se
         JOIN trait_meta tm ON se.trait_id = tm.trait_id
         WHERE se.sex = ? AND se.dimension = ?
         ORDER BY se.assoc_mcp ASC
         LIMIT ?',
        'ssi',
        $sex,
        $dimension,
        $limit
    );
} else {
    $rows = fetchAll(
        $conn,
        'SELECT se.trait_id, tm.abbreviation, tm.chinese_name, tm.full_name, tm.category,
                se.sex, se.dimension, se.group_name, se.assoc_mcp, se.assoc_mcz,
                se.n_fdr_005, se.n_fdr_01, se.n_fdr_02
         FROM scdrs_enrichment se
         JOIN trait_meta tm ON se.trait_id = tm.trait_id
         WHERE se.dimension = ?
         ORDER BY se.assoc_mcp ASC
         LIMIT ?',
        'si',
        $dimension,
        $limit
    );
}

$results = [];
foreach ($rows as $row) {
    $results[] = [
        'trait_id' => (int)$row['trait_id'],
        'abbr' => $row['abbreviation'],
        'name' => $row['chinese_name'] ?: $row['full_name'],
        'category' => $row['category'],
        'sex' => $row['sex'],
        'dimension' => $row['dimension'],
        'group' => $row['group_name'],
        'assoc_mcp' => $row['assoc_mcp'] === null ? null : (float)$row['assoc_mcp'],
        'assoc_mcz' => $row['assoc_mcz'] === null ? null : (float)$row['assoc_mcz'],
        'n_fdr_005' => $row['n_fdr_005'] === null ? null : (float)$row['n_fdr_005'],
        'n_fdr_01' => $row['n_fdr_01'] === null ? null : (float)$row['n_fdr_01'],
        'n_fdr_02' => $row['n_fdr_02'] === null ? null : (float)$row['n_fdr_02']
    ];
}

$conn->close();
jsonOut(['results' => $results]);
