<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();

$projectId = isset($_GET['project_id']) ? (int)$_GET['project_id'] : 1;
$rows = fetchAll(
    $conn,
    'SELECT f.feature_name AS gene_id, d.cell_type AS cluster_label, d.padj AS p_value, d.log2fc AS fold_change
     FROM deg_result d
     JOIN feature f ON d.feature_id = f.feature_id
     WHERE d.project_id = ? AND d.padj IS NOT NULL AND d.padj < 0.05
     LIMIT 1000',
    'i',
    $projectId
);

$conn->close();
jsonOut($rows);
