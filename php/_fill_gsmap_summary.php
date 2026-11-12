<?php
/**
 * GSMap 汇总表填充接口（仅供 DBA 在维护窗口使用）。
 * 用法：GET /php/_fill_gsmap_summary.php?action=fill
 * 风险：需要约 60-120 分钟。请在低峰期执行。
 */
require_once __DIR__ . '/helpers.php';
header('Content-Type: text/plain; charset=utf-8');
$conn = getDb();
set_time_limit(0);
ignore_user_abort(true);
$action = $_GET['action'] ?? '';
try {
    if ($action !== 'fill') {
        echo "usage: ?action=fill\n";
        echo "Estimated time: 60-120 minutes. DO NOT run during peak hours.\n";
        $conn->close();
        exit;
    }
    echo "FILL START " . date('H:i:s') . "\n";
    flush();
    $conn->query('DELETE FROM ssmood_v2.gsmap_trait_summary');
    $total = 0; $filled = 0;
    for ($sid = 144; $sid <= 201; $sid++) {
        $total++;
        $sidEsc = $conn->real_escape_string((string)$sid);
        $sql = "INSERT INTO ssmood_v2.gsmap_trait_summary (sample_id, trait_id, n_rows, n_spots, min_z, max_z)
                SELECT $sid, trait_id, COUNT(*) AS n_rows, COUNT(DISTINCT spot_id) AS n_spots, MIN(z) AS min_z, MAX(z) AS max_z
                FROM ssmood_v2.gsmap_spatial_score WHERE sample_id = $sid GROUP BY trait_id";
        $t0 = microtime(true);
        $ins = $conn->query($sql);
        $dt = round(microtime(true) - $t0, 1);
        if ($ins) {
            $filled++;
            echo "sample $sid/$total OK ($dt s)\n";
        } else {
            echo "sample $sid FAIL: " . $conn->error . "\n";
        }
        flush();
    }
    $check = fetchOne($conn, 'SELECT COUNT(*) AS n FROM ssmood_v2.gsmap_trait_summary');
    echo "FILL DONE " . date('H:i:s') . " filled=$filled/$total summary_rows=" . ($check['n'] ?? '?') . "\n";
} catch (Throwable $e) {
    echo "EXCEPTION: " . get_class($e) . ": " . $e->getMessage() . "\n";
}
$conn->close();
