## 差異表達流程

### 1. 過濾資料
```python
valid = adata.obs[cluster_key].value_counts()
valid = valid[valid > 3].index          # 僅保留 ≥4 個細胞的類型
adata   = adata[adata.obs[cluster_key].isin(valid)]
```

> 目的：去掉細胞數過少的類，避免 wilcoxon 檢驗失真。

### 2. 差異分析
```python
sc.tl.rank_genes_groups(
    adata,
    groupby = cluster_key,
    method  = 'wilcoxon',   # 非參秩和檢驗
    key_added = 'rank_genes_groups'
)
```
Scanpy 對每個類型分別計算：  
- log2FC（當前類 vs 其餘全部細胞）  
- p 值 → BH 校正得 p-adj

### 3. pct.1 / pct.2 計算
```python
X = adata.raw.X                      # 稀疏矩陣
for g in groups:
    grp_idx = np.where(obs == g)[0]
    oth_idx = np.setdiff1d(all_idx, grp_idx)
    pct1[g] = np.asarray(X[grp_idx ].astype(bool).mean(0)).ravel()
    pct2[g] = np.asarray(X[oth_idx].astype(bool).mean(0)).ravel()
```
pct.1 = 當前類中該基因檢出比例  
pct.2 = 其餘類中該基因檢出比例


## 離線富集分析流程

### 1. 輸入
```json
{
  "significant_genes": [...],   // 差異基因列表
  "background_genes": [...],    // 背景基因列表
  "gene_sets": "GO_bp.gmt"      // GMT 檔案名
}
```
> 支援 JSON 字串或列表。

### 2. GMT 檔案
```bash
wget -O KEGG_2019_Human.gmt "http://maayanlab.cloud/Enrichr/geneSetLibrary?mode=text&libraryName=KEGG_2019_Human"
wget -O go_bp_2018.gmt "http://maayanlab.cloud/Enrichr/geneSetLibrary?mode=text&libraryName=GO_Biological_Process_2018"
wget -O go_mf_2018.gmt "http://maayanlab.cloud/Enrichr/geneSetLibrary?mode=text&libraryName=GO_Molecular_Function_2018"
wget -O go_cc_2018.gmt "http://maayanlab.cloud/Enrichr/geneSetLibrary?mode=text&libraryName=GO_Cellular_Component_2018"

```


### 3. 富集分析
```python
enrich_results = gp.enrich(
    gene_list   = significant_genes,
    gene_sets   = gene_sets_list,
    background  = background_genes,
    verbose     = False
)
```
- 方法：`gseapy 0.10+` 的 `enrich`（超幾何檢驗）。  
- 背景用於計算 odds ratio 與 p 值。

### 4. 過濾 & 輸出
```python
df = enrich_results.results
df = df[df['Adjusted P-value'] <= 0.05]   # 保留顯著
df = df.rename(columns={
    'Term':'t',
    'Adjusted P-value':'p',
    'Odds Ratio':'o',
    'Combined Score':'c',
    'Genes':'g'
})
print(df.to_json(orient='records'))
```
返回欄位：`t` 通路名稱，`p` 校正後 p 值，`o` 比值比，`c` 綜合評分，`g` 命中基因。
