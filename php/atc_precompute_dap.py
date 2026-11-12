#!/usr/bin/env python3
"""Precompute ATAC differential accessibility with sample-level pseudobulk.

Each biological sample is one replicate. For every condition pair and optional
cell type, peak accessibility is averaged within each sample, then compared
across sample replicates with Welch's t-test. Benjamini-Hochberg correction is
applied across all tested peaks in one contrast/cell-type result set.
"""

import argparse
import gzip
import math
import os
import zlib
from collections import defaultdict

import numpy as np
import pymysql
from scipy.stats import ttest_ind
from statsmodels.stats.multitest import multipletests


PROJECT_ID = 14
METHOD = "pseudobulk_welch_ttest"
SCOPE = "condition_pseudobulk"


def db_connection():
    config_path = os.environ.get("SSMOOD_DB_CONFIG", "/etc/ssmood/db.php")
    user = os.environ.get("SSMOOD_DB_USER")
    password = os.environ.get("SSMOOD_DB_PASSWORD")
    if not user or password is None:
        raise RuntimeError(
            f"Set SSMOOD_DB_USER and SSMOOD_DB_PASSWORD, or provide credentials from {config_path}."
        )
    return pymysql.connect(
        host=os.environ.get("SSMOOD_DB_HOST", "localhost"),
        user=user,
        password=password,
        database=os.environ.get("SSMOOD_DB_NAME", "ssmood_v2"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )


def decode_float32(blob):
    raw = None
    for decoder in (zlib.decompress, gzip.decompress):
        try:
            raw = decoder(blob)
            break
        except (zlib.error, OSError):
            continue
    if raw is None:
        raise ValueError("Cannot decompress expression_peak vector")
    return np.frombuffer(raw, dtype="<f4")


def sample_metadata(conn, requested_ids):
    with conn.cursor() as cur:
        if requested_ids:
            placeholders = ",".join(["%s"] * len(requested_ids))
            cur.execute(
                f"SELECT sample_id, sample_name, `condition`, sex FROM sample "
                f"WHERE project_id=%s AND sample_id IN ({placeholders}) ORDER BY sample_id",
                [PROJECT_ID, *requested_ids],
            )
        else:
            cur.execute(
                "SELECT sample_id, sample_name, `condition`, sex FROM sample "
                "WHERE project_id=%s ORDER BY sample_id",
                [PROJECT_ID],
            )
        return cur.fetchall()


def cell_indices(conn, sample_id, cell_type):
    with conn.cursor() as cur:
        if cell_type:
            cur.execute(
                "SELECT cell_index FROM cell FORCE INDEX (idx_sample_id) "
                "WHERE sample_id=%s AND COALESCE(cell_type, cluster_label2)=%s "
                "ORDER BY cell_index",
                [sample_id, cell_type],
            )
        else:
            cur.execute(
                "SELECT cell_index FROM cell FORCE INDEX (idx_sample_id) "
                "WHERE sample_id=%s ORDER BY cell_index",
                [sample_id],
            )
        return np.asarray([int(row["cell_index"]) for row in cur.fetchall()], dtype=np.int64)


def peak_vectors(conn, sample_id):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT feature_id, compressed_vector FROM expression_peak "
            "WHERE sample_id=%s AND expression_type='tfidf' ORDER BY feature_id",
            [sample_id],
        )
        for row in cur:
            yield int(row["feature_id"]), decode_float32(row["compressed_vector"])


def sample_peak_means(conn, sample_id, cell_type):
    indices = cell_indices(conn, sample_id, cell_type)
    if indices.size == 0:
        return {}
    # cell_index is zero-based in the database; vectors are one-dimensional.
    zero_based = indices[indices >= 0]
    result = {}
    for feature_id, vector in peak_vectors(conn, sample_id):
        valid = zero_based[zero_based < vector.size]
        if valid.size == 0:
            continue
        result[feature_id] = float(np.mean(vector[valid], dtype=np.float64))
    return result


