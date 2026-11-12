<?php

function get_agent_skill_manifest($locale = 'zh') {
    return [
        ['name' => 'search_datasets', 'description' => 'Search compact ssMOOD datasets, samples, cohorts, or GWAS traits.', 'arguments' => ['omicsType' => 'SC|ST|ATAC|GWAS|string[] optional', 'species' => 'string optional', 'brainRegion' => 'string optional', 'condition' => 'string optional', 'keyword' => 'string optional', 'limit' => 'integer optional, 1-10']],
        ['name' => 'build_navigation_action', 'description' => 'Build a safe navigation action to a whitelisted ssMOOD page. Filters are applied by the AI via the search_datasets tool and shown as result cards; navigation links ONLY jump to a page and never carry filter query parameters (the list pages do not read them from the URL).', 'arguments' => ['target' => 'home|browse|single_cell|spatial|atac|gwas|download|string', 'omicsType' => 'SC|ST|ATAC|GWAS optional', 'species' => 'human|mouse optional', 'brainRegion' => 'string optional', 'condition' => 'string optional']],
        ['name' => 'get_current_page_context', 'description' => 'Return the sanitized current page context already provided by the frontend.', 'arguments' => []],
        ['name' => 'get_dataset_summary', 'description' => 'Get compact summary for one dataset/sample or GWAS trait.', 'arguments' => ['datasetId' => 'string required', 'omicsType' => 'SC|ST|ATAC|GWAS optional']],
        ['name' => 'get_platform_overview', 'description' => 'Return ssMOOD positioning, supported omics types, main analysis capabilities, and boundaries.', 'arguments' => []],
        ['name' => 'get_database_statistics', 'description' => 'Return real database statistics from ssMOOD tables.', 'arguments' => []],
        ['name' => 'get_database_update_info', 'description' => 'Return version, last update, data source summary, and statistics generation time.', 'arguments' => []],
        ['name' => 'search_genes', 'description' => 'Search genes in ssMOOD feature table.', 'arguments' => ['query' => 'string required', 'datasetId' => 'string optional', 'projectId' => 'integer optional', 'limit' => 'integer optional, 1-20']],
        ['name' => 'search_traits', 'description' => 'Search GWAS traits in trait_meta.', 'arguments' => ['query' => 'string optional', 'category' => 'string optional', 'limit' => 'integer optional, 1-20']],
        ['name' => 'get_gene_expression_summary', 'description' => 'Summarize expression availability and non-zero count for a gene in one dataset.', 'arguments' => ['datasetId' => 'string required', 'gene' => 'string required']],
        ['name' => 'compare_gene_expression', 'description' => 'Compare compact gene expression summaries across two datasets.', 'arguments' => ['datasetId' => 'string required', 'secondaryDatasetId' => 'string required', 'gene' => 'string required']],
        ['name' => 'get_deg_summary', 'description' => 'Return compact DEG summary for a dataset/cell type when precomputed DEG tables are available.', 'arguments' => ['datasetId' => 'string optional', 'cellType' => 'string optional', 'limit' => 'integer optional, 1-20']],
        ['name' => 'compare_deg_summary', 'description' => 'Compare compact DEG summaries across two datasets/cell types when available.', 'arguments' => ['datasetId' => 'string optional', 'secondaryDatasetId' => 'string optional', 'cellType' => 'string optional']],
        ['name' => 'get_enrichment_summary', 'description' => 'Return compact enrichment summary when enrichment tables are available.', 'arguments' => ['datasetId' => 'string optional', 'geneSet' => 'string optional', 'limit' => 'integer optional, 1-20']],
        ['name' => 'get_celltype_composition', 'description' => 'Return cell type or cluster composition for a dataset.', 'arguments' => ['datasetId' => 'string required']],
        ['name' => 'get_gwas_signal_summary', 'description' => 'Return compact GWAS signal/scDRS summary for a trait.', 'arguments' => ['traitId' => 'integer|string required', 'sex' => 'male|female optional']],
        ['name' => 'get_atac_peak_summary', 'description' => 'Return compact ATAC peak or differential accessibility summary.', 'arguments' => ['datasetId' => 'string optional', 'contrast' => 'string optional', 'cellType' => 'string optional', 'limit' => 'integer optional, 1-20']],
        ['name' => 'get_plot_data', 'description' => 'Query real compact data for a supported plot. Does not invent values.', 'arguments' => ['plotType' => 'volcano|bar|box|violin|scatter|heatmap|dot required', 'dataType' => 'deg|gene_expression|enrichment|cell_composition|gwas|atac required', 'datasetId' => 'string optional', 'secondaryDatasetId' => 'string optional', 'gene' => 'string optional', 'cellType' => 'string optional', 'traitId' => 'string optional', 'contrast' => 'string optional', 'limit' => 'integer optional']],
        ['name' => 'build_plot_action', 'description' => 'Build a Plotly action from real compact data returned by get_plot_data or directly queried data.', 'arguments' => ['plotType' => 'string required', 'dataType' => 'string required', 'datasetId' => 'string optional', 'gene' => 'string optional', 'cellType' => 'string optional', 'traitId' => 'string optional', 'contrast' => 'string optional', 'limit' => 'integer optional']],
        ['name' => 'web_search_literature', 'description' => 'External literature search. Returns structured degraded status when unavailable.', 'arguments' => ['query' => 'string required', 'limit' => 'integer optional']],
        ['name' => 'summarize_external_evidence', 'description' => 'Summarize provided external evidence without inventing sources.', 'arguments' => ['query' => 'string required', 'evidence' => 'array optional']],
        ['name' => 'combine_data_with_knowledge', 'description' => 'Combine ssMOOD skill results with external evidence, with explicit uncertainty.', 'arguments' => ['dataSummary' => 'object|string optional', 'evidenceSummary' => 'object|string optional']],
    ];
}

