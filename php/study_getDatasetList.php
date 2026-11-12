<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();

$studyIds = [
    'study1.all',
    'study2.all',
    'study3.all',
    'study4.all'
];

$datasets = [];
foreach ($studyIds as $studyId) {
    $resolved = resolveStudySamples($conn, $studyId);
    $study = $resolved['study'];
    if (!$study) {
        continue;
    }

    $sampleIds = $resolved['sample_ids'];
    $cells = 0;
    $sampleCount = count($sampleIds);
    if ($sampleIds) {
        $ph = placeholders($sampleCount);
        $types = str_repeat('i', $sampleCount);
        $stats = fetchOne($conn, "SELECT SUM(n_cells) AS cells FROM sample WHERE sample_id IN ($ph)", $types, ...$sampleIds);
        $cells = (int)($stats['cells'] ?? 0);
    }

    $datasets[] = [
        'study_id' => $study['study_id'],
        'base_study_id' => $study['base_study_id'],
        'project_id' => (int)$study['project_id'],
        'name' => $study['base_study_id'],
        'title' => $study['technology'] . ' integrated',
        'species' => $study['species'],
        'technology' => $study['technology'],
        'scorst' => ((int)($study['project_id']) === 3 || (int)($study['project_id']) === 4) ? 'st' : 'sc',
        'sample_scope' => 'integrated',
        'sampleScope' => 'integrated',
        'is_integrated' => true,
        'isIntegrated' => true,
        'has_integrated_umap' => (bool)$study['has_integrated_umap'],
        'sample_count' => $sampleCount,
        'cells' => $cells,
        'datasets' => $study['datasets'],
        'sample_ids' => $sampleIds,
        'missing' => $resolved['missing']
    ];
}

$conn->close();
jsonOut(['datasets' => $datasets]);
