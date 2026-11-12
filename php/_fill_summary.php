<?php
require_once __DIR__ . '/helpers.php';
header('Content-Type: text/plain; charset=utf-8');
$conn = getDb();
set_time_limit(0);
ignore_user_abort(true);
$action = $_GET['action'] ?? '';
try {
    if ($action === 'fill') {
        echo "FILL START " . date('H:i:s') . "\n";
        flush();
        $conn->query('DELETE FROM ssmood_v2.gsmap_trait_summary');
        for ($sid = 144; $sid <= 201; $sid++) {
            $row = fetchOne($conn, 'SELECT COUNT(*) AS n_rows FROM ssmood_v2.gsmap_spatial_score WHERE sample_id = ?', 'i', $sid);
            $n = (int)($row['n_rows'] ?? 0);
            if ($n > 0) {
                $conn->query(
                    'INSERT INTO ssmood_v2.gsmap_trait_summary (sample_id, trait_id, n_rows, n_spots, min_z, max_z)
                     SELECT ?, trait_id, COUNT(*) AS n_rows, COUNT(DISTINCT spot_id) AS n_spots, MIN(z) AS min_z, MAX(z) AS max_z
                     FROM ssmood_v2.gsmap_spatial_score WHERE sample_id = ? GROUP BY trait_id',
                    'ii', $sid, $sid
                );
            }
            if ($sid % 10 === 0) { echo "progress: $sid/201\n"; flush(); }
        }
        $check = fetchOne($conn, 'SELECT COUNT(*) AS n FROM ssmood_v2.gsmap_trait_summary');
        echo "FILL DONE " . date('H:i:s') . " summary_rows=" . ($check['n'] ?? '?') . "\n";
    } elseif ($action === 'check') {
        $row = fetchOne($conn, 'SELECT COUNT(*) AS n FROM ssmood_v2.gsmap_trait_summary');
        echo "summary rows: " . ($row['n'] ?? '?') . "\n";
        $rows = fetchAll($conn, 'SELECT gs.sample_id, COUNT(*) AS n_traits, SUM(gs.n_rows) AS total_rows FROM ssmood_v2.gsmap_trait_summary gs GROUP BY gs.sample_id ORDER BY gs.sample_id LIMIT 70');
        foreach ($rows as $r) echo "sample_id={$r['sample_id']} traits={$r['n_traits']} rows={$r['total_rows']}\n";
    } else {
        echo "usage: ?action=fill|check\n";
    }
} catch (Throwable $e) {
    echo "EXCEPTION: " . get_class($e) . ": " . $e->getMessage() . "\n";
}
$conn->close();
