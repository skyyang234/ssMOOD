<?php
require_once __DIR__ . '/config.php';

function getDb() {
    global $servername, $username, $password, $dbname;
    $conn = new mysqli($servername, $username, $password, $dbname);
    if ($conn->connect_error) {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed']);
        exit;
    }
    $conn->set_charset('utf8mb4');
    return $conn;
}

function gzipJson($data) {
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Encoding: gzip');
    if (ob_get_length()) {
        ob_clean();
    }
    echo gzencode($json);
}

function jsonOut($data) {
    header('Content-Type: application/json; charset=utf-8');
    // 与 gzipJson 保持一致：清掉此前任何输出（PHP notice/warning、多余空行），
    // 否则这些内容会排在 JSON 前面，前端 response.json() 解析失败 → 整个接口"看起来没数据"。
    if (ob_get_length()) {
        ob_clean();
    }
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function fetchOne($conn, $sql, $types = '', ...$params) {
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        return null;
    }
    if ($types !== '') {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    return $result ? $result->fetch_assoc() : null;
}

function fetchAll($conn, $sql, $types = '', ...$params) {
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        return [];
    }
    if ($types !== '') {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    $rows = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $rows[] = $row;
        }
    }
    return $rows;
}

function resolveSample($conn, $id, $expectedSpatial = null) {
    $whereSpatial = $expectedSpatial === null ? '' : ' AND s.is_spatial = ?';

    if (is_numeric($id)) {
        $sql = "SELECT s.sample_id, s.sample_name, s.project_id, s.is_spatial, p.species, p.technology
                FROM sample s JOIN project p ON s.project_id = p.project_id
                WHERE s.sample_id = ?" . $whereSpatial . " LIMIT 1";
        return $expectedSpatial === null
            ? fetchOne($conn, $sql, 'i', (int)$id)
            : fetchOne($conn, $sql, 'ii', (int)$id, (int)$expectedSpatial);
    }

    $sql = "SELECT s.sample_id, s.sample_name, s.project_id, s.is_spatial, p.species, p.technology
            FROM sample s JOIN project p ON s.project_id = p.project_id
            WHERE s.sample_name = ?" . $whereSpatial . " LIMIT 1";
    $row = $expectedSpatial === null
        ? fetchOne($conn, $sql, 's', $id)
        : fetchOne($conn, $sql, 'si', $id, (int)$expectedSpatial);
    if ($row) {
        return $row;
    }

    return null;
}

function clusterLabel($row) {
    return $row['cluster_label2'] ?: ($row['cell_type'] ?: 'Unknown');
}

function decompressFloat32Vector($blob) {
    $raw = @zlib_decode($blob);
    if ($raw === false) {
        $raw = @gzdecode($blob);
    }
    if ($raw === false) {
        return [];
    }
    $values = @unpack('f*', $raw);
    return $values ?: [];
}

function expressionRowsForSample($conn, $sampleId, $values, $nonZeroOnly = true) {
    $cells = fetchAll($conn, 'SELECT cell_index, cell_id, legacy_cell_id FROM cell WHERE sample_id = ? ORDER BY cell_index', 'i', $sampleId);
    $indexToId = [];
    foreach ($cells as $cell) {
        $indexToId[(int)$cell['cell_index']] = $cell['legacy_cell_id'] ?: $cell['cell_id'];
    }

    $rows = [];
    foreach ($values as $oneBasedIndex => $value) {
        $cellIndex = (int)$oneBasedIndex - 1;
        $value = (float)$value;
        if ($nonZeroOnly && abs($value) < 1e-12) {
            continue;
        }
        if (!array_key_exists($cellIndex, $indexToId)) {
            continue;
        }
        $rows[] = ['i' => $indexToId[$cellIndex], 'nc' => $value];
    }
    return $rows;
}