def ensure_table(conn):
    with conn.cursor() as cur:
        cur.execute(
            """CREATE TABLE IF NOT EXISTS differential_peak_result (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                project_id INT NOT NULL,
                contrast VARCHAR(191) NOT NULL,
                cell_type VARCHAR(191) NULL,
                feature_id INT NOT NULL,
                log2fc DOUBLE NULL,
                pvalue DOUBLE NULL,
                padj DOUBLE NULL,
                avg_acc_group1 DOUBLE NULL,
                avg_acc_group2 DOUBLE NULL,
                pct_group1 DOUBLE NULL,
                pct_group2 DOUBLE NULL,
                n_group1 INT NULL,
                n_group2 INT NULL,
                n_samples_group1 INT NULL,
                n_samples_group2 INT NULL,
                method VARCHAR(64) NOT NULL,
                comparison_scope VARCHAR(64) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_dap (project_id, contrast, cell_type, feature_id, method),
                KEY idx_project_contrast_padj (project_id, contrast, padj),
                KEY idx_project_celltype_padj (project_id, cell_type, padj),
                KEY idx_feature (feature_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"""
        )
    conn.commit()


def feature_info(conn, feature_ids):
    result = {}
    with conn.cursor() as cur:
        chunk_size = 1000
        for start in range(0, len(feature_ids), chunk_size):
            chunk = feature_ids[start:start + chunk_size]
            placeholders = ",".join(["%s"] * len(chunk))
            cur.execute(
                f"SELECT feature_id, feature_name, feature_type FROM feature "
                f"WHERE project_id=%s AND feature_type='peak' AND feature_id IN ({placeholders})",
                [PROJECT_ID, *chunk],
            )
            for row in cur.fetchall():
                result[int(row["feature_id"])] = row
    return result


def pct_nonzero(conn, sample_id, cell_type, feature_id):
    indices = cell_indices(conn, sample_id, cell_type)
    with conn.cursor() as cur:
        cur.execute(
            "SELECT compressed_vector FROM expression_peak "
            "WHERE sample_id=%s AND feature_id=%s AND expression_type='tfidf' LIMIT 1",
            [sample_id, feature_id],
        )
        row = cur.fetchone()
    if not row or indices.size == 0:
        return 0.0
    vector = decode_float32(row["compressed_vector"])
    valid = indices[(indices >= 0) & (indices < vector.size)]
    return float(np.mean(np.abs(vector[valid]) > 1e-12)) if valid.size else 0.0


