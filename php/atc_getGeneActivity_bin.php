<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$conn->close();
http_response_code(501);
jsonOut([
    'error' => 'ATAC gene activity is not available',
    'reason' => 'project_id=14 currently has peak features and expression_peak data, but no gene features or expression_gene records for ATAC gene activity.'
]);
