<?php
ini_set('memory_limit', '2048M');
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$studyId = $_GET['id'] ?? '';
$gene = $_GET['gene'] ?? '';
if ($studyId === '' || $gene === '') {
    $conn->close();
    http_response_code(400);
    jsonOut(['error' => 'Missing required parameters']);
    exit;
}

$resolved = resolveStudySamples($conn, $studyId);
$rows = [];
foreach ($resolved['sample_ids'] as $sampleId) {
    $sample = resolveSample($conn, $sampleId, 1);
    if (!$sample) {
        continue;
    }
    $expr = getExpressionVector($conn, $sample, $gene);
    if (!$expr) {
        continue;
    }
    $values = decompressFloat32Vector($expr['compressed_vector']);
    foreach (expressionRowsForSample($conn, (int)$sample['sample_id'], $values, true) as $row) {
        $row['sample_id'] = (int)$sample['sample_id'];
        // 一并返回 sample_name：前端坐标里的 cell id 前缀用的是 sample_name
        // （studySTPage 挂载时把 id 前缀成「样本名_cellId」），两边前缀必须一致才能对应上。
        $row['sample_name'] = $sample['sample_name'];
        $rows[] = $row;
    }
}

$conn->close();
gzipJson(['data' => $rows, 'missing' => $resolved['missing']]);