def compute(args):
    conn = db_connection()
    try:
        ensure_table(conn)
        requested = [int(value) for value in args.sample_ids.split(",") if value.strip()] if args.sample_ids else []
        samples = sample_metadata(conn, requested)
        samples = [row for row in samples if row["condition"] in (args.condition_a, args.condition_b)]
        groups = {
            args.condition_a: [row for row in samples if row["condition"] == args.condition_a],
            args.condition_b: [row for row in samples if row["condition"] == args.condition_b],
        }
        if len(groups[args.condition_a]) < 2 or len(groups[args.condition_b]) < 2:
            raise RuntimeError("Each condition needs at least two biological sample replicates.")

        if args.cell_type:
            cell_types = [args.cell_type]
        elif args.all_cell_types:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT DISTINCT COALESCE(cell_type, cluster_label2) AS cell_type "
                    "FROM cell FORCE INDEX (idx_sample_id) WHERE sample_id IN (%s) "
                    "AND COALESCE(cell_type, cluster_label2) IS NOT NULL ORDER BY cell_type"
                    % ",".join(["%s"] * len(samples)),
                    [row["sample_id"] for row in samples],
                )
                cell_types = [row["cell_type"] for row in cur.fetchall()]
        else:
            cell_types = [None]

        for cell_type in cell_types:
            values = {}
            for group_name, group_samples in groups.items():
                values[group_name] = {}
                for sample in group_samples:
                    print(f"Loading sample={sample['sample_id']} cell_type={cell_type or 'all'}", flush=True)
                    values[group_name][sample["sample_id"]] = sample_peak_means(conn, sample["sample_id"], cell_type)

            feature_ids = sorted(set().union(*[set(data) for group in values.values() for data in group.values()]))
            info = feature_info(conn, feature_ids)
            pvalues = []
            rows = []
            for feature_id in feature_ids:
                if feature_id not in info:
                    continue
                a = np.asarray([data.get(feature_id, 0.0) for data in values[args.condition_a].values()], dtype=float)
                b = np.asarray([data.get(feature_id, 0.0) for data in values[args.condition_b].values()], dtype=float)
                if np.allclose(a, a[0]) and np.allclose(b, b[0]) and a[0] == b[0]:
                    pvalue = 1.0
                else:
                    pvalue = float(ttest_ind(a, b, equal_var=False, nan_policy="omit").pvalue)
                    if not math.isfinite(pvalue):
                        pvalue = 1.0
                mean_a = float(np.mean(a))
                mean_b = float(np.mean(b))
                log2fc = math.log2((mean_a + args.pseudocount) / (mean_b + args.pseudocount))
                rows.append((feature_id, log2fc, pvalue, mean_a, mean_b, a, b))
                pvalues.append(pvalue)

            padj = multipletests(pvalues, method="fdr_bh")[1] if pvalues else []
            contrast = f"{args.condition_a}_vs_{args.condition_b}"
            with conn.cursor() as cur:
                if args.replace:
                    cur.execute(
                        "DELETE FROM differential_peak_result WHERE project_id=%s AND contrast=%s AND "
                        "((cell_type IS NULL AND %s IS NULL) OR cell_type=%s) AND method=%s",
                        [PROJECT_ID, contrast, cell_type, cell_type, METHOD],
                    )
                insert_sql = """INSERT INTO differential_peak_result
                    (project_id, contrast, cell_type, feature_id, log2fc, pvalue, padj,
                     avg_acc_group1, avg_acc_group2, pct_group1, pct_group2,
                     n_group1, n_group2, n_samples_group1, n_samples_group2, method, comparison_scope)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON DUPLICATE KEY UPDATE log2fc=VALUES(log2fc), pvalue=VALUES(pvalue), padj=VALUES(padj),
                    avg_acc_group1=VALUES(avg_acc_group1), avg_acc_group2=VALUES(avg_acc_group2),
                    pct_group1=VALUES(pct_group1), pct_group2=VALUES(pct_group2),
                    n_group1=VALUES(n_group1), n_group2=VALUES(n_group2),
                    n_samples_group1=VALUES(n_samples_group1), n_samples_group2=VALUES(n_samples_group2),
                    created_at=CURRENT_TIMESTAMP"""
                for index, row in enumerate(rows):
                    feature_id, log2fc, pvalue, mean_a, mean_b, a, b = row
                    cur.execute(insert_sql, [
                        PROJECT_ID, contrast, cell_type, feature_id, log2fc, pvalue, float(padj[index]),
                        mean_a, mean_b, None, None, len(a), len(b), len(a), len(b), METHOD, SCOPE,
                    ])
            conn.commit()
            print(f"Stored contrast={contrast} cell_type={cell_type or 'all'} peaks={len(rows)}", flush=True)
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--condition-a", default="C")
    parser.add_argument("--condition-b", default="S")
    parser.add_argument("--cell-type", default="")
    parser.add_argument("--all-cell-types", action="store_true")
    parser.add_argument("--sample-ids", default="")
    parser.add_argument("--pseudocount", type=float, default=1e-6)
    parser.add_argument("--replace", action="store_true")
    args = parser.parse_args()
    compute(args)


if __name__ == "__main__":
    main()
