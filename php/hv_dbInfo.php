<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();

$sampleStats = fetchOne(
    $conn,
    'SELECT
        COUNT(*) AS datasets,
        SUM(CASE WHEN s.is_spatial = 0 AND s.project_id IN (1, 2) THEN s.n_cells ELSE 0 END) AS sc_cells,
        SUM(CASE WHEN s.is_spatial = 1 AND s.project_id IN (3, 4) THEN s.n_cells ELSE 0 END) AS st_spots,
        SUM(CASE WHEN s.is_spatial = 0 AND s.project_id IN (1, 2) AND p.species = "human" THEN s.n_cells ELSE 0 END) AS sc_human,
        SUM(CASE WHEN s.is_spatial = 0 AND s.project_id IN (1, 2) AND p.species = "mouse" THEN s.n_cells ELSE 0 END) AS sc_mouse,
        SUM(CASE WHEN s.is_spatial = 1 AND s.project_id IN (3, 4) AND p.species = "human" THEN s.n_cells ELSE 0 END) AS st_human,
        SUM(CASE WHEN s.is_spatial = 1 AND s.project_id IN (3, 4) AND p.species = "mouse" THEN s.n_cells ELSE 0 END) AS st_mouse,
        SUM(CASE WHEN s.project_id = 14 THEN s.n_cells ELSE 0 END) AS atac_cells,
        SUM(CASE WHEN s.is_spatial = 0 AND s.project_id IN (1, 2) THEN 1 ELSE 0 END) AS sc_datasets,
        SUM(CASE WHEN s.is_spatial = 1 AND s.project_id IN (3, 4) THEN 1 ELSE 0 END) AS st_datasets,
        SUM(CASE WHEN s.project_id = 14 THEN 1 ELSE 0 END) AS atac_datasets
     FROM sample s
     JOIN project p ON s.project_id = p.project_id'
);

$geneStats = fetchOne($conn, 'SELECT COUNT(DISTINCT feature_name) AS genes FROM feature WHERE feature_type = "gene"');

$datasets = (int)($sampleStats['datasets'] ?? 0);
$scCells = (int)($sampleStats['sc_cells'] ?? 0);
$stSpots = (int)($sampleStats['st_spots'] ?? 0);
$genes = (int)($geneStats['genes'] ?? 0);

$results = [
    'datasets' => $datasets,
    'cells' => $scCells,
    'spots' => $stSpots,
    'genes' => $genes,
    'scDatasets' => (int)($sampleStats['sc_datasets'] ?? 0),
    'stDatasets' => (int)($sampleStats['st_datasets'] ?? 0),
    'atacDatasets' => (int)($sampleStats['atac_datasets'] ?? 0),
    'atacCells' => (int)($sampleStats['atac_cells'] ?? 0),
    'scHuman' => (int)($sampleStats['sc_human'] ?? 0),
    'scMouse' => (int)($sampleStats['sc_mouse'] ?? 0),
    'stHuman' => (int)($sampleStats['st_human'] ?? 0),
    'stMouse' => (int)($sampleStats['st_mouse'] ?? 0),
    'source' => 'database',
    'generatedAt' => gmdate('c'),

    // Legacy field names retained for older frontend code paths.
    'cellNum' => $scCells,
    'clusterNum' => $datasets,
    'geneNum' => $genes,
    'spatialNum' => $stSpots,
];

$conn->close();
jsonOut($results);