function getExpressionVector($conn, $sample, $gene) {
    $needle = trim((string)$gene);
    $projectId = (int)$sample['project_id'];
    // ① 基因匹配：先精确等值（可走索引），失败再退化为「去首尾空格 + 忽略大小写」匹配。
    //    个别数据集里 feature_name 的大小写/空格与用户输入不完全一致，精确匹配会误判成"查无此基因"，
    //    表现为"明明高表达却搜不到 / 画出来全灰"。
    $feature = fetchOne(
        $conn,
        'SELECT feature_id FROM feature WHERE project_id = ? AND feature_type = "gene" AND feature_name = ? LIMIT 1',
        'is',
        $projectId,
        $needle
    );
    if (!$feature) {
        $feature = fetchOne(
            $conn,
            'SELECT feature_id FROM feature WHERE project_id = ? AND feature_type = "gene" AND LOWER(TRIM(feature_name)) = LOWER(?) LIMIT 1',
            'is',
            $projectId,
            $needle
        );
    }
    if (!$feature) {
        return null;
    }

    $sampleId = (int)$sample['sample_id'];
    $featureId = (int)$feature['feature_id'];
    // ② 表达向量：优先 log1p_norm，其次 counts，最后**任取一种**（与 ATAC 取数口径一致）。
    //    个别样本的 expression_type 既不是 log1p_norm 也不是 counts，只查前两者会误判成"无表达"。
    $expr = fetchOne(
        $conn,
        'SELECT compressed_vector, expression_type FROM expression_gene WHERE sample_id = ? AND feature_id = ? AND expression_type = "log1p_norm" LIMIT 1',
        'ii',
        $sampleId,
        $featureId
    );
    if (!$expr) {
        $expr = fetchOne(
            $conn,
            'SELECT compressed_vector, expression_type FROM expression_gene WHERE sample_id = ? AND feature_id = ? AND expression_type = "counts" LIMIT 1',
            'ii',
            $sampleId,
            $featureId
        );
    }
    if (!$expr) {
        $expr = fetchOne(
            $conn,
            'SELECT compressed_vector, expression_type FROM expression_gene WHERE sample_id = ? AND feature_id = ? LIMIT 1',
            'ii',
            $sampleId,
            $featureId
        );
    }
    return $expr;
}

function studyBaseConfig($baseStudyId) {
    $configs = [
        'study1' => ['project_id' => 2, 'is_spatial' => 0, 'species' => 'mouse', 'technology_label' => 'Single-nucleus RNA-seq', 'title' => 'Mouse single-cell integrated dataset'],
        'study2' => ['project_id' => 3, 'is_spatial' => 1, 'species' => 'mouse', 'technology_label' => 'stereo-seq', 'title' => 'Mouse spatial transcriptomics integrated dataset'],
        'study3' => ['project_id' => 1, 'is_spatial' => 0, 'species' => 'human', 'technology_label' => 'Single-nucleus RNA-seq', 'title' => 'Human single-cell integrated dataset'],
        'study4' => ['project_id' => 4, 'is_spatial' => 1, 'species' => 'human', 'technology_label' => 'stereo-seq', 'title' => 'Human spatial transcriptomics integrated dataset'],
    ];
    return $configs[$baseStudyId] ?? null;
}

function normalizeStudyCondition($baseStudyId, $condition) {
    if ($condition === null || $condition === '' || strtolower($condition) === 'all') {
        return null;
    }
    $condition = trim($condition);
    $map = [
        'study1' => ['S' => 'Sus', 'R' => 'Res'],
        'study2' => ['S' => 'Sus', 'R' => 'Res'],
        'study3' => ['Control' => 'C', 'MDD' => 'S'],
    ];
    return $map[$baseStudyId][$condition] ?? $condition;
}

/**
 * 整合数据集的「数据集来源」元数据（Study 级），内容逐字取自 v1 的 doc/datasetInfo.json
 * （该文件已从仓库删除，可用 `git show "<删除它的提交>^:doc/datasetInfo.json"` 取回）。
 * v1 里这些值存在 datasets.information 字段；v2 换成 project/sample 后没有对应存储，
 * 这里以代码内映射表承接，保持与 v1 完全一致的展示。
 *
 * study3（人类单细胞）在 v1 由 3 个来源构成：BA9 / BA11 是公共数据再分析，BA12+BA46 为本研究数据。
 */