function execute_agent_skill($skillName, $arguments, $context, $locale = 'zh') {
    $skillName = agent_skill_sanitize_string($skillName, 80);
    $arguments = is_array($arguments) ? $arguments : [];
    $validation = validate_agent_skill_arguments($skillName, $arguments);
    if (!$validation['ok']) {
        return agent_skill_result($skillName, false, $arguments, null, [$validation['warning']], false);
    }
    $arguments = $validation['arguments'];

    switch ($skillName) {
        case 'search_datasets': return agent_skill_search_datasets($arguments, $locale);
        case 'build_navigation_action': return agent_skill_build_navigation_action($arguments, $locale);
        case 'get_current_page_context': return agent_skill_result($skillName, true, $arguments, $context, [], false);
        case 'get_dataset_summary': return agent_skill_get_dataset_summary($arguments);
        case 'get_platform_overview': return agent_skill_get_platform_overview($arguments);
        case 'get_database_statistics': return agent_skill_get_database_statistics($arguments);
        case 'get_database_update_info': return agent_skill_get_database_update_info($arguments);
        case 'search_genes': return agent_skill_search_genes($arguments);
        case 'search_traits': return agent_skill_search_traits($arguments);
        case 'get_gene_expression_summary': return agent_skill_get_gene_expression_summary($arguments);
        case 'compare_gene_expression': return agent_skill_compare_gene_expression($arguments);
        case 'get_deg_summary': return agent_skill_get_deg_summary($arguments);
        case 'compare_deg_summary': return agent_skill_compare_deg_summary($arguments);
        case 'get_enrichment_summary': return agent_skill_get_enrichment_summary($arguments);
        case 'get_celltype_composition': return agent_skill_get_celltype_composition($arguments);
        case 'get_gwas_signal_summary': return agent_skill_get_gwas_signal_summary($arguments);
        case 'get_atac_peak_summary': return agent_skill_get_atac_peak_summary($arguments);
        case 'get_plot_data': return agent_skill_get_plot_data($arguments);
        case 'build_plot_action': return agent_skill_build_plot_action($arguments, $locale);
        case 'web_search_literature': return agent_skill_external_unavailable($skillName, $arguments, 'unavailable');
        case 'summarize_external_evidence': return agent_skill_summarize_external_evidence($arguments);
        case 'combine_data_with_knowledge': return agent_skill_combine_data_with_knowledge($arguments);
        default: return agent_skill_result($skillName, false, $arguments, null, ['skill_not_whitelisted'], false);
    }
}

function validate_agent_skill_arguments($skillName, $arguments) {
    $names = array_map(function($skill) { return $skill['name']; }, get_agent_skill_manifest('en'));
    if (!in_array($skillName, $names, true)) {
        return ['ok' => false, 'warning' => 'skill_not_whitelisted', 'arguments' => []];
    }

    $args = [];
    foreach ($arguments as $key => $value) {
        $cleanKey = agent_skill_sanitize_string($key, 60);
        if ($cleanKey === '') continue;
        if (is_array($value)) {
            $args[$cleanKey] = agent_skill_sanitize_array($value, 40, 160);
        } elseif (is_scalar($value) || $value === null) {
            $args[$cleanKey] = agent_skill_sanitize_string($value ?? '', 240);
        }
    }

    foreach (['limit'] as $key) {
        if (isset($args[$key])) {
            $args[$key] = max(1, min((int)$args[$key], 50));
        }
    }

    $required = [
        'get_dataset_summary' => ['datasetId'],
        'search_genes' => ['query'],
        'get_gene_expression_summary' => ['datasetId', 'gene'],
        'compare_gene_expression' => ['datasetId', 'secondaryDatasetId', 'gene'],
        'get_celltype_composition' => ['datasetId'],
        'get_plot_data' => ['plotType', 'dataType'],
        'build_plot_action' => ['plotType', 'dataType'],
        'web_search_literature' => ['query'],
        'summarize_external_evidence' => ['query'],
    ];
    foreach ($required[$skillName] ?? [] as $key) {
        if (!isset($args[$key]) || $args[$key] === '' || $args[$key] === []) {
            return ['ok' => false, 'warning' => 'missing_argument:' . $key, 'arguments' => $args];
        }
    }

    if (isset($args['plotType']) && !in_array(strtolower($args['plotType']), ['volcano', 'bar', 'box', 'violin', 'scatter', 'heatmap', 'dot'], true)) {
        return ['ok' => false, 'warning' => 'invalid_plot_type', 'arguments' => $args];
    }
    if (isset($args['dataType']) && !in_array(strtolower($args['dataType']), ['deg', 'gene_expression', 'enrichment', 'cell_composition', 'gwas', 'atac'], true)) {
        return ['ok' => false, 'warning' => 'invalid_data_type', 'arguments' => $args];
    }
    return ['ok' => true, 'warning' => '', 'arguments' => $args];
}

function agent_skill_result($skill, $ok, $arguments, $result, $warnings = [], $truncated = false) {
    return [
        'ok' => (bool)$ok,
        'skill' => $skill,
        'arguments' => agent_skill_compact_value($arguments, 12000),
        'result' => agent_skill_compact_value($result, 60000),
        'warnings' => array_values(array_unique(array_filter($warnings))),
        'truncated' => (bool)$truncated,
    ];
}

function agent_skill_db() {
    global $servername, $username, $password, $dbname;
    if (empty($servername) || empty($username) || empty($dbname)) {
        if (!is_readable('/etc/ssmood/db.php')) return null;
        require_once __DIR__ . '/config.php';
    }
    if (empty($servername) || empty($username) || empty($dbname)) return null;
    $conn = @mysqli_connect($servername, $username, $password, $dbname);
    if (!$conn || mysqli_connect_errno()) return null;
    mysqli_set_charset($conn, 'utf8mb4');
    return $conn;
}

function agent_skill_rows($conn, $sql, $types = '', ...$params) {
    try {
        $stmt = $conn->prepare($sql);
        if (!$stmt) return [];
        if ($types !== '') $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $result = $stmt->get_result();
        $rows = [];
        if ($result) while ($row = $result->fetch_assoc()) $rows[] = $row;
        $stmt->close();
        return $rows;
    } catch (Throwable $e) {
        return [];
    }
}

function agent_skill_one($conn, $sql, $types = '', ...$params) {
    $rows = agent_skill_rows($conn, $sql, $types, ...$params);
    return $rows[0] ?? null;
}

function agent_skill_table_exists($conn, $table) {
    try {
        $row = agent_skill_one(
            $conn,
            'SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1',
            's',
            $table
        );
        return $row && (int)$row['n'] > 0;
    } catch (Throwable $e) {
        return false;
    }
}

