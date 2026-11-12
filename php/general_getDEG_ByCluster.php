<?php
set_time_limit(300);
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$datasetId = $_GET['id'] ?? '';
$cellCluster = $_GET['cluster'] ?? '';
$sample = resolveSample($conn, $datasetId, null);

if (!$sample || $cellCluster === '') {
    $conn->close();
    http_response_code(400);
    jsonOut(['error' => 'Invalid parameters']);
    exit;
}

$projectId = (int)$sample['project_id'];
if ($projectId === 1) {
    $row = fetchOne(
        $conn,
        'SELECT bin_data FROM deg_binary WHERE project_id = 1 AND cell_type = ? AND deg_category = "marker" LIMIT 1',
        's',
        $cellCluster
    );
    if ($row && $row['bin_data'] !== null) {
        $raw = @zlib_decode($row['bin_data']);
        if ($raw === false) {
            $raw = @gzdecode($row['bin_data']);
        }
        $decoded = $raw === false ? null : json_decode($raw, true);
        if (is_array($decoded)) {
            gzipJson(normalizeDegRows($decoded));
        } else {
            http_response_code(500);
            jsonOut(['error' => 'Invalid DEG binary data']);
        }
    } else {
        http_response_code(404);
        jsonOut(['error' => 'No DEG data found']);
    }
} else {
    $rows = fetchAll(
        $conn,
        'SELECT f.feature_name AS gene_id, d.log2fc, d.pvalue, d.padj, d.avg_expr_group1, d.avg_expr_group2
         FROM deg_result d
         JOIN feature f ON d.feature_id = f.feature_id
         WHERE d.project_id = ? AND d.cell_type = ? AND d.padj IS NOT NULL
         ORDER BY d.padj ASC
         LIMIT 5000',

        'is',
        $projectId,
        $cellCluster
    );
    gzipJson(normalizeDegRows($rows));
}

$conn->close();
