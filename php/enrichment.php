<?php
set_time_limit(300);
require_once __DIR__ . '/helpers.php';

$gene_sets = $_POST['gene_sets'] ?? '';
$datasetId = $_POST['id'] ?? '';
$significant_genes = json_decode($_POST['genes'] ?? '[]', true);

$conn = getDb();
$projectId = null;
if (strpos($datasetId, 'study') !== false) {
    $resolved = resolveStudySamples($conn, $datasetId);
    if (!empty($resolved['sample_ids'])) {
        $sample = resolveSample($conn, $resolved['sample_ids'][0], null);
        $projectId = $sample ? (int)$sample['project_id'] : null;
    }
} else {
    $sample = resolveSample($conn, $datasetId, null);
    $projectId = $sample ? (int)$sample['project_id'] : null;
}

$background_genes = [];
if ($projectId !== null) {
    $rows = fetchAll($conn, 'SELECT feature_name FROM feature WHERE project_id = ? AND feature_type = "gene"', 'i', $projectId);
    foreach ($rows as $row) {
        $background_genes[] = $row['feature_name'];
    }
}
$conn->close();

if (empty($significant_genes) || empty($gene_sets) || empty($background_genes)) {
    $missing = [];
    if (empty($significant_genes)) $missing[] = 'genes';
    if (empty($gene_sets)) $missing[] = 'gene_sets';
    if (empty($background_genes)) $missing[] = 'background';
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Missing: ' . implode(', ', $missing)]);
    exit();
}

$data = json_encode([
    'significant_genes' => $significant_genes,
    'background_genes' => $background_genes,
    'gene_sets' => $gene_sets
]);

$command = 'python3 enrichment.py';
$descriptorspec = [
    0 => ['pipe', 'r'],
    1 => ['pipe', 'w'],
    2 => ['pipe', 'w']
];
$process = proc_open($command, $descriptorspec, $pipes, __DIR__);
if (is_resource($process)) {
    fwrite($pipes[0], $data);
    fclose($pipes[0]);
    $output = stream_get_contents($pipes[1]);
    fclose($pipes[1]);
    $errors = stream_get_contents($pipes[2]);
    fclose($pipes[2]);
    proc_close($process);
    // stdout 优先：matplotlib 的警告会写 stderr，但 Python 脚本仍然成功输出 JSON 到 stdout
    if (trim($output) !== '') {
        echo $output;
    } else if ($errors) {
        header('Content-Type: application/json');
        echo json_encode(['error' => $errors]);
    } else {
        header('Content-Type: application/json');
        echo json_encode([]);
    }
} else {
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Cannot execute enrichment.py']);
}