function agent_skill_search_datasets($args, $locale) {
    $conn = agent_skill_db();
    if (!$conn) return agent_skill_result('search_datasets', false, $args, ['items' => []], ['database_unavailable'], false);
    $limit = max(1, min((int)($args['limit'] ?? 8), 10));
    $args = agent_skill_normalize_dataset_search_args($args);
    $types = agent_skill_normalize_omics($args['omicsType'] ?? ($args['omics'] ?? []));
    if (!$types) $types = ['SC', 'ST', 'ATAC', 'GWAS'];
    $keywords = agent_skill_keywords($args, ['species', 'brainRegion', 'condition', 'keyword', 'trait', 'gene', 'datasetId']);
    $all = [];
    foreach ($types as $type) {
        if ($type === 'SC') $all = array_merge($all, agent_skill_sample_rows($conn, 'SC', 0, [1, 2]));
        if ($type === 'ST') $all = array_merge($all, agent_skill_sample_rows($conn, 'ST', 1, [3, 4]));
        if ($type === 'ATAC') $all = array_merge($all, agent_skill_sample_rows($conn, 'ATAC', null, [14]));
        if ($type === 'GWAS') $all = array_merge($all, agent_skill_trait_rows($conn));
    }
    $conn->close();
    $ranked = [];
    foreach ($all as $row) {
        $score = agent_skill_score_row($row, $keywords);
        if ($keywords && $score <= 0) continue;
        $row['_score'] = $score;
        $ranked[] = $row;
    }
    usort($ranked, function($a, $b) { return ($b['_score'] <=> $a['_score']) ?: strcmp($a['label'], $b['label']); });
    $items = array_slice($ranked, 0, $limit);
    $actions = [];
    foreach ($items as $item) $actions[] = agent_skill_dataset_action($item, $locale);
    return agent_skill_result('search_datasets', true, $args, [
        'resultCount' => count($items),
        'items' => array_map('agent_skill_compact_dataset', $items),
        'actions' => $actions,
    ], [count($items) ? 'skill_result:search_datasets' : 'skill_empty:search_datasets'], count($ranked) > $limit);
}

function agent_skill_sample_rows($conn, $type, $isSpatial, $projectIds) {
    $ph = implode(',', array_fill(0, count($projectIds), '?'));
    $types = str_repeat('i', count($projectIds));
    $params = $projectIds;
    $whereSpatial = '';
    if ($isSpatial !== null) { $whereSpatial = ' AND s.is_spatial = ?'; $types .= 'i'; $params[] = (int)$isSpatial; }
    $rows = agent_skill_rows($conn, 'SELECT s.sample_id, s.sample_name, s.`condition`, s.tissue, s.sex, s.age, s.n_cells, p.species, p.technology FROM sample s JOIN project p ON s.project_id = p.project_id WHERE s.project_id IN (' . $ph . ')' . $whereSpatial . ' ORDER BY s.project_id, s.sample_id LIMIT 300', $types, ...$params);
    $out = [];
    foreach ($rows as $row) {
        $datasetId = $type === 'ATAC' ? (string)$row['sample_id'] : $row['sample_name'];
        $routeBase = $type === 'SC' ? '/browse/SingleCell/' : ($type === 'ST' ? '/browse/SpatialTranscriptome/' : '/browse/atac/');
        $out[] = ['omicsType' => $type, 'datasetId' => $datasetId, 'label' => $row['sample_name'], 'name' => $row['sample_name'], 'species' => $row['species'], 'condition' => $row['condition'], 'brainRegion' => $row['tissue'], 'cells' => $row['n_cells'], 'technology' => $row['technology'], 'route' => $routeBase . rawurlencode($datasetId)];
    }
    return $out;
}

function agent_skill_trait_rows($conn) {
    if (!agent_skill_table_exists($conn, 'trait_meta')) return [];
    $rows = agent_skill_rows($conn, 'SELECT trait_id, abbreviation, full_name, chinese_name, category, sample_size, ancestry, is_depression_related FROM trait_meta ORDER BY is_depression_related DESC, abbreviation LIMIT 120');
    $out = [];
    foreach ($rows as $row) {
        $label = $row['abbreviation'] ?: ($row['chinese_name'] ?: $row['full_name']);
        $out[] = ['omicsType' => 'GWAS', 'datasetId' => (string)$row['trait_id'], 'traitId' => (string)$row['trait_id'], 'label' => $label, 'name' => $row['chinese_name'] ?: $row['full_name'], 'category' => $row['category'], 'condition' => ((int)$row['is_depression_related'] === 1) ? 'MDD-related' : '', 'sampleSize' => $row['sample_size'], 'ancestry' => $row['ancestry'], 'route' => '/browse/gwas/' . rawurlencode((string)$row['trait_id'])];
    }
    return $out;
}

function agent_skill_build_navigation_action($args, $locale) {
    $args = agent_skill_normalize_dataset_search_args($args);
    $target = strtolower(agent_skill_sanitize_string($args['target'] ?? ($args['page'] ?? ($args['omicsType'] ?? '')), 80));
    $routes = ['singlecell' => ['/browse/SingleCell', 'Single Cell'], 'single_cell' => ['/browse/SingleCell', 'Single Cell'], 'sc' => ['/browse/SingleCell', 'Single Cell'], 'spatial' => ['/browse/SpatialTranscriptome', 'Spatial Transcriptome'], 'st' => ['/browse/SpatialTranscriptome', 'Spatial Transcriptome'], 'atac' => ['/browse/atac', 'ATAC'], 'gwas' => ['/browse/gwas', 'GWAS'], 'download' => ['/about/download', 'Download'], 'browse' => ['/browse', 'Browse'], 'home' => ['/', 'Home']];
    foreach ($routes as $key => $meta) {
        if ($target === $key || strpos($target, $key) !== false) {
            $route = agent_skill_route_with_filters($meta[0], $args);
            $label = agent_skill_navigation_label($meta[1], $args, $locale);
            return agent_skill_result('build_navigation_action', true, $args, ['actions' => [['type' => 'navigate', 'label' => $label, 'route' => $route]]], ['skill_result:build_navigation_action'], false);
        }
    }
    return agent_skill_result('build_navigation_action', false, $args, ['actions' => []], ['unknown_navigation_target'], false);
}

