<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$traitIdsParam = trim($_GET['trait_ids'] ?? '');
$sex = $_GET['sex'] ?? 'male';
$dimension = trim($_GET['dimension'] ?? 'cell_type');
$valueField = $_GET['value'] ?? 'assoc_mcp';
$allowedValues = ['assoc_mcp', 'assoc_mcz', 'hetero_mcp', 'hetero_mcz', 'n_fdr_005', 'n_fdr_01', 'n_fdr_02'];
if (!in_array($valueField, $allowedValues, true)) {
    $valueField = 'assoc_mcp';
}

$traitIds = array_values(array_filter(array_map('intval', explode(',', $traitIdsParam))));
if (empty($traitIds) || !in_array($sex, ['male', 'female'], true) || $dimension === '') {
    $conn->close();
    http_response_code(400);
    jsonOut(['error' => 'Invalid parameters']);
    exit;
}
$traitIds = array_slice(array_unique($traitIds), 0, 100);
$ph = placeholders(count($traitIds));
$types = str_repeat('i', count($traitIds)) . 'ss';
$params = array_merge($traitIds, [$sex, $dimension]);

$rows = fetchAll(
    $conn,
    'SELECT se.trait_id, tm.abbreviation, se.group_name, se.assoc_mcp, se.assoc_mcz,
            se.hetero_mcp, se.hetero_mcz, se.n_fdr_005, se.n_fdr_01, se.n_fdr_02
     FROM scdrs_enrichment se
     JOIN trait_meta tm ON se.trait_id = tm.trait_id
     WHERE se.trait_id IN (' . $ph . ') AND se.sex = ? AND se.dimension = ?
     ORDER BY se.group_name, se.trait_id',
    $types,
    ...$params
);

$rowLabels = [];
$colLabels = [];
$matrix = [];
$sig = [];
foreach ($rows as $row) {
    $group = $row['group_name'];
    $abbr = $row['abbreviation'];
    if (!in_array($group, $rowLabels, true)) {
        $rowLabels[] = $group;
    }
    if (!in_array($abbr, $colLabels, true)) {
        $colLabels[] = $abbr;
    }
    $matrix[$group][$abbr] = $row[$valueField] === null ? null : (float)$row[$valueField];
    $f005 = $row['n_fdr_005'] === null ? 0 : (float)$row['n_fdr_005'];
    $f01 = $row['n_fdr_01'] === null ? 0 : (float)$row['n_fdr_01'];
    $f02 = $row['n_fdr_02'] === null ? 0 : (float)$row['n_fdr_02'];
    $sig[$group][$abbr] = $f005 > 0 ? 3 : ($f01 > 0 ? 2 : ($f02 > 0 ? 1 : 0));
}

$data = [];
$significance = [];
foreach ($rowLabels as $group) {
    $dataRow = [];
    $sigRow = [];
    foreach ($colLabels as $abbr) {
        $dataRow[] = $matrix[$group][$abbr] ?? null;
        $sigRow[] = $sig[$group][$abbr] ?? 0;
    }
    $data[] = $dataRow;
    $significance[] = $sigRow;
}

$conn->close();
jsonOut([
    'rows' => $rowLabels,
    'cols' => $colLabels,
    'data' => $data,
    'significance' => $significance,
    'sex' => $sex,
    'dimension' => $dimension,
    'value' => $valueField
]);
