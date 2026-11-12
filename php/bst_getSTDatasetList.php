<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$rows = fetchAll(
    $conn,
    'SELECT s.sample_id, s.sample_name AS dataset_id, p.species, s.age, s.sex, s.`condition` AS conditions, s.tissue AS area, s.n_cells AS cells, p.technology AS way, "st" AS scorst,
            "single" AS sample_scope, 0 AS is_integrated, p.has_integrated_umap,
            CONCAT(
                CASE
                    WHEN LOWER(s.sex) = "female" THEN "F"
                    WHEN LOWER(s.sex) = "male"   THEN "M"
                    ELSE UPPER(LEFT(COALESCE(s.sex, "U"), 1))
                END,
                "_", COALESCE(s.tissue, "NA"),
                "_", COALESCE(s.`condition`, "NA"),
                "_rep", ROW_NUMBER() OVER (
                    PARTITION BY s.project_id, COALESCE(s.tissue, ""), COALESCE(s.sex, ""), COALESCE(s.`condition`, "")
                    ORDER BY s.sample_id
                )
            ) AS display_name
     FROM sample s
     JOIN project p ON s.project_id = p.project_id
     WHERE s.is_spatial = 1 AND s.project_id IN (3, 4)
     ORDER BY s.project_id, s.sample_id'
);

foreach ($rows as &$row) {
    $sid = (int)$row['sample_id'];
    $summary = gsmapSummaryForSampleId($conn, $sid);
    $row['has_gsmap_spatial']  = $summary['has_gsmap_spatial'];
    $row['has_gsmap_cauchy']   = $summary['has_gsmap_cauchy'];
    $row['gsmap_spatial_rows'] = $summary['gsmap_spatial_rows'];
    $row['gsmap_spatial_traits'] = $summary['gsmap_spatial_traits'];
    $row['gsmap_spatial_spots']  = $summary['gsmap_spatial_spots'];
    $row['gsmap_cauchy_rows']    = $summary['gsmap_cauchy_rows'];
    $row['gsmap_cauchy_traits']  = $summary['gsmap_cauchy_traits'];
    $row['gsmap_cauchy_annotations'] = $summary['gsmap_cauchy_annotations'];
}
unset($row);
$conn->close();
jsonOut($rows);