function agent_skill_get_dataset_summary($args) {
    $conn = agent_skill_db();
    if (!$conn) return agent_skill_result('get_dataset_summary', false, $args, null, ['database_unavailable'], false);
    $datasetId = $args['datasetId'];
    $omics = strtoupper($args['omicsType'] ?? '');
    if ($omics === 'GWAS' || ctype_digit((string)$datasetId)) {
        $trait = agent_skill_one($conn, 'SELECT trait_id, abbreviation, full_name, chinese_name, category, sample_size, ancestry, pub_year, study, is_depression_related FROM trait_meta WHERE trait_id = ? OR abbreviation = ? LIMIT 1', 'is', (int)$datasetId, (string)$datasetId);
        if ($trait) { $conn->close(); return agent_skill_result('get_dataset_summary', true, $args, ['type' => 'GWAS', 'trait' => $trait], [], false); }
    }
    $sample = agent_skill_resolve_sample($conn, $datasetId);
    if (!$sample) { $conn->close(); return agent_skill_result('get_dataset_summary', false, $args, null, ['dataset_not_found'], false); }
    $clusters = agent_skill_rows($conn, 'SELECT COALESCE(cluster_label2, cell_type, "Unknown") AS label, COUNT(*) AS n FROM cell FORCE INDEX (idx_sample_id) WHERE sample_id = ? GROUP BY COALESCE(cluster_label2, cell_type, "Unknown") ORDER BY n DESC LIMIT 12', 'i', (int)$sample['sample_id']);
    $conn->close();
    return agent_skill_result('get_dataset_summary', true, $args, ['sample' => $sample, 'topCellTypes' => $clusters], [], false);
}

function agent_skill_get_platform_overview($args) {
    return agent_skill_result('get_platform_overview', true, $args, [
        'positioning' => 'ssMOOD is an academic multi-omics database focused on major depressive disorder and related brain biology research.',
        'omicsTypes' => ['single-cell transcriptomics', 'spatial transcriptomics', 'single-cell ATAC/chromatin accessibility', 'GWAS/scDRS related resources'],
        'capabilities' => ['dataset browsing', 'gene expression visualization', 'cell type or cluster exploration', 'DEG and enrichment interpretation when precomputed data exists', 'ATAC peak and differential accessibility browsing', 'GWAS trait and scDRS result browsing'],
        'boundaries' => ['not a clinical diagnosis system', 'does not invent missing database values', 'large raw matrices are not sent to the AI prompt'],
    ], [], false);
}

function agent_skill_get_database_statistics($args) {
    $conn = agent_skill_db();
    if (!$conn) return agent_skill_result('get_database_statistics', false, $args, null, ['database_unavailable'], false);

    $dashboard = agent_skill_dashboard_summary($conn);
    $gwas = agent_skill_table_exists($conn, 'trait_meta') ? agent_skill_count($conn, 'SELECT COUNT(*) AS n FROM trait_meta') : null;
    $species = agent_skill_rows($conn, 'SELECT p.species, COUNT(*) AS n FROM sample s JOIN project p ON s.project_id = p.project_id GROUP BY p.species ORDER BY n DESC LIMIT 20');
    $brain = agent_skill_rows($conn, 'SELECT tissue AS brainRegion, COUNT(*) AS n FROM sample WHERE tissue IS NOT NULL AND tissue <> "" GROUP BY tissue ORDER BY n DESC LIMIT 30');
    $condition = agent_skill_rows($conn, 'SELECT `condition`, COUNT(*) AS n FROM sample WHERE `condition` IS NOT NULL AND `condition` <> "" GROUP BY `condition` ORDER BY n DESC LIMIT 30');

    if ($dashboard) {
        $sc = agent_skill_count($conn, 'SELECT COUNT(*) AS n FROM sample WHERE is_spatial = 0 AND project_id IN (1,2)');
        $st = agent_skill_count($conn, 'SELECT COUNT(*) AS n FROM sample WHERE is_spatial = 1 AND project_id IN (3,4)');
        $atac = agent_skill_count($conn, 'SELECT COUNT(*) AS n FROM sample WHERE project_id = 14');
        $conn->close();
        return agent_skill_result('get_database_statistics', true, $args, [
            'source' => 'dashboard_summary',
            'datasetTotal' => (int)$dashboard['n_datasets'],
            'singleCellDatasets' => $sc,
            'spatialTranscriptomeDatasets' => $st,
            'atacDatasets' => $atac,
            'gwasTraits' => $gwas === null ? 'unknown' : $gwas,
            'singleCellCells' => (int)$dashboard['n_sc_cells'],
            'spatialTranscriptomeCells' => (int)$dashboard['n_st_cells'],
            'genes' => (int)$dashboard['n_genes'],
            'speciesDistribution' => $species,
            'brainRegionDistribution' => $brain,
            'conditionDistribution' => $condition,
            'generatedAt' => gmdate('c'),
        ], ['statistics_source:dashboard_summary'], false);
    }

    $sc = agent_skill_count($conn, 'SELECT COUNT(*) AS n FROM sample WHERE is_spatial = 0 AND project_id IN (1,2)');
    $st = agent_skill_count($conn, 'SELECT COUNT(*) AS n FROM sample WHERE is_spatial = 1 AND project_id IN (3,4)');
    $atac = agent_skill_count($conn, 'SELECT COUNT(*) AS n FROM sample WHERE project_id = 14');
    $conn->close();
    $datasetTotal = (int)$sc + (int)$st + (int)$atac + (is_numeric($gwas) ? (int)$gwas : 0);
    return agent_skill_result('get_database_statistics', true, $args, ['source' => 'realtime_fallback', 'datasetTotal' => $datasetTotal, 'singleCellDatasets' => $sc, 'spatialTranscriptomeDatasets' => $st, 'atacDatasets' => $atac, 'gwasTraits' => $gwas === null ? 'unknown' : $gwas, 'speciesDistribution' => $species, 'brainRegionDistribution' => $brain, 'conditionDistribution' => $condition, 'generatedAt' => gmdate('c')], ['statistics_source:realtime_fallback'], false);
}

