<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$category = trim($_GET['category'] ?? '');
$q = trim($_GET['q'] ?? '');

$sql = 'SELECT trait_id, project_id, abbreviation, full_name, chinese_name, category,
               sample_size, ancestry, pub_year, study, lambda_gc, genome_build,
               has_full_stats, is_depression_related, has_data_files
        FROM trait_meta';
$conditions = [];
$types = '';
$params = [];
if ($category !== '') {
    $conditions[] = 'category = ?';
    $types .= 's';
    $params[] = $category;
}
if ($q !== '') {
    $conditions[] = '(abbreviation LIKE ? OR full_name LIKE ? OR chinese_name LIKE ?)';
    $like = '%' . $q . '%';
    $types .= 'sss';
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}
if (!empty($conditions)) {
    $sql .= ' WHERE ' . implode(' AND ', $conditions);
}
$sql .= ' ORDER BY abbreviation';

$rows = empty($params) ? fetchAll($conn, $sql) : fetchAll($conn, $sql, $types, ...$params);
$traits = [];
foreach ($rows as $row) {
    $traits[] = [
        'id' => (int)$row['trait_id'],
        'project_id' => (int)$row['project_id'],
        'abbr' => $row['abbreviation'],
        'full_name' => $row['full_name'],
        'name' => $row['chinese_name'] ?: $row['full_name'],
        'chinese_name' => $row['chinese_name'],
        'category' => $row['category'],
        'sample_size' => $row['sample_size'] === null ? null : (int)$row['sample_size'],
        'ancestry' => $row['ancestry'],
        'pub_year' => $row['pub_year'] === null ? null : (int)$row['pub_year'],
        'study' => $row['study'],
        'lambda_gc' => $row['lambda_gc'] === null ? null : (float)$row['lambda_gc'],
        'genome_build' => $row['genome_build'],
        'has_full_stats' => (int)$row['has_full_stats'],
        'is_depression_related' => (int)$row['is_depression_related'],
        'has_data_files' => (int)$row['has_data_files']
    ];
}

$conn->close();
jsonOut(['traits' => $traits]);