function studySourceInformation($baseStudyId) {
    // 本研究自产数据（标题相同，仅平台不同）：小鼠单细胞用 10x、人类单细胞用 Singleron。
    $inHouseSc = [
        'Title' => 'Spatiotemporally Single-cell Atlas Revealing Molecular Dynamics of Major Depression Disorder Across Brain Regions During Disease Progression',
        'Methodology' => 'Single-nucleus RNA-seq',
        'Protocol' => '10x Genomics',
        'PublicDataID' => 'Public release upon publication',
        'Pubmed' => 0,
        'DOI' => 'Public release upon publication',
        'Statement' => 'reviewer private link at submission; public upon publication.'
    ];
    $inHouseScHuman = array_merge($inHouseSc, ['Protocol' => 'Singleron GEXSCOPE']);

    // 空间转录组（stereo-seq）：v1 的 SQL 是 WHERE scorst='st'，小鼠与人类共用同一套文案。
    $inHouseSpatial = [
        'Title' => 'Spatiotemporally Single-cell Atlas Revealing Molecular Dynamics of Major Depression Disorder Across Brain Regions During Disease Progression',
        'Methodology' => 'stereo-seq',
        'Protocol' => 'BGI Genomics',
        'PublicDataID' => 'Public release upon publication',
        'Pubmed' => 0,
        'DOI' => 'Public release upon publication',
        'Statement' => 'reviewer private link at submission; public upon publication.'
    ];

    // 人类单细胞的公共数据再分析来源
    $humanBa9 = [
        'Title' => 'Single-nucleus transcriptomics of the prefrontal cortex in major depressive disorder implicates oligodendrocyte precursor cells and excitatory neurons',
        'Methodology' => 'Single-nucleus RNA-seq',
        'Protocol' => '10x Genomics',
        'PublicDataID' => 'GSE144136 (NCBI)',
        'Pubmed' => 0,
        'DOI' => '10.1038/s41593-020-0621-y',
        'Statement' => 'We downloaded the raw count matrices GSE144136 and re-analyzed them in this study. We performed unified quality control and integrated the data with our in-house dataset using a consistent pipeline.'
    ];
    $humanBa11 = [
        'Title' => 'Single-nucleus transcriptomic profiling of human orbitofrontal cortex reveals convergent effects of aging and psychiatric disease',
        'Methodology' => 'Single-nucleus RNA-seq',
        'Protocol' => '10x Genomics',
        'PublicDataID' => 'GSE254569 (NCBI)',
        'Pubmed' => 0,
        'DOI' => '10.1038/s41593-024-01742-z',
        'Statement' => 'We downloaded the raw count matrices GSE254569 and re-analyzed them in this study. We performed unified quality control and integrated the data with our in-house dataset using a consistent pipeline.'
    ];

    $map = [
        'study1' => ['DatasetSource1' => $inHouseSc],
        'study2' => ['DatasetSource1' => $inHouseSpatial],
        'study3' => [
            'DatasetSource1' => $humanBa9,
            'DatasetSource2' => $humanBa11,
            'DatasetSource3' => $inHouseScHuman
        ],
        'study4' => ['DatasetSource1' => $inHouseSpatial]
    ];

    return $map[$baseStudyId] ?? [];
}

function parseV2StudyId($studyId) {
    $parts = array_values(array_filter(explode('.', trim((string)$studyId)), 'strlen'));
    $base = $parts[0] ?? '';
    $config = studyBaseConfig($base);
    if (!$config) {
        return null;
    }

    $criteria = ['study_id' => $studyId, 'base_study_id' => $base, 'condition' => null, 'tissue' => null] + $config;
    if (count($parts) === 1 || (isset($parts[1]) && strtolower($parts[1]) === 'all')) {
        return $criteria;
    }

    if ($base === 'study1' || $base === 'study2') {
        if (($parts[1] ?? '') === 'conditions') {
            $criteria['condition'] = normalizeStudyCondition($base, $parts[2] ?? null);
        } elseif (($parts[1] ?? '') === 'area') {
            $criteria['tissue'] = $parts[2] ?? null;
        }
        return $criteria;
    }

    if ($base === 'study3' || $base === 'study4') {
        $criteria['tissue'] = $parts[1] ?? null;
        $criteria['condition'] = normalizeStudyCondition($base, $parts[2] ?? null);
        return $criteria;
    }

    return $criteria;
}