function agent_skill_dashboard_summary($conn) {
    if (!agent_skill_table_exists($conn, 'dashboard_summary')) return null;
    $row = agent_skill_one($conn, 'SELECT n_sc_cells, n_datasets, n_genes, n_st_cells FROM dashboard_summary WHERE id = 1 LIMIT 1');
    return $row ?: null;
}

function agent_skill_get_database_update_info($args) {
    $version = agent_skill_file_text(__DIR__ . '/../VERSION');
    $last = agent_skill_file_text(__DIR__ . '/../LASTCOMMITDATETIME');
    $hash = agent_skill_file_text(__DIR__ . '/../COMMITHASH');
    return agent_skill_result('get_database_update_info', true, $args, ['version' => $version ?: 'unknown', 'lastUpdate' => $last ?: 'unknown', 'commitHash' => $hash ?: 'unknown', 'dataSourceSummary' => 'Integrated ssMOOD backend database tables and deployed project metadata files when available.', 'generatedAt' => gmdate('c')], [], false);
}

function agent_skill_search_genes($args) {
    $conn = agent_skill_db();
    if (!$conn) return agent_skill_result('search_genes', false, $args, ['items' => []], ['database_unavailable'], false);
    $query = $args['query'];
    $limit = max(1, min((int)($args['limit'] ?? 12), 20));
    $projectId = isset($args['projectId']) && $args['projectId'] !== '' ? (int)$args['projectId'] : null;
    if (!$projectId && !empty($args['datasetId'])) { $sample = agent_skill_resolve_sample($conn, $args['datasetId']); $projectId = $sample ? (int)$sample['project_id'] : null; }
    if ($projectId) {
        $rows = agent_skill_rows($conn, 'SELECT DISTINCT feature_name FROM feature WHERE project_id = ? AND feature_type = "gene" AND feature_name LIKE ? ORDER BY feature_name LIMIT ' . $limit, 'is', $projectId, '%' . $query . '%');
    } else {
        $rows = agent_skill_rows($conn, 'SELECT DISTINCT feature_name FROM feature WHERE feature_type = "gene" AND feature_name LIKE ? ORDER BY feature_name LIMIT ' . $limit, 's', '%' . $query . '%');
    }
    $conn->close();
    return agent_skill_result('search_genes', true, $args, ['items' => array_map(function($r) { return $r['feature_name']; }, $rows), 'resultCount' => count($rows)], [count($rows) ? 'skill_result:search_genes' : 'skill_empty:search_genes'], count($rows) >= $limit);
}

function agent_skill_search_traits($args) {
    $conn = agent_skill_db();
    if (!$conn) return agent_skill_result('search_traits', false, $args, ['items' => []], ['database_unavailable'], false);
    $limit = max(1, min((int)($args['limit'] ?? 12), 20));
    $query = $args['query'] ?? '';
    $category = $args['category'] ?? '';
    $where = []; $types = ''; $params = [];
    if ($query !== '') { $where[] = '(abbreviation LIKE ? OR full_name LIKE ? OR chinese_name LIKE ?)'; $types .= 'sss'; $like = '%' . $query . '%'; $params[] = $like; $params[] = $like; $params[] = $like; }
    if ($category !== '') { $where[] = 'category = ?'; $types .= 's'; $params[] = $category; }
    $sql = 'SELECT trait_id, abbreviation, full_name, chinese_name, category, sample_size, ancestry FROM trait_meta' . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY abbreviation LIMIT ' . $limit;
    $rows = $params ? agent_skill_rows($conn, $sql, $types, ...$params) : agent_skill_rows($conn, $sql);
    $conn->close();
    return agent_skill_result('search_traits', true, $args, ['items' => $rows, 'resultCount' => count($rows)], [count($rows) ? 'skill_result:search_traits' : 'skill_empty:search_traits'], count($rows) >= $limit);
}

function agent_skill_get_gene_expression_summary($args) {
    $conn = agent_skill_db();
    if (!$conn) return agent_skill_result('get_gene_expression_summary', false, $args, null, ['database_unavailable'], false);
    $sample = agent_skill_resolve_sample($conn, $args['datasetId']);
    if (!$sample) { $conn->close(); return agent_skill_result('get_gene_expression_summary', false, $args, null, ['dataset_not_found'], false); }
    $feature = agent_skill_one($conn, 'SELECT feature_id, feature_name FROM feature WHERE project_id = ? AND feature_type = "gene" AND feature_name = ? LIMIT 1', 'is', (int)$sample['project_id'], $args['gene']);
    if (!$feature) { $conn->close(); return agent_skill_result('get_gene_expression_summary', false, $args, null, ['gene_not_found'], false); }
    $expr = agent_skill_one($conn, 'SELECT expression_type, non_zero_count, min_val, max_val FROM expression_gene WHERE sample_id = ? AND feature_id = ? ORDER BY expression_type = "log1p_norm" DESC LIMIT 1', 'ii', (int)$sample['sample_id'], (int)$feature['feature_id']);
    $cellCount = agent_skill_count($conn, 'SELECT COUNT(*) AS n FROM cell WHERE sample_id = ' . (int)$sample['sample_id']);
    $conn->close();
    return agent_skill_result('get_gene_expression_summary', (bool)$expr, $args, ['dataset' => $sample['sample_name'], 'gene' => $feature['feature_name'], 'expressionType' => $expr['expression_type'] ?? null, 'nonzeroCount' => isset($expr['non_zero_count']) ? (int)$expr['non_zero_count'] : null, 'cellCount' => $cellCount, 'summaryStats' => $expr ? ['min' => isset($expr['min_val']) ? (float)$expr['min_val'] : null, 'max' => isset($expr['max_val']) ? (float)$expr['max_val'] : null] : null], $expr ? [] : ['expression_not_found'], false);
}

function agent_skill_compare_gene_expression($args) {
    $a = agent_skill_get_gene_expression_summary(['datasetId' => $args['datasetId'], 'gene' => $args['gene']]);
    $b = agent_skill_get_gene_expression_summary(['datasetId' => $args['secondaryDatasetId'], 'gene' => $args['gene']]);
    return agent_skill_result('compare_gene_expression', $a['ok'] || $b['ok'], $args, ['primary' => $a['result'], 'secondary' => $b['result']], array_merge($a['warnings'], $b['warnings']), false);
}

