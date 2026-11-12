<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$studyId = $_GET['id'] ?? '';
$resolved = resolveStudySamples($conn, $studyId);
$study = $resolved['study'];

$datasets = [];
if ($study) {
    $sampleIds = $resolved['sample_ids'];
    $cells = 0;
    $clusters = 0;
    if ($sampleIds) {
        $ph = placeholders(count($sampleIds));
        $types = str_repeat('i', count($sampleIds));
        $stats = fetchOne($conn, "SELECT SUM(n_cells) AS cells FROM sample WHERE sample_id IN ($ph)", $types, ...$sampleIds);
        // 必须 FORCE INDEX (idx_sample_id)：否则 MySQL 可能对 cell 走全表扫描，
        // 空转整合（cell 行数百万）会跑 60s+ 导致接口超时，前端 response.ok=false 直接抛错，
        // 详情面板就会全空（这正是"整合页详细信息不显示"的原因）。
        // 与 sst_getNumberOfCluster.php / sst_getCoordinate.php 保持同一执行计划。
        $clusterStats = fetchOne($conn, "SELECT COUNT(DISTINCT COALESCE(cluster_label2, cell_type, 'Unknown')) AS clusters FROM cell FORCE INDEX (idx_sample_id) WHERE sample_id IN ($ph)", $types, ...$sampleIds);
        $cells = (int)($stats['cells'] ?? 0);
        $clusters = (int)($clusterStats['clusters'] ?? 0);
    }

    $information = normalizeDatasetInformation($study['information'] ?? null, null, '', '');
    $informationObj = datasetInformationObject($information);
    $datasets[] = [
        'study_id' => $study['study_id'],
        'species' => $study['species'] ?? null,
        'age' => $study['age'] ?? null,
        'sex' => $study['sex'] ?? null,
        'conditions' => $study['conditions'] ?? null,
        'area' => $study['area'] ?? null,
        'cells' => $cells,
        'clusters' => $clusters,
        'sample_scope' => 'integrated',
        'sampleScope' => 'integrated',
        'is_integrated' => true,
        'isIntegrated' => true,
        'has_integrated_umap' => (bool)($study['has_integrated_umap'] ?? true),
        'information' => $information,
        'information_obj' => $informationObj,
        'datasets' => $study['datasets'] ?? '',
        // 前端「涵盖的数据集」按钮用 display_name 展示，此前没透传该字段，只能回退显示 sample_name。
        'dataset_display_names' => $study['dataset_display_names'] ?? '',
        'sample_ids' => $sampleIds,
        'sample_count' => count($sampleIds),
        'missing' => $resolved['missing']
    ];

}

$conn->close();
jsonOut($datasets);