function getStudyDefinition($conn, $studyId) {
    $criteria = parseV2StudyId($studyId);
    if (!$criteria) {
        return null;
    }

    $project = fetchOne($conn, 'SELECT project_id, name, species, technology, description, has_integrated_umap FROM project WHERE project_id = ? LIMIT 1', 'i', (int)$criteria['project_id']);
    // 「数据集来源」读取 Study 级元数据（内容来自 v1 的 doc/datasetInfo.json，见 studySourceInformation）。
    // v2 重写时丢了这张表，导致右侧只剩 4 行、公共数据ID / DOI 恒空。
    $metadata = studySourceInformation($criteria['base_study_id']);
    if (!$metadata) {
        // 兜底：新增 study 时仍能给出基础来源信息，不至于空白。
        $metadata = [
            'DatasetSource1' => [
                'Title' => $criteria['title'],
                'Methodology' => $criteria['technology_label'],
                'Protocol' => $project['technology'] ?? $criteria['technology_label'],
                'PublicDataID' => '',
                'Pubmed' => null,
                'DOI' => '',
                'Statement' => $project['description'] ?? ''
            ]
        ];
    }

    // 注意：这里的 age / sex / conditions / area 只是「占位基线」。
    // 整合数据集详情页展示的这几个字段由 resolveStudySamples() → applyStudySummary()
    // 按实际覆盖样本上卷覆盖（会被 summarizeStudyValues 重写），此处不要用它们做判断依据。
    return [
        'study_id' => $criteria['study_id'],
        'base_study_id' => $criteria['base_study_id'],
        'project_id' => (int)$criteria['project_id'],
        'species' => $project['species'] ?? $criteria['species'],
        'age' => null,
        'sex' => null,
        'conditions' => $criteria['condition'],
        'area' => $criteria['tissue'],
        'technology' => $project['technology'] ?? $criteria['technology_label'],
        'sample_scope' => 'integrated',
        'has_integrated_umap' => isset($project['has_integrated_umap']) ? (bool)$project['has_integrated_umap'] : true,
        'information' => json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'datasets' => ''
    ];
}

function sampleScopeMetadata($scope, $source = 'sample') {
    return [
        'sample_scope' => $scope,
        'sampleScope' => $scope,
        'is_integrated' => $scope === 'integrated',
        'isIntegrated' => $scope === 'integrated',
        'source' => $source
    ];
}

/**
 * 把样本级属性上卷为整合数据集级的「汇总」值：多值去重后用 / 连接。
 * 背景：getStudyDefinition() 里 sex / age 被写死成 null，conditions / area 只取自 URL 路径段，
 * 于是整合数据集详情页这几个字段恒为空，页面显得大片留白。
 * 这些属性本来就在 sample 表里（详见 bsc_getSCDatasetList.php / bst_getSTDatasetList.php 的取法），
 * 所以这里按「该整合数据集实际覆盖的样本」聚合，不再依赖 URL。
 */
function summarizeStudyValues($rows, $key, $fallback) {
    $values = [];
    foreach ($rows as $row) {
        $value = trim((string)($row[$key] ?? ''));
        if ($value === '') {
            continue;
        }
        if (!in_array($value, $values, true)) {
            $values[] = $value;
        }
    }
    return $values ? implode('/', $values) : $fallback;
}

function applyStudySummary($study, $rows) {
    // 条件为空时沿用旧版展示的 all（表示覆盖了全部条件）；其余字段确实无数据时用占位符，不伪造取值。
    $study['area'] = summarizeStudyValues($rows, 'tissue', '—');
    $study['conditions'] = summarizeStudyValues($rows, 'condition', 'all');
    $study['sex'] = summarizeStudyValues($rows, 'sex', '—');
    $study['age'] = summarizeStudyValues($rows, 'age', '—');
    return $study;
}

/**
 * 「涵盖的数据集」按钮文案：{性别}_{组织}_{条件}_repN。
 * 旧实现漏了 _repN，同一分组内的多个重复样本会生成完全相同的名字（页面上出现多个 M_I_3D）。
 * 这里按分组计数补齐，命名口径与单样本列表接口（bst_getSTDatasetList / bsc_getSCDatasetList）保持一致。
 */
function studySampleDisplayNames($rows) {
    $counters = [];
    $names = [];
    foreach ($rows as $row) {
        $sex = strtolower(trim((string)($row['sex'] ?? '')));
        $sexAbbr = $sex === 'female' ? 'F' : ($sex === 'male' ? 'M' : ($sex === '' ? 'U' : strtoupper(substr($sex, 0, 1))));
        $tissue = trim((string)($row['tissue'] ?? ''));
        $condition = trim((string)($row['condition'] ?? ''));
        $key = $sexAbbr . '_' . ($tissue !== '' ? $tissue : 'NA') . '_' . ($condition !== '' ? $condition : 'NA');
        $counters[$key] = ($counters[$key] ?? 0) + 1;
        $names[] = $key . '_rep' . $counters[$key];
    }
    return $names;
}