function agent_skill_get_deg_summary($args) {
    $conn = agent_skill_db();
    if (!$conn) return agent_skill_result('get_deg_summary', false, $args, null, ['database_unavailable'], false);
    if (!agent_skill_table_exists($conn, 'deg_result') && !agent_skill_table_exists($conn, 'deg_binary')) { $conn->close(); return agent_skill_result('get_deg_summary', false, $args, null, ['deg_table_unavailable'], false); }
    $limit = max(1, min((int)($args['limit'] ?? 10), 20));
    if (agent_skill_table_exists($conn, 'deg_result')) {
        $rows = agent_skill_rows($conn, 'SELECT * FROM deg_result LIMIT ' . $limit);
    } else {
        $cellType = $args['cellType'] ?? '';
        $rows = $cellType !== '' ? agent_skill_rows($conn, 'SELECT gene_name, cell_type, deg_category FROM deg_binary WHERE cell_type = ? LIMIT ' . $limit, 's', $cellType) : agent_skill_rows($conn, 'SELECT gene_name, cell_type, deg_category FROM deg_binary LIMIT ' . $limit);
    }
    $conn->close();
    return agent_skill_result('get_deg_summary', true, $args, ['items' => $rows, 'resultCount' => count($rows)], [count($rows) ? 'skill_result:get_deg_summary' : 'skill_empty:get_deg_summary'], count($rows) >= $limit);
}

function agent_skill_compare_deg_summary($args) {
    $primary = agent_skill_get_deg_summary(['datasetId' => $args['datasetId'] ?? '', 'cellType' => $args['cellType'] ?? '', 'limit' => 8]);
    $secondary = !empty($args['secondaryDatasetId']) ? agent_skill_get_deg_summary(['datasetId' => $args['secondaryDatasetId'], 'cellType' => $args['cellType'] ?? '', 'limit' => 8]) : null;
    return agent_skill_result('compare_deg_summary', $primary['ok'] || ($secondary && $secondary['ok']), $args, ['primary' => $primary['result'], 'secondary' => $secondary['result'] ?? null], array_merge($primary['warnings'], $secondary['warnings'] ?? []), false);
}

function agent_skill_get_enrichment_summary($args) {
    return agent_skill_result('get_enrichment_summary', false, $args, null, ['enrichment_summary_table_not_confirmed'], false);
}

function agent_skill_get_celltype_composition($args) {
    $conn = agent_skill_db();
    if (!$conn) return agent_skill_result('get_celltype_composition', false, $args, null, ['database_unavailable'], false);
    $sample = agent_skill_resolve_sample($conn, $args['datasetId']);
    if (!$sample) { $conn->close(); return agent_skill_result('get_celltype_composition', false, $args, null, ['dataset_not_found'], false); }
    $rows = agent_skill_rows($conn, 'SELECT COALESCE(cluster_label2, cell_type, "Unknown") AS cellType, COUNT(*) AS count FROM cell FORCE INDEX (idx_sample_id) WHERE sample_id = ? GROUP BY COALESCE(cluster_label2, cell_type, "Unknown") ORDER BY count DESC LIMIT 50', 'i', (int)$sample['sample_id']);
    $conn->close();
    return agent_skill_result('get_celltype_composition', true, $args, ['dataset' => $sample['sample_name'], 'items' => $rows, 'resultCount' => count($rows)], [], count($rows) >= 50);
}

function agent_skill_get_gwas_signal_summary($args) {
    $conn = agent_skill_db();
    if (!$conn) return agent_skill_result('get_gwas_signal_summary', false, $args, null, ['database_unavailable'], false);
    $traitId = (int)($args['traitId'] ?? $args['datasetId'] ?? 0);
    $trait = agent_skill_one($conn, 'SELECT trait_id, abbreviation, full_name, chinese_name, category FROM trait_meta WHERE trait_id = ? LIMIT 1', 'i', $traitId);
    $enrich = agent_skill_table_exists($conn, 'scdrs_enrichment') ? agent_skill_rows($conn, 'SELECT dimension, cell_group, assoc_mcp, n_sig FROM scdrs_enrichment WHERE trait_id = ? ORDER BY assoc_mcp ASC LIMIT 12', 'i', $traitId) : [];
    $signals = agent_skill_table_exists($conn, 'gwas_signal') ? agent_skill_count($conn, 'SELECT COUNT(*) AS n FROM gwas_signal WHERE trait_id = ' . $traitId) : null;
    $conn->close();
    return agent_skill_result('get_gwas_signal_summary', (bool)$trait, $args, ['trait' => $trait, 'topEnrichment' => $enrich, 'gwasSignalCount' => $signals], $trait ? [] : ['trait_not_found'], false);
}

function agent_skill_get_atac_peak_summary($args) {
    $conn = agent_skill_db();
    if (!$conn) return agent_skill_result('get_atac_peak_summary', false, $args, null, ['database_unavailable'], false);
    $limit = max(1, min((int)($args['limit'] ?? 10), 20));
    $result = [];
    $warnings = [];
    if (!empty($args['datasetId'])) {
        $sample = agent_skill_resolve_sample($conn, $args['datasetId']);
        if ($sample) {
            $count = agent_skill_count($conn, 'SELECT COUNT(*) AS n FROM expression_peak WHERE sample_id = ' . (int)$sample['sample_id']);
            $result['datasetPeakRows'] = $count;
            $result['sample'] = $sample;
        } else $warnings[] = 'dataset_not_found';
    }
    if (agent_skill_table_exists($conn, 'differential_peak_result')) {
        $rows = agent_skill_rows($conn, 'SELECT contrast, cell_type, peak_name, log2fc, pvalue, padj FROM differential_peak_result ORDER BY padj ASC LIMIT ' . $limit);
        $result['differentialPeaks'] = $rows;
    } else $warnings[] = 'differential_peak_table_unavailable';
    $conn->close();
    return agent_skill_result('get_atac_peak_summary', true, $args, $result, $warnings, false);
}

