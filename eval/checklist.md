# AI 助手端到端核对清单

> 由 `node eval/run-eval.mjs --checklist` 生成。逐条在气泡里提问，按期望打勾。

| # | 提问 | 期望路由 | 期望参数 | 结果 |
|---|---|---|---|---|
| nav-001 | 查看公老鼠的单细胞数据 | /browse/SingleCell | species=mouse & sex=male | ☐ |
| nav-002 | 我想查看母老鼠的空转数据 | /browse/SpatialTranscriptome | species=mouse & sex=female | ☐ |
| nav-003 | 怎么查看人的单细胞数据 | /browse/SingleCell | species=human | ☐ |
| nav-004 | 我想查看人的单细胞数据 | /browse/SingleCell | species=human | ☐ |
| nav-005 | 人的单细胞数据怎么看 | /browse/SingleCell | species=human | ☐ |
| nav-006 | 公鼠的空转数据 | /browse/SpatialTranscriptome | species=mouse & sex=male | ☐ |
| nav-007 | 母鼠的空转数据 | /browse/SpatialTranscriptome | species=mouse & sex=female | ☐ |
| nav-008 | 雄鼠单细胞有哪些 | /browse/SingleCell | species=mouse & sex=male | ☐ |
| nav-009 | 雌鼠单细胞有哪些 | /browse/SingleCell | species=mouse & sex=female | ☐ |
| nav-010 | 男性病人的单细胞怎么查看 | /browse/SingleCell | species=human & sex=male | ☐ |
| nav-011 | 公老鼠和母老鼠的单细胞数据 | /browse/SingleCell | species=mouse | ☐ |
| nav-012 | 人类空转 | /browse/SpatialTranscriptome | species=human | ☐ |
| nav-013 | 小鼠单细胞数据 | /browse/SingleCell | species=mouse | ☐ |
| nav-014 | 病人样本的单细胞怎么筛选 | /browse/SingleCell | species=human | ☐ |
| nav-015 | 小鼠的空转数据有哪些 | /browse/SpatialTranscriptome | species=mouse | ☐ |
| nav-016 | female mouse spatial data | /browse/SpatialTranscriptome | species=mouse & sex=female | ☐ |
| nav-017 | male mouse single cell data | /browse/SingleCell | species=mouse & sex=male | ☐ |
| nav-018 | 人的空间转录组怎么筛选 | /browse/SpatialTranscriptome | species=human | ☐ |
| nav-019 | 查看母老鼠的单细胞数据 | /browse/SingleCell | species=mouse & sex=female | ☐ |
| nav-020 | 公老鼠单细胞 | /browse/SingleCell | species=mouse & sex=male | ☐ |
| reg-001 | 人类 BA12 的空转数据 | /browse/SpatialTranscriptome | species=human & area=BA12 | ☐ |
| reg-002 | 第 III 层的单细胞 | /browse/SingleCell | species=mouse & area=III | ☐ |
| reg-003 | 小鼠第 2 层的单细胞 | /browse/SingleCell | species=mouse & area=II | ☐ |
| reg-004 | 小鼠第 II 层空转的雌性样本 | /browse/SpatialTranscriptome | species=mouse & area=II & sex=female | ☐ |
| reg-005 | 人 BA46 的空转 | /browse/SpatialTranscriptome | species=human & area=BA46 | ☐ |
| reg-006 | BA9 单细胞 | /browse/SingleCell | species=human & area=BA9 | ☐ |
| reg-007 | BA11 的单细胞数据 | /browse/SingleCell | species=human & area=BA11 | ☐ |
| atac-001 | atac 小鼠雄性样本 | /browse/atac | species=mouse & sex=male | ☐ |
| atac-002 | 查看人类 ATAC 数据 | /browse/atac | species=human | ☐ |
| atac-003 | 小鼠 ATAC 有哪些样本 | /browse/atac | species=mouse | ☐ |
| neg-001 | MALAT1 在公鼠单细胞里表达多少 | 不应出现链接卡 | — | ☐ |
| neg-002 | 小鼠单细胞数据的细胞类型组成 | 不应出现链接卡 | — | ☐ |
| neg-003 | 这个样本的细胞数量是多少 | 不应出现链接卡 | — | ☐ |
| neg-004 | 公鼠和母鼠的差异表达基因 | 不应出现链接卡 | — | ☐ |
| neg-005 | 小鼠空转数据的 GWAS 富集结果 | 不应出现链接卡 | — | ☐ |
| neg-006 | 人和小鼠的单细胞数据有什么区别 | 不应出现链接卡 | — | ☐ |
| neg-007 | padj 0.03 算显著吗 | 不应出现链接卡 | — | ☐ |
| neg-008 | Pct.1 这一列是什么意思 | 不应出现链接卡 | — | ☐ |
| neg-009 | 帮我画一下这个基因的表达 | 不应出现链接卡 | — | ☐ |
| neg-010 | 这个数据怎么看 | 不应出现链接卡 | — | ☐ |
| neg-011 | 小鼠单细胞里小胶质细胞占比多少 | 不应出现链接卡 | — | ☐ |
| neg-012 | 空转 | 不应出现链接卡 | — | ☐ |
| neg-013 | 单细胞 | 不应出现链接卡 | — | ☐ |
| neg-014 | scDRS 是什么 | 不应出现链接卡 | — | ☐ |
| neg-015 | CSDS 是什么意思 | 不应出现链接卡 | — | ☐ |
| neg-016 | ssMOOD 有哪些数据 | 不应出现链接卡 | — | ☐ |
| neg-017 | 你好 | 不应出现链接卡 | — | ☐ |
| neg-018 | 你能做什么 | 不应出现链接卡 | — | ☐ |
| neg-019 | 我想筛选某个脑区的样本，怎么操作？ | 不应出现链接卡 | — | ☐ |
| neg-020 | 小鼠和人的空转数据 | 不应出现链接卡 | — | ☐ |
| col-001 | 老老鼠的单细胞数据 | /browse/SingleCell | species=mouse | ☐ |
| col-002 | 公的 单细胞 小鼠 | /browse/SingleCell | species=mouse & sex=male | ☐ |
| col-003 | 母的空转 | /browse/SpatialTranscriptome | sex=female | ☐ |
| col-004 | 雄性小鼠单细胞 | /browse/SingleCell | species=mouse & sex=male | ☐ |
| col-005 | 女的 人的单细胞 | /browse/SingleCell | species=human & sex=female | ☐ |
| col-006 | 男性 空间转录组 | /browse/SpatialTranscriptome | sex=male | ☐ |
| col-007 | mouse single-cell | /browse/SingleCell | species=mouse | ☐ |
| col-008 | human snRNA data | /browse/SingleCell | species=human | ☐ |
| col-009 | 小鼠大脑皮层第二层的单细胞 | /browse/SingleCell | species=mouse & area=II | ☐ |
| col-010 | 皮层第 4 层空转 | /browse/SpatialTranscriptome | species=mouse & area=IV | ☐ |
| col-011 | BA 12 的空转 | /browse/SpatialTranscriptome | species=human & area=BA12 | ☐ |
| col-012 | brodmann 46 区单细胞 | /browse/SingleCell | species=human & area=BA46 | ☐ |
| col-013 | 抑郁症模型小鼠的空转数据 | /browse/SpatialTranscriptome | species=mouse | ☐ |
| col-014 | 抑郁模型大鼠单细胞 | /browse/SingleCell | species=mouse | ☐ |
| col-015 | 人类小脑单细胞 | /browse/SingleCell | species=human | ☐ |
| col-016 | 野生型小鼠单细胞 | /browse/SingleCell | species=mouse | ☐ |
| col-017 | 有没有女性的单细胞数据 | /browse/SingleCell | sex=female | ☐ |
| col-018 | 给我看看空转里公鼠的 | /browse/SpatialTranscriptome | species=mouse & sex=male | ☐ |
| col-019 | ST data for female mice | /browse/SpatialTranscriptome | species=mouse & sex=female | ☐ |
| col-020 | 空间转录组 雌性 人 | /browse/SpatialTranscriptome | species=human & sex=female | ☐ |