function resolveStudySamples($conn, $studyId) {
    $criteria = parseV2StudyId($studyId);
    if (!$criteria) {
        return ['study' => null, 'sample_ids' => [], 'missing' => [$studyId]];
    }

    $where = ['s.project_id = ?', 's.is_spatial = ?'];
    $types = 'ii';
    $params = [(int)$criteria['project_id'], (int)$criteria['is_spatial']];
    if ($criteria['condition'] !== null) {
        $where[] = 's.`condition` = ?';
        $types .= 's';
        $params[] = $criteria['condition'];
    }
    if ($criteria['tissue'] !== null) {
        $where[] = 's.tissue = ?';
        $types .= 's';
        $params[] = $criteria['tissue'];
    }

    // 多取一个 age：整合数据集的「年龄」需要按覆盖样本上卷，之前没查这一列。
    $rows = fetchAll($conn, 'SELECT sample_id, sample_name, sex, age, tissue, `condition` FROM sample s WHERE ' . implode(' AND ', $where) . ' ORDER BY sample_id', $types, ...$params);
    $sampleIds = array_map(static function ($row) { return (int)$row['sample_id']; }, $rows);
    $study = getStudyDefinition($conn, $studyId);
    if ($study) {
        $study['datasets'] = implode(',', array_map(static function ($row) { return $row['sample_name']; }, $rows));
        $study['dataset_display_names'] = implode(',', studySampleDisplayNames($rows));
        $study = applyStudySummary($study, $rows);
    }

    return ['study' => $study, 'sample_ids' => $sampleIds, 'missing' => empty($sampleIds) ? [$studyId] : []];
}

function placeholders($count) {
    return implode(',', array_fill(0, $count, '?'));
}