function agent_skill_get_plot_data($args) {
    $dataType = strtolower($args['dataType']);
    if ($dataType === 'cell_composition') return agent_skill_get_celltype_composition(['datasetId' => $args['datasetId'] ?? '']);
    if ($dataType === 'gene_expression') return agent_skill_get_gene_expression_summary(['datasetId' => $args['datasetId'] ?? '', 'gene' => $args['gene'] ?? ($args['selectedGene'] ?? '')]);
    if ($dataType === 'deg') return agent_skill_get_deg_summary($args);
    if ($dataType === 'gwas') return agent_skill_get_gwas_signal_summary($args);
    if ($dataType === 'atac') return agent_skill_get_atac_peak_summary($args);
    if ($dataType === 'enrichment') return agent_skill_get_enrichment_summary($args);
    return agent_skill_result('get_plot_data', false, $args, null, ['unsupported_plot_data_type'], false);
}

function agent_skill_build_plot_action($args, $locale) {
    $plotData = agent_skill_get_plot_data($args);
    if (!$plotData['ok']) return agent_skill_result('build_plot_action', false, $args, ['actions' => []], $plotData['warnings'], false);
    $payload = agent_skill_plotly_payload(strtolower($args['plotType']), strtolower($args['dataType']), $plotData['result'], $args);
    if (!$payload) return agent_skill_result('build_plot_action', false, $args, ['actions' => []], ['plot_payload_unavailable'], false);
    $title = agent_skill_plot_title($args);
    $action = ['type' => 'plot', 'label' => agent_skill_is_zh($locale) ? '查看图表' : 'View plot', 'title' => $title, 'description' => agent_skill_sanitize_string(json_encode($args, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), 180), 'payload' => $payload, 'warnings' => $plotData['warnings']];
    return agent_skill_result('build_plot_action', true, $args, ['actions' => [$action], 'sourceData' => $plotData['result']], $plotData['warnings'], $plotData['truncated']);
}

function agent_skill_plotly_payload($plotType, $dataType, $result, $args) {
    if ($dataType === 'cell_composition' && !empty($result['items'])) {
        $labels = array_map(function($r) { return $r['cellType']; }, $result['items']);
        $values = array_map(function($r) { return (int)$r['count']; }, $result['items']);
        return ['data' => [['type' => $plotType === 'bar' ? 'bar' : 'pie', 'x' => $labels, 'y' => $values, 'labels' => $labels, 'values' => $values]], 'layout' => ['title' => 'Cell type composition'], 'config' => ['responsive' => true]];
    }
    if ($dataType === 'gene_expression' && is_array($result)) {
        return ['data' => [['type' => 'bar', 'x' => ['nonzero', 'total'], 'y' => [(int)($result['nonzeroCount'] ?? 0), (int)($result['cellCount'] ?? 0)], 'name' => $result['gene'] ?? ($args['gene'] ?? 'gene')]], 'layout' => ['title' => 'Gene expression summary'], 'config' => ['responsive' => true]];
    }
    if (($dataType === 'deg' || $dataType === 'atac') && !empty($result['items'])) {
        return ['data' => [['type' => 'bar', 'x' => array_map(function($r) { return $r['gene_name'] ?? $r['peak_name'] ?? $r['cell_type'] ?? 'item'; }, $result['items']), 'y' => array_map(function($r) { return isset($r['log2fc']) ? (float)$r['log2fc'] : 1; }, $result['items'])]], 'layout' => ['title' => strtoupper($dataType) . ' summary'], 'config' => ['responsive' => true]];
    }
    if ($dataType === 'atac' && !empty($result['differentialPeaks'])) {
        return ['data' => [['type' => 'scatter', 'mode' => 'markers', 'x' => array_map(function($r) { return (float)$r['log2fc']; }, $result['differentialPeaks']), 'y' => array_map(function($r) { return -(log10(max((float)$r['padj'], 1e-300))); }, $result['differentialPeaks']), 'text' => array_map(function($r) { return $r['peak_name']; }, $result['differentialPeaks'])]], 'layout' => ['title' => 'ATAC differential peak volcano', 'xaxis' => ['title' => 'log2FC'], 'yaxis' => ['title' => '-log10(padj)']], 'config' => ['responsive' => true]];
    }
    if ($dataType === 'gwas' && !empty($result['topEnrichment'])) {
        return ['data' => [['type' => 'bar', 'x' => array_map(function($r) { return $r['cell_group']; }, $result['topEnrichment']), 'y' => array_map(function($r) { return isset($r['assoc_mcp']) ? -(log10(max((float)$r['assoc_mcp'], 1e-300))) : 0; }, $result['topEnrichment'])]], 'layout' => ['title' => 'GWAS scDRS enrichment', 'yaxis' => ['title' => '-log10(assoc_mcp)']], 'config' => ['responsive' => true]];
    }
    return null;
}

function agent_skill_external_unavailable($skill, $args, $errorType) {
    return agent_skill_result($skill, false, $args, ['errorType' => $errorType, 'items' => []], ['external_knowledge_' . $errorType], false);
}

function agent_skill_summarize_external_evidence($args) {
    $evidence = is_array($args['evidence'] ?? null) ? $args['evidence'] : [];
    if (!$evidence) return agent_skill_result('summarize_external_evidence', false, $args, ['errorType' => 'no_results', 'summary' => ''], ['no_external_evidence'], false);
    return agent_skill_result('summarize_external_evidence', true, $args, ['summary' => 'External evidence was provided by the caller and should be interpreted cautiously.', 'evidenceCount' => count($evidence)], [], false);
}

function agent_skill_combine_data_with_knowledge($args) {
    return agent_skill_result('combine_data_with_knowledge', true, $args, ['combinedSummary' => 'Use ssMOOD data as primary evidence and external knowledge only as contextual support. Missing external evidence should not change database facts.'], [], false);
}

function agent_skill_resolve_sample($conn, $id) {
    if ($id === '') return null;
    if (is_numeric($id)) {
        $row = agent_skill_one($conn, 'SELECT s.sample_id, s.sample_name, s.project_id, s.is_spatial, s.`condition`, s.tissue, s.sex, s.age, s.n_cells, p.species, p.technology FROM sample s JOIN project p ON s.project_id = p.project_id WHERE s.sample_id = ? LIMIT 1', 'i', (int)$id);
        if ($row) return $row;
    }
    $row = agent_skill_one($conn, 'SELECT s.sample_id, s.sample_name, s.project_id, s.is_spatial, s.`condition`, s.tissue, s.sex, s.age, s.n_cells, p.species, p.technology FROM sample s JOIN project p ON s.project_id = p.project_id WHERE s.sample_name = ? LIMIT 1', 's', (string)$id);
    if ($row) return $row;
    return null;
}

