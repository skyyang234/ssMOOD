<?php
require_once __DIR__ . '/helpers.php';

$conn = getDb();
$trait = trim($_GET['trait'] ?? '');
$traitAbbr = trim($_GET['trait_abbr'] ?? '');
$chrom = trim($_GET['chrom'] ?? '');
$limit = min(max((int)($_GET['limit'] ?? 1000), 1), 5000);

$conditions = [];
$types = '';
$params = [];
if ($trait !== '') {
    $conditions[] = 'trait = ?';
    $types .= 's';
    $params[] = $trait;
}
if ($traitAbbr !== '') {
    $conditions[] = 'trait_abbr = ?';
    $types .= 's';
    $params[] = $traitAbbr;
}
if ($chrom !== '') {
    $conditions[] = 'chrom = ?';
    $types .= 's';
    $params[] = $chrom;
}
$sql = 'SELECT gwas_id, project_id, snp_id, chrom, position, p_value, beta, se,
               effect_allele, other_allele, eaf, mapped_gene, mapped_distance,
               trait, trait_abbr, source, source_url, extra_json
        FROM gwas_signal';
if (!empty($conditions)) {
    $sql .= ' WHERE ' . implode(' AND ', $conditions);
}
$sql .= ' ORDER BY p_value ASC LIMIT ?';
$types .= 'i';
$params[] = $limit;

$rows = fetchAll($conn, $sql, $types, ...$params);
$signals = [];
foreach ($rows as $row) {
    $signals[] = [
        'gwas_id' => (int)$row['gwas_id'],
        'project_id' => (int)$row['project_id'],
        'snp_id' => $row['snp_id'],
        'chrom' => $row['chrom'],
        'position' => $row['position'] === null ? null : (int)$row['position'],
        'p_value' => $row['p_value'] === null ? null : (float)$row['p_value'],
        'beta' => $row['beta'] === null ? null : (float)$row['beta'],
        'se' => $row['se'] === null ? null : (float)$row['se'],
        'effect_allele' => $row['effect_allele'],
        'other_allele' => $row['other_allele'],
        'eaf' => $row['eaf'] === null ? null : (float)$row['eaf'],
        'mapped_gene' => $row['mapped_gene'],
        'mapped_distance' => $row['mapped_distance'] === null ? null : (int)$row['mapped_distance'],
        'trait' => $row['trait'],
        'trait_abbr' => $row['trait_abbr'],
        'source' => $row['source'],
        'source_url' => $row['source_url'],
        'extra_json' => $row['extra_json']
    ];
}

$conn->close();
jsonOut(['signals' => $signals]);