function defaultDatasetInformation($methodology = '', $protocol = '') {
    return json_encode([
        'DatasetSource1' => [
            'Title' => '',
            'Methodology' => $methodology,
            'Protocol' => $protocol,
            'PublicDataID' => '',
            'Pubmed' => null,
            'DOI' => '',
            'Statement' => ''
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function datasetInformationSources($data) {
    if (!is_array($data)) {
        return [];
    }

    $sources = [];
    foreach (['DatasetSource1', 'DatasetSource2', 'DatasetSource3'] as $key) {
        if (isset($data[$key]) && is_array($data[$key])) {
            $sources[$key] = $data[$key];
        }
    }
    return $sources;
}

function decodeDatasetInformationPayload($payload) {
    if (is_array($payload)) {
        return $payload;
    }
    if (!is_string($payload) || trim($payload) === '') {
        return null;
    }
    $decoded = json_decode($payload, true);
    return is_array($decoded) ? $decoded : null;
}

function flatDatasetInformationSource($data, $methodology = '', $protocol = '') {
    if (!is_array($data)) {
        return [];
    }

    $source = [
        'Title' => $data['Title'] ?? $data['title'] ?? $data['study_title'] ?? $data['dataset_title'] ?? '',
        'Methodology' => $data['Methodology'] ?? $data['methodology'] ?? $data['method'] ?? $methodology,
        'Protocol' => $data['Protocol'] ?? $data['protocol'] ?? $data['way'] ?? $data['technology'] ?? $protocol,
        'PublicDataID' => $data['PublicDataID'] ?? $data['public_data_id'] ?? $data['publicDataId'] ?? $data['accession'] ?? $data['geo'] ?? $data['gse'] ?? '',
        'Pubmed' => $data['Pubmed'] ?? $data['pubmed'] ?? $data['pmid'] ?? null,
        'DOI' => $data['DOI'] ?? $data['doi'] ?? '',
        'Statement' => $data['Statement'] ?? $data['statement'] ?? $data['description'] ?? $data['source'] ?? ''
    ];

    foreach ($source as $value) {
        if ($value !== null && $value !== '') {
            return ['DatasetSource1' => $source];
        }
    }
    return [];
}

function datasetInformationObject($information) {
    $decoded = decodeDatasetInformationPayload($information);
    return is_array($decoded) ? $decoded : [];
}

function normalizeDatasetInformation($metadata, $fallback = null, $methodology = '', $protocol = '') {
    foreach ([$metadata, $fallback] as $payload) {
        $decoded = decodeDatasetInformationPayload($payload);
        if (!is_array($decoded)) {
            continue;
        }

        $sources = datasetInformationSources($decoded);
        if (!empty($sources)) {
            return json_encode($sources, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }

        if (array_key_exists('information', $decoded)) {
            $information = decodeDatasetInformationPayload($decoded['information']);
            $sources = datasetInformationSources($information);
            if (!empty($sources)) {
                return json_encode($sources, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
            $sources = flatDatasetInformationSource($information, $methodology, $protocol);
            if (!empty($sources)) {
                return json_encode($sources, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
        }

        $sources = flatDatasetInformationSource($decoded, $methodology, $protocol);
        if (!empty($sources)) {
            return json_encode($sources, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
    }

    return defaultDatasetInformation($methodology, $protocol);
}

function normalizeDegRows($rows) {
    $normalized = [];
    foreach ($rows as $row) {
        $normalized[] = [
            'i' => $row['i'] ?? ($row['g'] ?? ($row['gene_id'] ?? '')),
            'fc' => isset($row['fc']) ? (float)$row['fc'] : (isset($row['log2fc']) ? (float)$row['log2fc'] : 0.0),
            'a' => isset($row['a']) ? (float)$row['a'] : (isset($row['pa']) ? (float)$row['pa'] : (isset($row['padj']) ? (float)$row['padj'] : (isset($row['pvalue']) ? (float)$row['pvalue'] : 1.0))),
            't1' => isset($row['t1']) ? (float)$row['t1'] : (isset($row['p1']) ? (float)$row['p1'] : (isset($row['avg_expr_group1']) ? (float)$row['avg_expr_group1'] : 0.0)),
            't2' => isset($row['t2']) ? (float)$row['t2'] : (isset($row['p2']) ? (float)$row['p2'] : (isset($row['avg_expr_group2']) ? (float)$row['avg_expr_group2'] : 0.0))
        ];
    }
    return $normalized;
}

function resolveAtacSample($conn, $id) {
    $sample = resolveSample($conn, $id, 0);
    return ($sample && (int)$sample['project_id'] === 14) ? $sample : null;
}

function resolvePeakFeature($conn, $peakId = '', $peakName = '') {
    if ($peakId !== '' && is_numeric($peakId)) {
        return fetchOne(
            $conn,
            'SELECT feature_id, feature_name, chrom, peak_start, peak_end, peak_score FROM feature WHERE project_id = 14 AND feature_type = "peak" AND feature_id = ? LIMIT 1',
            'i',
            (int)$peakId
        );
    }
    if ($peakName !== '') {
        return fetchOne(
            $conn,
            'SELECT feature_id, feature_name, chrom, peak_start, peak_end, peak_score FROM feature WHERE project_id = 14 AND feature_type = "peak" AND feature_name = ? LIMIT 1',
            's',
            $peakName
        );
    }
    return null;
}

function gsmapSummaryForSampleName($sampleName) {
    $summaries = [
        'ST0051_C_BA12' => [
            'has_gsmap_spatial' => false,
            'has_gsmap_cauchy' => true,
            'gsmap_spatial_rows' => 0,
            'gsmap_spatial_traits' => 0,
            'gsmap_spatial_spots' => 0,
            'gsmap_cauchy_rows' => 1869,
            'gsmap_cauchy_traits' => 89,
            'gsmap_cauchy_annotations' => 21
        ],
        'ST0055_C_BA46' => [
            'has_gsmap_spatial' => true,
            'has_gsmap_cauchy' => true,
            'gsmap_spatial_rows' => 4741742,
            'gsmap_spatial_traits' => 89,
            'gsmap_spatial_spots' => 53278,
            'gsmap_cauchy_rows' => 1780,
            'gsmap_cauchy_traits' => 89,
            'gsmap_cauchy_annotations' => 20
        ]
    ];

    return $summaries[$sampleName] ?? [
        'has_gsmap_spatial' => false,
        'has_gsmap_cauchy' => false,
        'gsmap_spatial_rows' => 0,
        'gsmap_spatial_traits' => 0,
        'gsmap_spatial_spots' => 0,
        'gsmap_cauchy_rows' => 0,
        'gsmap_cauchy_traits' => 0,
        'gsmap_cauchy_annotations' => 0
    ];
}

/**
 * 根据 sample_id 查询 GSMap 汇总信息。
 * 优先读 gsmap_trait_summary 汇总表（小表，极快），避免直接查 4.5亿行大表。
 * 汇总表位置：ssmood_v2.gsmap_trait_summary（由 DBA 通过 _fill_summary.php?action=fill 填充）。
 * 数据源：ssmood_v2.gsmap_spatial_score（454M行，只含 spot_id, z 两列）。
 *
 * 注意：gsmap_spatial_score 表 4.5 亿行，innodb_buffer_pool_size=128MB，
 * 首次 COUNT(*) 需 80s+，禁止在生产环境逐样本实时聚合。
 */
function gsmapSummaryForSampleId($conn, $sampleId) {
    $sid = (int)$sampleId;
    // 1. 查汇总表（ssmood_v2 库，小表，极快）
    $sr = fetchOne($conn,
        'SELECT n_rows, n_spots FROM ssmood_v2.gsmap_trait_summary WHERE sample_id = ? LIMIT 1',
        'i', $sid
    );
    if ($sr && (int)($sr['n_rows'] ?? 0) > 0) {
        $spTraitRows = fetchAll($conn,
            'SELECT trait_id FROM ssmood_v2.gsmap_trait_summary WHERE sample_id = ?',
            'i', $sid
        );
        return [
            'has_gsmap_spatial'      => true,
            'has_gsmap_cauchy'       => false,
            'gsmap_spatial_rows'     => (int)$sr['n_rows'],
            'gsmap_spatial_traits'   => count($spTraitRows),
            'gsmap_spatial_spots'    => (int)($sr['n_spots'] ?? 0),
            'gsmap_cauchy_rows'      => 0,
            'gsmap_cauchy_traits'    => 0,
            'gsmap_cauchy_annotations' => 0
        ];
    }
    // 2. 汇总表未填充：仅查 cauchy（小表，安全）
    $caRow = fetchOne($conn, 'SELECT COUNT(*) AS n FROM gsmap_cauchy_score WHERE sample_id = ?', 'i', $sid);
    $caN = (int)($caRow['n'] ?? 0);
    $caAgg = $caN > 0 ? fetchOne($conn,
        'SELECT COUNT(DISTINCT trait_id) AS n_traits, COUNT(DISTINCT annotation) AS n_annot FROM gsmap_cauchy_score WHERE sample_id = ?',
        'i', $sid
    ) : null;
    return [
        'has_gsmap_spatial'          => false,  // 未知（需填充汇总表）
        'has_gsmap_cauchy'           => $caN > 0,
        'gsmap_spatial_rows'         => 0,
        'gsmap_spatial_traits'       => 0,
        'gsmap_spatial_spots'        => 0,
        'gsmap_cauchy_rows'          => $caN,
        'gsmap_cauchy_traits'        => (int)($caAgg['n_traits']  ?? 0),
        'gsmap_cauchy_annotations'   => (int)($caAgg['n_annot'] ?? 0),
        '_spatial_pending_fill'      => true
    ];
}


function scdrsRowsFromCompressedJson($blob, $limit = 0) {
    $raw = @zlib_decode($blob);
    if ($raw === false) {
        $raw = @gzdecode($blob);
    }
    if ($raw === false) {
        return [];
    }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return [];
    }

    $rows = [];
    foreach ($decoded as $idx => $row) {
        if ($limit > 0 && $idx >= $limit) {
            break;
        }
        if (is_array($row) && count($row) >= 2) {
            // row[0]: cell_id
            // row[1]: p-value or FDR (always positive, 0.01-0.08 range)
            // row[2]: z-score (can be negative, matches DB min_score/max_score)
            // row[6]: another statistic (can also be negative)
            // Use row[2] as the primary score for visualization
            $rows[] = [
                'i' => $row[0] ?? $idx,
                'score' => isset($row[2]) ? (float)$row[2] : (isset($row[1]) ? (float)$row[1] : null),
                'raw' => $row
            ];
        }
    }
    return $rows;
}