function agent_skill_count($conn, $sql) { $row = agent_skill_one($conn, $sql); return $row ? (int)$row['n'] : 0; }
function agent_skill_file_text($path) { return is_readable($path) ? trim((string)file_get_contents($path)) : ''; }
function agent_skill_is_zh($locale) { return stripos($locale, 'zh') === 0; }
function agent_skill_route_with_filters($route, $args) {
    $query = [];
    foreach (['species', 'brainRegion', 'condition'] as $key) {
        if (!empty($args[$key])) $query[$key] = agent_skill_sanitize_string($args[$key], 80);
    }
    if (!$query) return $route;
    return $route . '?' . http_build_query($query);
}

function agent_skill_navigation_label($baseLabel, $args, $locale) {
    $isZh = agent_skill_is_zh($locale);
    $species = strtolower(agent_skill_sanitize_string($args['species'] ?? '', 40));
    $speciesLabel = '';
    if ($species === 'mouse') $speciesLabel = $isZh ? '小鼠' : 'mouse ';
    if ($species === 'human') $speciesLabel = $isZh ? '人类' : 'human ';
    if ($isZh) {
        $labelMap = ['Single Cell' => '单细胞', 'Spatial Transcriptome' => '空间转录组', 'Download' => '下载', 'Browse' => '浏览', 'Home' => '首页'];
        return '打开' . $speciesLabel . ($labelMap[$baseLabel] ?? $baseLabel) . '数据';
    }
    return 'Open ' . $speciesLabel . $baseLabel . ' data';
}

function agent_skill_normalize_dataset_search_args($args) {
    foreach (['species', 'keyword', 'target', 'page', 'omicsType'] as $key) {
        if (!isset($args[$key])) continue;
        $value = strtolower(agent_skill_sanitize_string($args[$key], 120));
        if (strpos($value, '小鼠') !== false || strpos($value, '鼠') !== false || strpos($value, 'mouse') !== false || strpos($value, 'murine') !== false) $args['species'] = 'mouse';
        if (strpos($value, '人类') !== false || strpos($value, '人源') !== false || strpos($value, 'human') !== false) $args['species'] = 'human';
    }
    if (!empty($args['keyword'])) {
        $keyword = strtolower(agent_skill_sanitize_string($args['keyword'], 160));
        if (strpos($keyword, '单细胞') !== false || strpos($keyword, 'single cell') !== false || strpos($keyword, 'single-cell') !== false) $args['omicsType'] = 'SC';
        if (strpos($keyword, '空间转录组') !== false || strpos($keyword, '空间') !== false || strpos($keyword, 'spatial') !== false) $args['omicsType'] = 'ST';
        if (strpos($keyword, 'atac') !== false || strpos($keyword, '染色质') !== false) $args['omicsType'] = 'ATAC';
        if (strpos($keyword, 'gwas') !== false) $args['omicsType'] = 'GWAS';
    }
    return $args;
}
function agent_skill_sanitize_string($value, $maxLen) { $value = is_scalar($value) ? trim((string)$value) : ''; return function_exists('mb_substr') ? mb_substr($value, 0, $maxLen, 'UTF-8') : substr($value, 0, $maxLen); }
function agent_skill_sanitize_array($value, $maxItems, $maxLen) { $out = []; foreach ($value as $item) { if (is_scalar($item) || $item === null) $out[] = agent_skill_sanitize_string($item ?? '', $maxLen); if (count($out) >= $maxItems) break; } return $out; }
function agent_skill_normalize_omics($raw) { if (!is_array($raw)) $raw = [$raw]; $out = []; foreach ($raw as $type) { $t = strtolower(agent_skill_sanitize_string($type, 40)); if (in_array($t, ['sc', 'single_cell', 'single-cell', 'single cell'], true)) $out[] = 'SC'; if (in_array($t, ['st', 'spatial', 'spatial_transcriptome', 'spatial transcriptome'], true)) $out[] = 'ST'; if ($t === 'atac') $out[] = 'ATAC'; if ($t === 'gwas') $out[] = 'GWAS'; } return array_values(array_unique($out)); }
function agent_skill_keywords($args, $keys) { $out = []; foreach ($keys as $key) { if (!isset($args[$key])) continue; $vals = is_array($args[$key]) ? $args[$key] : [$args[$key]]; foreach ($vals as $value) { $clean = strtolower(agent_skill_sanitize_string($value, 100)); if ($clean !== '') $out[] = $clean; } } return array_values(array_unique($out)); }
function agent_skill_score_row($row, $keywords) { if (!$keywords) return 1; $hay = strtolower(implode(' ', array_filter($row))); $score = 0; foreach ($keywords as $key) if (strpos($hay, $key) !== false) $score += 2; return $score; }
function agent_skill_compact_dataset($row) { $out = []; foreach (['omicsType', 'datasetId', 'traitId', 'label', 'name', 'species', 'condition', 'brainRegion', 'category', 'technology', 'cells', 'sampleSize', 'ancestry', 'route'] as $key) if (isset($row[$key]) && $row[$key] !== '') $out[$key] = $row[$key]; return $out; }
function agent_skill_dataset_action($row, $locale) { return ['type' => 'dataset_card', 'label' => (agent_skill_is_zh($locale) ? '打开 ' : 'Open ') . ($row['label'] ?? $row['datasetId']), 'omicsType' => $row['omicsType'] ?? '', 'datasetId' => $row['datasetId'] ?? '', 'traitId' => $row['traitId'] ?? '', 'name' => $row['name'] ?? '', 'route' => $row['route'] ?? '', 'description' => implode(' · ', array_filter([$row['omicsType'] ?? '', $row['species'] ?? '', $row['condition'] ?? '', $row['brainRegion'] ?? ($row['category'] ?? '')]))]; }
function agent_skill_plot_title($args) { return trim(implode(' ', array_filter([$args['gene'] ?? '', strtoupper($args['dataType'] ?? ''), $args['plotType'] ?? 'plot']))); }
function agent_skill_compact_value($value, $maxBytes) { $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); if ($json === false || strlen($json) <= $maxBytes) return $value; return ['truncated' => true, 'preview' => substr($json, 0, $maxBytes)]; }

?>
