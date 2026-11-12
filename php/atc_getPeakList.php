<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$datasetId = trim($_GET['id'] ?? '');
$q = trim($_GET['q'] ?? '');
$chrom = trim($_GET['chrom'] ?? '');
$limit = min(max((int)($_GET['limit'] ?? 50), 1), 1000);

$sample = null;
if ($datasetId !== '') {
    $sample = resolveAtacSample($conn, $datasetId);
    if (!$sample) {
        $conn->close();
        http_response_code(404);
        jsonOut(['error' => 'ATAC sample not found']);
        exit;
    }
}

if ($sample) {
    $where = [
        'ep.sample_id = ?',
        'ep.expression_type = "tfidf"',
        'f.project_id = ?',
        'f.feature_type = "peak"'
    ];
    $types = 'ii';
    $params = [(int)$sample['sample_id'], (int)$sample['project_id']];

    if ($q !== '') {
        $where[] = 'f.feature_name LIKE ?';
        $types .= 's';
        $params[] = '%' . $q . '%';
    } elseif ($chrom !== '') {
        $where[] = 'f.chrom = ?';
        $types .= 's';
        $params[] = $chrom;
    }

    $types .= 'i';
    $params[] = $limit;

    $rows = fetchAll(
        $conn,
        'SELECT f.feature_id, f.feature_name, f.chrom, f.peak_start, f.peak_end, f.peak_score
         FROM expression_peak ep
         JOIN feature f ON ep.feature_id = f.feature_id
         WHERE ' . implode(' AND ', $where) . '
         ORDER BY f.chrom, f.peak_start
         LIMIT ?',
        $types,
        ...$params
    );
} elseif ($q !== '') {
    $like = '%' . $q . '%';
    $rows = fetchAll(
        $conn,
        'SELECT feature_id, feature_name, chrom, peak_start, peak_end, peak_score
         FROM feature
         WHERE project_id = 14 AND feature_type = "peak" AND feature_name LIKE ?
         ORDER BY chrom, peak_start
         LIMIT ?',
        'si',
        $like,
        $limit
    );
} elseif ($chrom !== '') {
    $rows = fetchAll(
        $conn,
        'SELECT feature_id, feature_name, chrom, peak_start, peak_end, peak_score
         FROM feature
         WHERE project_id = 14 AND feature_type = "peak" AND chrom = ?
         ORDER BY peak_start
         LIMIT ?',
        'si',
        $chrom,
        $limit
    );
} else {
    $rows = fetchAll(
        $conn,
        'SELECT feature_id, feature_name, chrom, peak_start, peak_end, peak_score
         FROM feature
         WHERE project_id = 14 AND feature_type = "peak"
         ORDER BY feature_id
         LIMIT ?',
        'i',
        $limit
    );
}

$peaks = [];
foreach ($rows as $row) {
    $peaks[] = [
        'id' => (int)$row['feature_id'],
        'name' => $row['feature_name'],
        'chrom' => $row['chrom'],
        'start' => $row['peak_start'] === null ? null : (int)$row['peak_start'],
        'end' => $row['peak_end'] === null ? null : (int)$row['peak_end'],
        'score' => $row['peak_score'] === null ? null : (float)$row['peak_score']
    ];
}

$conn->close();
jsonOut(['peaks' => $peaks]);
