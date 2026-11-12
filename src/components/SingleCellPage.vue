<template>
  <div>
    <NavigationBar></NavigationBar>
    <main ref="pageSection">
      <section class="page-section">
        <div class="main-container">

          <!--##################################################-->
          <!--详细信息容器-->
          <div class="information-container">
            <div class="title-bar">
              <div class="title-bar-header">
                <h1>{{ $t('scd1') }}</h1>
              </div>
            </div>
            <div class="information-content">
              <div class="information-left">
                <h1>{{ $t('scd2') }}</h1>

                <p><span class="bold-black">{{ $t('scd3') }}</span>: {{ dataset.dataset_id }}</p>
                <p><span class="bold-black">{{ $t('scd4') }}</span>: {{ dataset.species }}</p>
                <p><span class="bold-black">{{ $t('scd5') }}</span>: {{ dataset.area }}</p>
                <p><span class="bold-black">{{ $t('scd6') }}</span>: {{ dataset.conditions }}</p>
                <p><span class="bold-black">{{ $t('scd7') }}</span>: {{ dataset.sex }}</p>
                <p><span class="bold-black">{{ $t('scd8') }}</span>: {{ dataset.age }}</p>
                <h2>{{ $t('scd9') }}</h2>

                <p><span class="bold-black">{{ $t('scd10') }}</span>: {{
                  dataset.cells }}</p>
                <p><span class="bold-black">{{ $t('scd11') }}</span>: {{
                  dataset.clusters }}</p>
              </div>
              <div class="information-right">
                <div v-for="source in datasetSources" :key="source.key">
                  <h2>{{ $t(source.labelKey) }}</h2>
                  <p v-if="source.data.Title"><span class="bold-black">{{ $t('scd13') }}</span>: {{ source.data.Title }}</p>
                  <p v-if="source.data.Methodology"><span class="bold-black">{{ $t('scd14') }}</span>: {{ source.data.Methodology }}</p>
                  <p v-if="source.data.Protocol"><span class="bold-black">{{ $t('scd15') }}</span>: {{ source.data.Protocol }}</p>
                  <p v-if="source.data.PublicDataID"><span class="bold-black">{{ $t('scd16') }}</span>: {{ source.data.PublicDataID }}</p>
                  <p v-if="source.data.Pubmed"><span class="bold-black">{{ $t('scd17') }}</span>: <a
                      :href="'http://www.ncbi.nlm.nih.gov/pubmed/' + source.data.Pubmed" target="_blank">{{
                        source.data.Pubmed }}</a></p>
                  <p v-if="source.data.DOI"><span class="bold-black">{{ $t('scd18') }}</span>: <a
                      :href="'http://doi.org/' + source.data.DOI" target="_blank">{{ source.data.DOI }}</a></p>
                  <p v-if="source.data.Statement"><span class="bold-black">{{ $t('scd19') }}</span>: {{ source.data.Statement }}</p>
                </div>
                <p v-if="!datasetSources.length">{{ $t('scd_no_source') }}</p>
              </div>
            </div>
          </div>

          <!--##################################################-->
          <!--细胞分类容器-->
          <div class="information-container">

            <div class="title-bar">
              <div class="title-bar-header">
                <h1>{{ $t('scd20') }}</h1>
              </div>
            </div>
            <div class="information-content plot-comparison-grid">

              <div class="information-left plot-panel">
                <div class="plot-panel-header">
                  <h1>{{ $t('scd21') }}</h1>
                  <div class="marker-size-control plot-toolbar">
                    <span class="label">{{ $t('scd22') }}:</span>
                    <el-input-number v-model="markerSize1" :min="1" :max="100" :step="1" size="small" controls-position=""
                      @change="updateUmap1" />
                  </div>
                </div>

                <!-- UMAP图的容器 -->
                <div class="plot-square-card">
                  <!-- 加载图 -->
                  <img v-if="umapLoading" src="/loading.gif" alt="Loading" class="plot-loading" />

                  <!-- Plotly 图表容器 -->
                  <div id="umap-plot" class="plot-square"
                    :style="{ visibility: umapLoading ? 'hidden' : 'visible' }">
                  </div>
                </div>
              </div>

              <div class="information-right plot-panel">
                <div class="plot-panel-header">
                  <div class="overlay-mode-tabs">
                    <span class="overlay-tab" :class="{ active: overlayMode === 'gene' }" @click="switchOverlayMode('gene')">
                      {{ $t('scd23_gene_expression') }}
                    </span>
                    <span class="overlay-tab" :class="{ active: overlayMode === 'gwas' }" @click="switchOverlayMode('gwas')">
                      {{ $t('scd23_gwas_score') }}
                    </span>
                  </div>
                  <div class="gene-search-con overlay-controls plot-toolbar">

                    <template v-if="overlayMode === 'gene'">
                      <div class="overlay-gene-search">
                        <el-input v-model="searchQuery" :placeholder="$t('scd24')" @focus="showScroller = true"
                          @blur="handleBlur" class="search-gene-input" clearable size="default">
                          <template #append>
                            <el-button @click="searchOverlay" type="primary">
                              {{ $t('scd21button') }}
                            </el-button>
                          </template>
                        </el-input>
                        <!--虚拟下拉列表-->
                        <div v-show="showScroller" class="scroller-wrapper overlay-scroller" ref="scrollContainer">
                          <VirtualList :data-key="'id'" :data-sources="filteredGenes" :keeps="100" :estimate-size="50"
                            :data-component="VirtualListItem" style="height: 400px; overflow-y: auto" class="scroller">
                          </VirtualList>
                        </div>
                      </div>
                    </template>

                    <template v-else>
                      <el-select v-model="selectedGwasTraitId" filterable clearable class="search-gene-input"
                        :placeholder="$t('scd23_select_trait')">
                        <el-option v-for="trait in gwasTraits" :key="trait.id" :label="gwasTraitLabel(trait)" :value="trait.id" />
                      </el-select>
                      <el-button @click="searchOverlay" type="primary">
                        {{ $t('scd21button') }}
                      </el-button>
                    </template>

                    <div class="marker-size-control">
                      <span class="label">{{ $t('scd22') }}:</span>
                      <el-input-number v-model="markerSize2" :min="1" :max="100" :step="1" size="small"
                        controls-position="" @change="updateUmap2" />
                    </div>
                  </div>
                </div>

                <!-- UMAP基因表达量图的容器 -->
                <div class="plot-square-card">
                  <!-- 加载图 -->
                  <img v-if="umapGeneLoading" src="/loading.gif" alt="Loading" class="plot-loading" />

                  <!-- Plotly 图表容器 -->
                  <div id="umap-chart-gene" class="plot-square"
                    :style="{ visibility: umapGeneLoading ? 'hidden' : 'visible' }">
                  </div>
                </div>
              </div>

            </div>
            <div class="information-second">
              <!-- 🔔自定义图例，官方图例会影响图的比例 -->
              <div class="legend-wrapper">
                <el-checkbox v-model="checkAllFlag" :indeterminate="isIndeterminate" @change="toggleAll"
                  class="select-all">
                  {{ $t('scd22-1') }}
                </el-checkbox>
                <el-checkbox-group v-model="visibleLabels" @change="onCheckboxChange" class="legend-group">
                  <el-checkbox v-for="label in global_clusterLabels" :key="label" :value="label" class="checkbox-item">
                    <span class="label-box" :style="{
                      backgroundColor: visibleLabels.includes(label) ? colors[label] : 'transparent',
                      borderColor: colors[label],
                      color: visibleLabels.includes(label) ? '#fff' : colors[label]
                    }">
                      {{ label }}
                    </span>
                  </el-checkbox>
                </el-checkbox-group>
              </div>
              <div id="myClusterChart" style="width: auto; height: 100%;"></div>
              <div id="expressionHeatmap" style="width: auto; height: auto;"></div>

            </div>
          </div>
          <!--##################################################-->
          <!--差异表达分析容器-->
          <div class="information-container">
            <div class="title-bar">
              <div class="title-bar-header">
                <h1>{{ $t('scd25') }}</h1>
              </div>
            </div>
            <div class="sc-deg-content">
              <div class="information-deg-first">
                <div class="information-left">
                  <div class="de-analysis  modern-ui">
                    <div class="note">
                      <p>{{ $t('scd26') }}</p>
                    </div>
                    <div class="group">
                      <label>{{ $t('scd27') }}</label>
                      <el-select v-model="group" placeholder="Select Comparison">
                        <el-option label="One Cell type vs Other Cell types" value="cellTypeSpecificGenes" />
                      </el-select>
                    </div>
                    <div class="cell-type">
                      <label>{{ $t('scd28') }}</label>
                      <el-select v-model="cellType" placeholder="" size="default">
                        <el-option v-for="type in cellTypes" :key="type" :label="type" :value="type" />
                      </el-select>
                    </div>
                    <!-- 标签 -->
                    <label style="white-space: nowrap; font-weight: 600;">
                      {{ $t('scd29') }}
                    </label>
                    <div class="log2fc" style="display: flex; align-items: center; gap: 12px;">
                      <!-- 滑动条 -->
                      <el-slider v-model="log2fc" :min="0" :max="10" :step="0.1" :format-tooltip="val => val.toFixed(1)"
                        show-tooltip tooltip-class="always-show-tooltip custom-tooltip" style="flex: 1;" />

                      <div style="
                        width: 48px;
                        text-align: right;
                        font-size: 14px;
                        font-weight: bold;
                        color: var(--ss-text-2);
                      ">
                        {{ log2fc.toFixed(1) }}
                      </div>
                    </div>

                    <div class="adjusted-pvalue">
                      <label>{{ $t('scd30') }}</label>
                      <!-- 对数刻度滑动条 -->
                      <el-slider v-model="pValueSliderIndex" :aria-hidden="null" :min="0" :max="7" :marks="pValueMarks"
                        :step="1" :show-tooltip="false" class="mt-4" />

                    </div>
                    <div class="DEdirection" style="margin-top: 1rem;">
                      <label class="font-semibold text-gray-700 mr-4">{{ $t('scd30-1') }}</label>
                      <el-radio-group v-model="selectedDirection" size="small" class="custom-radio-group">
                        <el-radio-button value="all">All</el-radio-button>
                        <el-radio-button value="up">UP</el-radio-button>
                        <el-radio-button value="down">Down</el-radio-button>
                      </el-radio-group>
                      <el-tooltip :content="$t('scd30-help')" placement="top">
                        <el-icon class="help-icon">
                          <QuestionFilled />
                        </el-icon>
                      </el-tooltip>
                    </div>
                  </div>
                </div>

                <div class="information-right">

                  <div class="de-analysis  modern-ui">
                    <el-input v-model="filterDEGGenes" :placeholder="$t('scd31')" clearable size="default" />
                    <el-alert v-if="DEGnotice.message && DEGnotice.type !== 'info' && !loadingDEG" :title="DEGnotice.message"
                      :type="DEGnotice.type" show-icon :closable="false" style="margin: 8px 0 12px;" />
                    <!-- 表格 -->
                    <div class="table-container">
                      <el-table :data="paginatedData" v-loading="loadingDEG" @sort-change="handleSortChange"
                        style="width: 100%;" :default-sort="{ prop: sortProp, order: sortOrder }" :empty-text="DEGemptyText">
                        <el-table-column prop="i" :label="$t('scd33')" sortable="custom">
                          <template #default="{ row }">{{ row.i }}</template>
                        </el-table-column>

                        <el-table-column prop="f" :label="$t('scd34')" sortable="custom" min-width="100">
                          <template #default="{ row }">{{ row.fc.toFixed(6) }}</template>
                        </el-table-column>

                        <el-table-column prop="t1" sortable="custom">
                          <template #header>
                            {{ $t('scd35') }}
                            <el-tooltip :content="$t('scd35-help')" placement="top">
                              <el-icon class="help-icon">
                                <QuestionFilled />
                              </el-icon>
                            </el-tooltip>
                          </template>
                          <template #default="{ row }">
                            {{ row.t1.toFixed(3) }}
                          </template>
                        </el-table-column>

                        <el-table-column prop="t2" sortable="custom">
                          <template #header>
                            {{ $t('scd36') }}
                            <el-tooltip :content="$t('scd36-help')" placement="top">
                              <el-icon class="help-icon">
                                <QuestionFilled />
                              </el-icon>
                            </el-tooltip>
                          </template>
                          <template #default="{ row }">
                            {{ row.t2.toFixed(3) }}
                          </template>
                        </el-table-column>


                        <el-table-column prop="a" :label="$t('scd37')" sortable="custom" min-width="100">
                          <template #default="{ row }">{{ row.a.toExponential(3) }}</template>
                        </el-table-column>
                      </el-table>
                      <div class="pagination">
                        <!-- 翻页 -->
                        <div class="left-section">
                          <el-pagination layout="prev, pager, next" :current-page="currentPage" :page-size="pageSize"
                            :total="filteredData.length" @current-change="handlePageChange" size="small" background
                            class="page-pagination" />
                        </div>

                        <button @click="download" class="downloadButton">{{ $t('scd32') }}</button>
                      </div>
                    </div>

                  </div>
                </div>
              </div>


              <!--##################################################-->
              <!--KEGG分析-->
              <el-card class="kegg-card" shadow="never">
                <!-- 折叠面板头 -->
                <el-collapse v-model="isenrichmentExpanded1" @change="getKEGG" accordion>
                  <el-collapse-item :title="$t('scd42')" name="1">
                    <el-text type="info">{{ $t('scd42-help') }}</el-text>
                    <div class="search-container" style="margin-bottom: 12px;">
                      <el-input v-model="filterKEGG" :placeholder="$t('scd53')" clearable prefix-icon="el-icon-search"
                        size="default" />
                    </div>

                    <el-table :data="KEGGpaginatedData" v-loading="loadingKEGG" stripe size="default"
                      style="width: 100%" :default-sort="{ prop: sortProp, order: sortOrder }"
                      @sort-change="handleKEGGSortChange" :empty-text="KEGGemptyText">
                      <el-table-column prop="t" :label="$t('scd44')" sortable="custom" min-width="400" />
                      <el-table-column prop="p" :label="$t('scd45')" sortable="custom">
                        <template #default="{ row }">{{ row.p.toExponential(3) }}</template>
                      </el-table-column>
                      <el-table-column prop="o" :label="$t('scd46')" sortable="custom">
                        <template #default="{ row }">{{ row.o.toFixed(3) }}</template>
                      </el-table-column>
                      <el-table-column prop="c" :label="$t('scd47')" sortable="custom">
                        <template #default="{ row }">{{ row.c.toFixed(3) }}</template>
                      </el-table-column>
                      <el-table-column :label="$t('scd48')">
                        <template #default="{ row }">
                          <el-button size="small" type="primary" @click="openKeggModal(row.g)">
                            {{ $t('scd49') }}
                          </el-button>
                        </template>
                      </el-table-column>
                    </el-table>

                    <!-- 分页 -->
                    <div class="pagination"
                      style="margin: 10px 0; display: flex; justify-content: space-between; align-items: center;">
                      <el-pagination background layout="prev, pager, next" :current-page="KEGGcurrentPage"
                        :page-size="pageSize" :total="KEGGfilteredData.length" @current-change="handleKEGGPageChange"
                        size="small" />
                      <el-button size="default" type="primary" @click="KEGGdownload" class="downloadButton">
                        {{ $t('scd32') }}
                      </el-button>
                    </div>
                  </el-collapse-item>
                </el-collapse>

                <!-- 模态框 -->
                <el-dialog v-model="isKeggModalOpen" width="50%" :title="$t('scd48')">
                  <el-table :data="selectedKeggGene" style="width: 100%" size="default">
                    <el-table-column :label="$t('scd50')">
                      <template #default="{ row }">
                        {{ row }}
                      </template>
                    </el-table-column>

                    <el-table-column :label="$t('scd51')">
                      <template #default="{ row }">
                        <el-button type="text" size="small" @click="openLink(row, 'link1')">
                          UNIPROT🔗
                        </el-button>
                        <el-button type="text" size="small" @click="openLink(row, 'link2')">
                          GENECARDS🔗
                        </el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                </el-dialog>
              </el-card>

              <!--##################################################-->
              <!--GO_BP分析-->
              <el-card class="gobp-card" shadow="never">
                <!-- 折叠面板头 -->
                <el-collapse v-model="isenrichmentExpanded2" @change="getGO_BP" accordion>
                  <el-collapse-item :title="$t('scd52')" name="1">
                    <el-text type="info">{{ $t('scd42-help') }}</el-text>
                    <div class="search-container" style="margin-bottom: 12px;">
                      <el-input v-model="filterGOBP" :placeholder="$t('scd53')" clearable prefix-icon="el-icon-search"
                        size="default" />
                    </div>

                    <el-table :data="GOBPpaginatedData" v-loading="loadingGOBP" stripe size="default"
                      style="width: 100%" :default-sort="{ prop: handleGOBPSortChange, order: handleGOBPPageChange }"
                      @sort-change="handleGOBPSortChange"
                      :empty-text="GOBPnotice.message || 'No GO Biological Process terms found.'">
                      <el-table-column prop="t" :label="$t('scd44')" sortable="custom" min-width="400" />
                      <el-table-column prop="p" :label="$t('scd45')" sortable="custom">
                        <template #default="{ row }">{{ row.p.toExponential(3) }}</template>
                      </el-table-column>
                      <el-table-column prop="o" :label="$t('scd46')" sortable="custom">
                        <template #default="{ row }">{{ row.o.toFixed(3) }}</template>
                      </el-table-column>
                      <el-table-column prop="c" :label="$t('scd47')" sortable="custom">
                        <template #default="{ row }">{{ row.c.toFixed(3) }}</template>
                      </el-table-column>
                      <el-table-column :label="$t('scd48')">
                        <template #default="{ row }">
                          <el-button size="small" type="primary" @click="openGOBPModal(row.g)">
                            {{ $t('scd49') }}
                          </el-button>
                        </template>
                      </el-table-column>
                    </el-table>

                    <!-- 分页 -->
                    <div class="pagination"
                      style="margin: 10px 0; display: flex; justify-content: space-between; align-items: center;">
                      <el-pagination background layout="prev, pager, next" :current-page="GOBPcurrentPage"
                        :page-size="pageSize" :total="GOBPfilteredData.length" @current-change="handleGOBPPageChange"
                        size="small" />
                      <el-button size="default" type="primary" @click="GOBPdownload" class="downloadButton">
                        {{ $t('scd32') }}
                      </el-button>
                    </div>
                  </el-collapse-item>
                </el-collapse>

                <!-- 模态框 -->
                <el-dialog v-model="isGOBPModalOpen" width="50%" :title="$t('scd48')">
                  <el-table :data="selectedGOBPGene" style="width: 100%" size="default">
                    <el-table-column :label="$t('scd50')">
                      <template #default="{ row }">
                        {{ row }}
                      </template>
                    </el-table-column>

                    <el-table-column :label="$t('scd51')">
                      <template #default="{ row }">
                        <el-button type="text" size="small" @click="openLink(row, 'link1')">
                          UNIPROT🔗
                        </el-button>
                        <el-button type="text" size="small" @click="openLink(row, 'link2')">
                          GENECARDS🔗
                        </el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                </el-dialog>
              </el-card>
              <!--##################################################-->
              <!--GO_MF分析-->
              <el-card class="gomf-card" shadow="never">
                <!-- 折叠面板头 -->
                <el-collapse v-model="isenrichmentExpanded3" @change="getGO_MF" accordion>
                  <el-collapse-item :title="$t('scd54')" name="1">
                    <el-text type="info">{{ $t('scd42-help') }}</el-text>
                    <div class="search-container" style="margin-bottom: 12px;">
                      <el-input v-model="filterGOMF" :placeholder="$t('scd53')" clearable prefix-icon="el-icon-search"
                        size="default" />
                    </div>

                    <el-table :data="GOMFpaginatedData" v-loading="loadingGOMF" stripe size="default"
                      style="width: 100%" :default-sort="{ prop: handleGOMFSortChange, order: handleGOMFPageChange }"
                      @sort-change="handleGOMFSortChange"
                      :empty-text="GOMFnotice.message || 'No GO Molecular Function terms found.'">
                      <el-table-column prop="t" :label="$t('scd44')" sortable="custom" min-width="400" />
                      <el-table-column prop="p" :label="$t('scd45')" sortable="custom">
                        <template #default="{ row }">{{ row.p.toExponential(3) }}</template>
                      </el-table-column>
                      <el-table-column prop="o" :label="$t('scd46')" sortable="custom">
                        <template #default="{ row }">{{ row.o.toFixed(3) }}</template>
                      </el-table-column>
                      <el-table-column prop="c" :label="$t('scd47')" sortable="custom">
                        <template #default="{ row }">{{ row.c.toFixed(3) }}</template>
                      </el-table-column>
                      <el-table-column :label="$t('scd48')">
                        <template #default="{ row }">
                          <el-button size="small" type="primary" @click="openGOMFModal(row.g)">
                            {{ $t('scd49') }}
                          </el-button>
                        </template>
                      </el-table-column>
                    </el-table>

                    <!-- 分页 -->
                    <div class="pagination"
                      style="margin: 10px 0; display: flex; justify-content: space-between; align-items: center;">
                      <el-pagination background layout="prev, pager, next" :current-page="GOMFcurrentPage"
                        :page-size="pageSize" :total="GOMFfilteredData.length" @current-change="handleGOMFPageChange"
                        size="small" />
                      <el-button size="default" type="primary" @click="GOMFdownload" class="downloadButton">
                        {{ $t('scd32') }}
                      </el-button>
                    </div>
                  </el-collapse-item>
                </el-collapse>

                <!-- 模态框 -->
                <el-dialog v-model="isGOMFModalOpen" width="50%" :title="$t('scd48')">
                  <el-table :data="selectedGOMFGene" style="width: 100%" size="default">
                    <el-table-column :label="$t('scd50')">
                      <template #default="{ row }">
                        {{ row }}
                      </template>
                    </el-table-column>

                    <el-table-column :label="$t('scd51')">
                      <template #default="{ row }">
                        <el-button type="text" size="small" @click="openLink(row, 'link1')">
                          UNIPROT🔗
                        </el-button>
                        <el-button type="text" size="small" @click="openLink(row, 'link2')">
                          GENECARDS🔗
                        </el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                </el-dialog>
              </el-card>
              <!--##################################################-->
              <!--GO_CC分析-->
              <el-card class="gocc-card" shadow="never">
                <!-- 折叠面板头 -->
                <el-collapse v-model="isenrichmentExpanded4" @change="getGO_CC" accordion>
                  <el-collapse-item :title="$t('scd55')" name="1">
                    <el-text type="info">{{ $t('scd42-help') }}</el-text>
                    <div class="search-container" style="margin-bottom: 12px;">
                      <el-input v-model="filterGOCC" :placeholder="$t('scd53')" clearable prefix-icon="el-icon-search"
                        size="default" />
                    </div>

                    <el-alert v-if="GOCCnotice.message && GOCCnotice.type !== 'info' && !loadingGOCC" :title="GOCCnotice.message"
                      :type="GOCCnotice.type" show-icon :closable="false" style="margin-bottom: 12px;" />
                    <el-table :data="GOCCpaginatedData" v-loading="loadingGOCC" stripe size="default"
                      style="width: 100%" :default-sort="{ prop: handleGOCCSortChange, order: handleGOCCPageChange }"
                      @sort-change="handleGOCCSortChange" :empty-text="GOCCemptyText">
                      <el-table-column prop="t" :label="$t('scd44')" sortable="custom" min-width="400" />
                      <el-table-column prop="p" :label="$t('scd45')" sortable="custom">
                        <template #default="{ row }">{{ row.p.toExponential(3) }}</template>
                      </el-table-column>
                      <el-table-column prop="o" :label="$t('scd46')" sortable="custom">
                        <template #default="{ row }">{{ row.o.toFixed(3) }}</template>
                      </el-table-column>
                      <el-table-column prop="c" :label="$t('scd47')" sortable="custom">
                        <template #default="{ row }">{{ row.c.toFixed(3) }}</template>
                      </el-table-column>
                      <el-table-column :label="$t('scd48')">
                        <template #default="{ row }">
                          <el-button size="small" type="primary" @click="openGOCCModal(row.g)">
                            {{ $t('scd49') }}
                          </el-button>
                        </template>
                      </el-table-column>
                    </el-table>

                    <!-- 分页 -->
                    <div class="pagination"
                      style="margin: 10px 0; display: flex; justify-content: space-between; align-items: center;">
                      <el-pagination background layout="prev, pager, next" :current-page="GOCCcurrentPage"
                        :page-size="pageSize" :total="GOCCfilteredData.length" @current-change="handleGOCCPageChange"
                        size="small" />
                      <el-button size="default" type="primary" @click="GOCCdownload" class="downloadButton">
                        {{ $t('scd32') }}
                      </el-button>
                    </div>
                  </el-collapse-item>
                </el-collapse>

                <!-- 模态框 -->
                <el-dialog v-model="isGOCCModalOpen" width="50%" :title="$t('scd48')">
                  <el-table :data="selectedGOCCGene" style="width: 100%" size="default">
                    <el-table-column :label="$t('scd50')">
                      <template #default="{ row }">
                        {{ row }}
                      </template>
                    </el-table-column>

                    <el-table-column :label="$t('scd51')">
                      <template #default="{ row }">
                        <el-button type="text" size="small" @click="openLink(row, 'link1')">
                          UNIPROT🔗
                        </el-button>
                        <el-button type="text" size="small" @click="openLink(row, 'link2')">
                          GENECARDS🔗
                        </el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                </el-dialog>
              </el-card>

            </div>
          </div>

          <!--##################################################-->
        </div>
      </section>
    </main>
    <BackToTop></BackToTop>
  </div>
</template>

<script setup>
import Plotly from 'plotly.js-dist-min';
//import { RecycleScroller } from 'vue3-virtual-scroller';
//import VirtualList from 'vue-virtual-scroll-list';
import VirtualListItem from './general/VirtualListItem.vue';
import VirtualList from 'vue3-virtual-scroll-list'

import { ref, onMounted, computed, watch, nextTick, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
//import VueVirtualScrollGrid from 'vue-virtual-scroll-grid';
//import debounce from 'lodash.debounce';
//----------以下为一个ssmood页面需要的最基础的东西--------------
import BackToTop from './general/BackToTop.vue';
import NavigationBar from './general/NavigationBar.vue';

import config from '@/config';
//----------以上为一个ssmood页面需要的最基础的东西--------------
import colorMap from './color_map.js';
import { getGzipJson, getJson, parseMaybeGzipJson, normalizeBoolFlag } from '@/utils/api';
import { updateAgentContext, clearAgentContext } from '@/utils/agentContext';
import { QuestionFilled } from '@element-plus/icons-vue'




const route = useRoute();


//###################################//
//加载数据集详细信息
//###################################//
const defaultDs1 = () => ({
  Title: "",
  Methodology: "",
  Protocol: "",
  PublicDataID: "",
  Pubmed: null,
  DOI: "",
  Statement: ""
});

const SOURCE_KEYS = ['DatasetSource1', 'DatasetSource2', 'DatasetSource3'];
const SOURCE_LABEL_KEYS = {
  DatasetSource1: 'scd12',
  DatasetSource2: 'scd12-1',
  DatasetSource3: 'scd12-2'
};

const defaultInformation = () => ({
  DatasetSource1: defaultDs1(),
  DatasetSource2: defaultDs1(),
  DatasetSource3: defaultDs1()
});

// 将 v2 新版 metadata 平面的 key 映射到旧版 DatasetSource1 结构
const METADATA_KEY_MAP = {
  Title:        ['title', 'study_title', 'name', 'assay_title', 'dataset_title'],
  Methodology:  ['method', 'methodology', 'technology', 'platform'],
  Protocol:     ['protocol', 'library_protocol', 'library_prep', 'tech_protocol', 'way'],
  PublicDataID: ['public_data_id', 'publicDataId', 'accession', 'geo_id', 'geo_accession', 'sra_id', 'geo', 'gse'],
  DOI:          ['doi'],
  Pubmed:       ['pubmed_id', 'pmid', 'pubmed'],
  Statement:    ['description', 'summary', 'abstract', 'statement', 'design', 'source']
};

const SOURCE_CONTENT_FIELDS = ['Title', 'PublicDataID', 'Pubmed', 'DOI', 'Statement'];
const hasSourceContent = (source = {}) => SOURCE_CONTENT_FIELDS.some(key => source[key] !== null && source[key] !== undefined && source[key] !== '' && source[key] !== 0 && source[key] !== '0');

const normalizeToDatasetSource1 = (obj) => {
  if (!obj || typeof obj !== 'object') return defaultDs1();

  const mapped = {};
  for (const [target, candidates] of Object.entries(METADATA_KEY_MAP)) {
    for (const cand of candidates) {
      if (obj[cand] !== undefined && obj[cand] !== null && obj[cand] !== '') {
        mapped[target] = obj[cand];
        break;
      }
    }
  }
  return { ...defaultDs1(), ...mapped };
};

const normalizeInformationSources = (obj) => {
  const information = defaultInformation();
  let foundSource = false;

  SOURCE_KEYS.forEach(key => {
    const sourceKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
    if (sourceKey && obj[sourceKey] && typeof obj[sourceKey] === 'object') {
      information[key] = { ...defaultDs1(), ...obj[sourceKey] };
      foundSource = true;
    }
  });

  if (!foundSource) {
    information.DatasetSource1 = normalizeToDatasetSource1(obj);
  }
  return information;
};

const parseInformation = (value) => {
  if (!value) return defaultInformation();
  let parsed;
  if (typeof value === 'object') {
    parsed = { ...value };
  } else {
    try {
      parsed = JSON.parse(value);
    } catch (e) {
      return { ...defaultInformation(), DatasetSource1: { ...defaultDs1(), Title: String(value) } };
    }
  }
  if (!parsed || typeof parsed !== 'object') return defaultInformation();
  return normalizeInformationSources(parsed);
};

const inferGwasSex = (record = {}) => {
  const sexText = String(record.sex || '').toLowerCase();
  const datasetId = String(record.dataset_id || route.params.id || '').toLowerCase();
  if (sexText.includes('female') || sexText === 'f' || datasetId.startsWith('f_')) return 'female';
  if (sexText.includes('male') || sexText === 'm' || datasetId.startsWith('m_')) return 'male';
  return null;
};

const dataset = ref({
  dataset_id: '',
  species: '',
  area: '',
  conditions: '',
  sex: '',
  age: '',
  cells: '',
  clusters: '',
  information: defaultInformation()
});

const datasetSources = computed(() => SOURCE_KEYS
  .map(key => ({ key, labelKey: SOURCE_LABEL_KEYS[key], data: dataset.value.information?.[key] || defaultDs1() }))
  .filter(source => source.key === 'DatasetSource1' || hasSourceContent(source.data))
);

function singleCellPrimaryAction(activeTab) {
  if (String(activeTab || '').toLowerCase().includes('deg')) return 'viewing_deg_table';
  return 'viewing_dataset_overview';
}

// ── 页面模块 ──
// 单细胞详情页由多个模块组成（聚类 UMAP / 当前基因表达 / GWAS 评分 / DEG 表 / 富集分析）。
// 之前所有模块共用 selection.selectedGene 这一个字段，且 DEG 表的被动刷新会把它
// 连同 activeTab 一起写死成 DEG，导致用户在「当前基因表达」选了基因，
// AI 却按 DEG 页讲解。这里把「基因是从哪个模块选的」也上报出去。
const SC_MODULE_LABELS = {
  clustering: '单细胞聚类 UMAP',
  gene_expression: '当前基因表达',
  gwas_score: 'GWAS/scDRS 细胞评分',
  deg_table: '差异表达基因表（DEG）',
  enrichment: '富集分析',
};

// 当前选中基因的来源模块。'' 表示尚未在任何模块里选过基因。
const geneSourceModule = ref('');

// 本页模块清单：告诉 AI 这一页有哪些模块、各自选中了什么，
// 让它能按模块组织回答，而不是把所有模块的信息倒在一起。
function scModuleList() {
  return [
    {
      id: 'clustering',
      label: SC_MODULE_LABELS.clustering,
      note: dataset.value.clusters ? `${dataset.value.clusters} 个聚类` : '',
    },
    {
      id: 'gene_expression',
      label: SC_MODULE_LABELS.gene_expression,
      selection: {
        selectedGene: searchQuery.value || '',
        overlayMode: overlayMode.value === 'gene' ? '基因表达' : (overlayMode.value || ''),
      },
    },
    { id: 'gwas_score', label: SC_MODULE_LABELS.gwas_score },
    {
      id: 'deg_table',
      label: SC_MODULE_LABELS.deg_table,
      source: 'DEG 表',
      selection: {
        selectedCellType: cellType.value || '',
        degFilter: degFilterText(),
      },
    },
    { id: 'enrichment', label: SC_MODULE_LABELS.enrichment },
  ];
}

// 「当前基因表达」模块选中基因时调用：写清基因来源，并把模块切到基因表达。
function syncGeneExpressionContext() {
  geneSourceModule.value = 'gene_expression';
  updateAgentContext({
    selection: {
      selectedGene: searchQuery.value || '',
      geneSource: searchQuery.value ? SC_MODULE_LABELS.gene_expression : '',
    },
    modules: scModuleList(),
    activeModule: 'gene_expression',
    activeTab: 'gene_expression',
    userPrimaryAction: 'viewing_gene_expression',
  });
}

// ── 页面自描述（P4）──
// 详情页声明自己的表格列：用户问「Pct.1 是什么」时，AI 除了解释含义，
// 还能给出「在表格中定位 Pct.1」的按钮，点了直接高亮那一列。
// labels 用页面真实表头文案（中/英），列定位按文案在 DOM 里匹配。
const SC_PAGE_SCHEMA = {
  filters: [],
  columns: [
    { key: 'gene', labels: ['基因名', 'Gene name'] },
    { key: 'logFC', labels: ['对数倍数变化', 'LogFC'] },
    { key: 'Pct.1', labels: ['Pct.1'] },
    { key: 'Pct.2', labels: ['Pct.2'] },
    { key: 'p_val_adj', labels: ['调整后的P值', 'Adjusted p-value'] },
  ],
  charts: ['umap', 'violin', 'spatial_map', 'celltype_composition'],
};

function syncSingleCellAgentContext(extra = {}) {
  const activeTab = extra.activeTab || 'single_cell_detail';
  updateAgentContext({
    pageSchema: SC_PAGE_SCHEMA,
    businessState: {
      datasetId: dataset.value.dataset_id || route.params.id || '',
      omicsType: 'SC',
      species: dataset.value.species || '',
      brainRegion: dataset.value.area || '',
      condition: dataset.value.conditions || '',
      selectedCellType: cellType.value || '',
      activeTab,
      userPrimaryAction: extra.userPrimaryAction || singleCellPrimaryAction(activeTab),
      ...extra,
    },
    pageSummary: {
      cells: dataset.value.cells || '',
      clusters: dataset.value.clusters || '',
    },
    // 当前实体元信息：供 AI 引用「这个数据集有多少细胞/分群」。
    entity: {
      cells: dataset.value.cells || '',
      clusters: dataset.value.clusters || '',
    },
  });
}

onUnmounted(() => {
  clearAgentContext();
});

// 详情请求 Promise：UMAP 加载会等待它，以便按 has_integrated_umap 精准选择坐标接口
let datasetDetailPromise = null;

onMounted(() => {
  // 页面自描述先落地：不等详情接口。接口慢或失败时，
  // 至少列定位、导读卡、页面能力仍然可用（否则会残留上一页的上下文）。
  updateAgentContext({
    pageSchema: SC_PAGE_SCHEMA,
    businessState: {
      datasetId: route.params.id || '',
      omicsType: 'SC',
      activeTab: 'single_cell_detail',
    },
  });

  const params = new URLSearchParams({
    id: route.params.id
  });

  datasetDetailPromise = fetch(config.apiUrl + `scd_getSCDatasetDetail.php?${params}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      if (data && data.length > 0) {
        dataset.value = {
          ...data[0],
          information: parseInformation(data[0].information || data[0].detail)
        };
        const inferredSex = inferGwasSex(dataset.value);
        if (inferredSex) gwasSex.value = inferredSex;
        hasIntegratedUmap.value = normalizeBoolFlag(data[0].has_integrated_umap);
        syncSingleCellAgentContext();
      }
    })
    .catch(error => {
      console.error('Error fetching dataset details:', error);
    });
});



//###################################//
//加载Umap图
//###################################//
const umapData = ref([]);
// 样本是否具备整合 UMAP 坐标（scd_getSCDatasetDetail 返回），用于决定坐标接口选择
const hasIntegratedUmap = ref(null);
const global_clusterLabels = ref([])
const visibleLabels = ref([])
const colors = ref({})
const isIndeterminate = ref(false)
const checkAllFlag = ref(true)

const umapLoading = ref(true)

// 防止缩放同步循环的标志位
const isSyncingZoom = ref(false)
const isSelectZoom = ref(false)

// 根据缩放范围自动选择可见的细胞类型
const selectVisibleCellTypes = (xRange, yRange) => {
  if (!xRange || !yRange || umapData.value.length === 0) return;
  isSelectZoom.value = true;
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;
  
  // 找出在当前视图范围内的细胞类型
  const visibleTypes = new Set();
  
  umapData.value.forEach(cell => {
    const x = parseFloat(cell.u1);
    const y = parseFloat(cell.u2);
    
    if (x >= xMin && x <= xMax && y >= yMin && y <= yMax) {
      visibleTypes.add(cell.c);
    }
  });
  
  // 更新可见的细胞类型 - 使用 nextTick 确保 DOM 更新完成
  if (visibleTypes.size > 0) {
    nextTick(() => {
      visibleLabels.value = Array.from(visibleTypes);
      // 在 DOM 更新后重置标志位
      setTimeout(() => {
        isSelectZoom.value = false;
      }, 50);
    });
  } else {
    // 如果没有找到可见类型，立即重置标志位
    isSelectZoom.value = false;
  }
};




// 全选/全不选
const toggleAll = () => {
  if (checkAllFlag.value) {
    visibleLabels.value = [...global_clusterLabels.value]
  } else {
    visibleLabels.value = []
  }
}

// 单个复选框变动时
const onCheckboxChange = () => {
  // 这里只处理图更新，选中状态由 watch 管
  // 只有在非缩放选择的情况下才更新图表
  if (!isSelectZoom.value) {
    updatePlot()
    updateGenePlot()
  }
}



// 自动追踪 visibleLabels 的变化，更新全选与半选中状态
watch(visibleLabels, (val) => {
  const total = global_clusterLabels.value.length
  const checkedCount = val.length

  checkAllFlag.value = checkedCount === total
  isIndeterminate.value = checkedCount > 0 && checkedCount < total
  
  // 只有在非缩放选择的情况下才更新图表
  if (!isSelectZoom.value) {
    updatePlot()
    updateGenePlot()
  }
}, { flush: 'post' })

// 裸轴：隐藏坐标轴、刻度与网格，只保留散点；r 预留色标宽度，使左右两图绘图区等宽
const umapLayoutBase = () => ({
  showlegend: false,
  autosize: true,
  responsive: true,
  margin: { t: 10, r: 60, b: 10, l: 10 },
  xaxis: { visible: false, showgrid: false, zeroline: false },
  yaxis: { visible: false, showgrid: false, zeroline: false },
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
});

const buildOverlayLayout = () => umapLayoutBase();

const buildGeneOverlayTraces = (source) => {
  const categories = [...new Set(source.map(item => item.c))].sort();
  return categories.map(category => {
    const categoryPoints = source.filter(point => point.c === category);
    return {
      x: categoryPoints.map(point => point.u1),
      y: categoryPoints.map(point => point.u2),
      mode: 'markers',
      type: 'scattergl',
      name: category,
      marker: {
        color: categoryPoints.map(point => getColor(point.nc)),
        size: markerSize2.value,
      },
      text: categoryPoints.map(point => `${point.i}<br>${point.nc}`),
    };
  });
};

const buildGwasOverlayTraces = (source) => {
  const visibleSource = source.filter(item => visibleLabels.value.includes(item.c));
  const backgroundPoints = visibleSource.filter(point => !Number.isFinite(point.score));
  const scoredPoints = visibleSource.filter(point => Number.isFinite(point.score));
  const scoreValues = scoredPoints.map(point => point.score);
  const minScore = scoreValues.length ? Math.min(...scoreValues) : 0;
  const maxScore = scoreValues.length ? Math.max(...scoreValues) : 0;
  const absMaxScore = Math.max(Math.abs(minScore), Math.abs(maxScore), 1e-9);
  const traces = [];

  if (backgroundPoints.length > 0) {
    traces.push({
      x: backgroundPoints.map(point => point.u1),
      y: backgroundPoints.map(point => point.u2),
      mode: 'markers',
      type: 'scattergl',
      name: 'No score',
      marker: { color: 'rgba(190, 196, 207, 0.18)', size: Math.max(markerSize2.value - 1, 1) },
      text: backgroundPoints.map(point => `${point.i}<br>scDRS score: NA`),
      hoverinfo: 'text',
    });
  }

  if (scoredPoints.length > 0) {
    traces.push({
      x: scoredPoints.map(point => point.u1),
      y: scoredPoints.map(point => point.u2),
      mode: 'markers',
      type: 'scattergl',
      name: 'scDRS score',
      marker: {
        color: scoredPoints.map(point => point.score),
        colorscale: [
          [0, 'rgb(65, 105, 180)'],
          [0.5, 'rgb(245, 245, 245)'],
          [1, 'rgb(178, 34, 34)']
        ],
        cmin: -absMaxScore,
        cmax: absMaxScore,
        colorbar: { title: 'scDRS', thickness: 10, len: 0.55 },
        size: Math.max(markerSize2.value + 3, 5),
        line: { color: 'rgba(35, 39, 47, 0.55)', width: 0.8 },
      },
      text: scoredPoints.map(point => `${point.i}<br>scDRS score: ${point.score.toFixed(5)}`),
      hoverinfo: 'text',
    });
  }

  return traces;
};

const updateGenePlot = () => {
  if (isSearchgene.value !== true) return;
  const filteredArray = mergedGeneArray.value.filter(item => visibleLabels.value.includes(item.c));
  const traces = overlayResultMode.value === 'gwas'
    ? buildGwasOverlayTraces(mergedGeneArray.value)
    : buildGeneOverlayTraces(filteredArray);
  Plotly.react('umap-chart-gene', traces, buildOverlayLayout());
}

const updatePlot = () => {
  const umap1 = umapData.value.map(d => parseFloat(d.u1));
  const umap2 = umapData.value.map(d => parseFloat(d.u2));
  const cellIds = umapData.value.map(d => d.i);
  const clusterLabelsData = umapData.value.map(d => d.c);

  const traces = global_clusterLabels.value.map((label) => {
    const show = visibleLabels.value.includes(label)
    const indices = clusterLabelsData
      .map((l, i) => l === label ? i : -1)
      .filter(i => i !== -1)

    const x = show ? indices.map(i => umap1[i]) : []
    const y = show ? indices.map(i => umap2[i]) : []
    const text = show ? indices.map(i => cellIds[i]) : []

    return {
      x,
      y,
      mode: 'markers',
      type: 'scattergl',
      name: label,
      text,
      marker: {
        size: markerSize1.value,
        color: colors.value[label]
      }
    }
  })

  Plotly.react('umap-plot', traces, umapLayoutBase())
}

// 优先取整合坐标；样本若无整合坐标（has_integrated_umap=0）后端会返回空，
// 此时自动降级到单样本坐标系，避免出现“有样本却看不到点”的情况
async function fetchUmapData(params) {
  // 等详情返回，拿到 has_integrated_umap 后再决定请求哪个坐标接口
  if (datasetDetailPromise) await datasetDetailPromise.catch(() => {});

  const request = async endpoint => {
    const response = await fetch(`${config.apiUrl}${endpoint}?${params}`);
    if (!response.ok) return null;
    return parseMaybeGzipJson(await response.arrayBuffer());
  };
  const hasPoints = payload => payload && Array.isArray(payload.umap_data) && payload.umap_data.length > 0;

  // 详情已明确该样本没有整合坐标时，直接取单样本坐标，省去一次必然为空的请求
  if (hasIntegratedUmap.value === false) {
    const singleOnly = await request('scd_getSingleUmapdata.php').catch(() => null);
    if (hasPoints(singleOnly)) return singleOnly;
  }

  const integrated = await request('scd_getumapdata.php').catch(() => null);
  if (hasPoints(integrated)) return integrated;

  const single = await request('scd_getSingleUmapdata.php').catch(() => null);
  if (hasPoints(single)) return single;

  return integrated || single;
}

onMounted(() => {
  umapLoading.value = true
  const params = new URLSearchParams({
    id: route.params.id
  });
  fetchUmapData(params)
    .then(data => {
      if (!data) return;
      umapData.value = data.umap_data;
      const clusterLabels = data.cluster_labels;

      const labelMap = new Map();
      clusterLabels.forEach((label, index) => {
        labelMap.set(label, index);
      });

      clusterLabels.sort((a, b) => {
        const partsA = a.match(/\d+/);
        const partsB = b.match(/\d+/);
        if (partsA && partsB) {
          // 如果两个字符串都包含数字，则按数字排序
          return parseInt(partsA[0], 10) - parseInt(partsB[0], 10);
        } else if (partsA) {
          // 如果只有 a 包含数字，则 a 排在 b 前面
          return -1;
        } else if (partsB) {
          // 如果只有 b 包含数字，则 b 排在 a 前面
          return 1;
        } else {
          // 如果两个字符串都不包含数字，则按字母顺序排序
          return a.localeCompare(b);
        }
      });
      global_clusterLabels.value = [...clusterLabels];
      visibleLabels.value = [...clusterLabels];
      //console.log(clusterLabels);
      const umap1 = umapData.value.map(d => parseFloat(d.u1));
      const umap2 = umapData.value.map(d => parseFloat(d.u2));
      const cellIds = umapData.value.map(d => d.i);
      const clusterLabelsData = umapData.value.map(d => d.c);


      colors.value = clusterLabels.reduce((acc, label) => {
        acc[label] = colorMap[label] || 'rgb(128,128,128)'; // 如果没有找到对应的颜色，则使用默认颜色 #000
        return acc;
      }, {});
      //console.log(colors);
      const traces = clusterLabels.map((label) => {
        const x = umap1.filter((_, i) => clusterLabelsData[i] === label);
        const y = umap2.filter((_, i) => clusterLabelsData[i] === label);
        const text = cellIds.filter((_, i) => clusterLabelsData[i] === label);

        return {
          x: x,
          y: y,
          mode: 'markers',
          type: 'scattergl',
          name: label,
          text: text,
          marker: {
            size: markerSize1.value,
            color: colors.value[label]
          }
        };
      });


      const layout = umapLayoutBase();


      Plotly.newPlot('umap-plot', traces, layout);
      
      // 添加缩放事件监听，让左边图的缩放同步到右边图
      document.getElementById('umap-plot').on('plotly_relayout', function(eventdata) {
        if (eventdata && eventdata['xaxis.range[0]'] !== undefined && !isSyncingZoom.value) {
          isSyncingZoom.value = true;
          
          // 获取缩放范围并选择可见的细胞类型
          const xRange = [eventdata['xaxis.range[0]'], eventdata['xaxis.range[1]']];
          const yRange = [eventdata['yaxis.range[0]'], eventdata['yaxis.range[1]']];
          selectVisibleCellTypes(xRange, yRange);
          
          // 同步缩放范围到右边图
          if (isSearchgene.value === true) {
            Plotly.relayout('umap-chart-gene', {
              'xaxis.range[0]': eventdata['xaxis.range[0]'],
              'xaxis.range[1]': eventdata['xaxis.range[1]'],
              'yaxis.range[0]': eventdata['yaxis.range[0]'],
              'yaxis.range[1]': eventdata['yaxis.range[1]']
            });
          }
          
          setTimeout(() => {
            isSyncingZoom.value = false;
          }, 100);
        }
      });
      
      
      // 添加双击重置事件监听，让左边图的双击同步到右边图
      document.getElementById('umap-plot').on('plotly_doubleclick', function() {
        // 重置为全选状态
        visibleLabels.value = [...global_clusterLabels.value];
        
        // 重置右边图的视图
        if (isSearchgene.value === true) {
          Plotly.relayout('umap-chart-gene', {
            'xaxis.autorange': true,
            'yaxis.autorange': true
          });
        }
      });
      umapLoading.value = false;

    })
    .catch(error => console.error('Error fetching UMAP data:', error));
});



//更新点大小
const markerSize1 = ref(4); // 默认点大小


// 更新 UMAP 图1 的点大小
const updateUmap1 = () => {
  Plotly.restyle('umap-plot', 'marker.size', [markerSize1.value]);
};

//###################################//
//分类表
//###################################//
onMounted(async () => {
  const params = new URLSearchParams({
    id: route.params.id
  });
  // 绘制各数据集分布
  fetch(config.apiUrl + `scd_getNumberOfCluster.php?${params}`)
    .then(response => response.json())
    .then(dataFromPhp => {
      // 提取标签和细胞数量
      const labels = Object.keys(dataFromPhp);
      const cellCounts = Object.values(dataFromPhp);

      // 创建条形图数据
      const trace = {
        x: labels,
        y: cellCounts,
        type: 'bar',
        marker: {
          color: 'rgba(93, 116, 162 ,0.6)',
          line: {
            color: 'rgba(93, 116, 162 ,1)',
            width: 1
          }
        }
      };

      // 创建布局
      const layout = {
        title: 'Cell Counts per Cluster',
        xaxis: {
          title: '',
          tickangle: 45, // 将标签旋转45度
          tickmode: 'linear', // 确保标签均匀分布
          tickfont: { size: 7 } // 调整字体大小
        },
        yaxis: {
          title: '',
          showgrid: true,
          zeroline: true
        }
      };

      // 绘制图表
      Plotly.newPlot('myClusterChart', [trace], layout);
    })
    .catch(error => console.error('Error fetching data from scd_getNumberOfCluster.php:', error));
});



//###################################//
//基因搜索框
//###################################//


const genes = ref([]);
const searchQuery = ref('');
const showScroller = ref(false);
const markerSize2 = ref(4); // 默认点大小
const overlayMode = ref('gene');
const overlayResultMode = ref('gene');
const gwasTraits = ref([]);
const selectedGwasTraitId = ref(null);
const gwasSex = ref('male');
const gwasScoreSummary = ref(null);
const gwasPlottedCells = ref(0);


const filteredGenes = computed(() => {
  let data = genes.value || [];
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    //console.log(query)
    data = data.filter(gene => (gene.content || '').toLowerCase().includes(query));
  }
  return data;
});

const gwasTraitLabel = (trait) => {
  if (!trait) return '';
  const name = trait.name || trait.full_name || trait.chinese_name || '';
  return `${trait.abbr || trait.abbreviation || trait.id} · ${name}`;
};

const getScdrsIdVariants = (id) => {
  const value = String(id ?? '').trim();
  if (!value) return [];
  const withoutSexSuffix = value.replace(/-(male|female)$/i, '');
  return [...new Set([value, withoutSexSuffix])];
};

const getScdrsScoreValue = (item) => {
  const score = Number(item?.score ?? item?.scdrs_score ?? item?.scdrsScore ?? item?.gwas_score);
  return Number.isFinite(score) ? score : null;
};

const switchOverlayMode = (mode) => {
  if (overlayMode.value === mode) return;
  overlayMode.value = mode;
};

const searchOverlay = () => {
  if (overlayMode.value === 'gwas') {
    searchGwasScore();
  } else {
    searchgene();
  }
};

watch(overlayMode, () => {
  isSearchgene.value = false;
  mergedGeneArray.value = [];
  gwasScoreSummary.value = null;
  gwasPlottedCells.value = 0;
  nextTick(() => {
    const overlayChart = document.getElementById('umap-chart-gene');
    const heatmapChart = document.getElementById('expressionHeatmap');
    if (overlayChart) Plotly.purge(overlayChart);
    if (heatmapChart) Plotly.purge(heatmapChart);
  });
});


//加载基因和 GWAS traits
onMounted(async () => {
  const params = new URLSearchParams({
    id: route.params.id
  });
  try {
    const response = await fetch(config.apiUrl + `general_getgene.php?${params}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = parseMaybeGzipJson(await response.arrayBuffer());
    if (!data || !Array.isArray(data.genes)) {
      throw new Error('Invalid data structure received');
    }
    genes.value = data.genes.map((gene, index) => ({
      id: index, // 使用数组索引作为 id
      content: gene
    }));
  } catch (error) {
    console.error('Failed to load genes:', error);
  }

  try {
    const data = await getJson('gwas_getTraitList.php');
    gwasTraits.value = data.traits || [];
    if (gwasTraits.value.length > 0) {
      selectedGwasTraitId.value = gwasTraits.value[0].id;
    }
  } catch (error) {
    console.error('Failed to load GWAS traits:', error);
  }
});




//-------------------------------------------------------------
//选中选项后的事件
//⚠️vue3-virtual-scroll-list组件自带的有问题，这里使用全局事件总线
//-------------------------------------------------------------
import { inject } from 'vue';
const eventBus = inject('eventBus')
onMounted(() => {
  eventBus.on('select-item', handleSelectItem);
});
onUnmounted(() => {
  if (eventBus) {
    eventBus.off('select-item', handleSelectItem);
  }
});

const handleSelectItem = (item) => {
  searchQuery.value = item;
  showScroller.value = false;
  syncSingleCellAgentContext({ selectedGene: item, activeTab: 'gene_expression', userPrimaryAction: 'viewing_gene_expression' });
  // 写清基因来自「当前基因表达」模块，避免被 DEG 表的被动刷新说成 DEG 表里的基因。
  syncGeneExpressionContext();
};



// 处理失去焦点时的方法
const handleBlur = () => {
  setTimeout(() => {
    if (!document.activeElement.closest('.scroller')) { // 滚动容器类名 'scroller'
      showScroller.value = false;
    }
  }, 100);
};




//-------------------------------------------------------------
//颜色
//-------------------------------------------------------------
const maxNc = ref(0)

const getColor = (value) => {
  if (value === 0) return 'rgba(148, 163, 184, 0.35)';
  const t = Math.min(value / maxNc.value, 1);
  const h = 0;                    // 红色
  const s = 60 + 40 * t;          // 60% → 100%
  const l = 80 - 35 * t;          // 80% → 45%
  return `hsl(${h}, ${s}%, ${l}%)`;
};

//-------------------------------------------------------------
//获取基因表达量
//-------------------------------------------------------------
const isSearchgene = ref(false);
const mergedGeneArray = ref([]);

const umapGeneLoading = ref(false)

const searchgene = async () => {
  if (umapLoading.value === false) {
    umapGeneLoading.value = true

    // 请求参数
    const params = new URLSearchParams({
      id: route.params.id,
      gene: searchQuery.value
    });

    let jsonData = []; // 默认值为空数组

    try {
      try {
        const response = await fetch(config.apiUrl + `scd_getGeneExpression_bin.php?${params}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        jsonData = parseMaybeGzipJson(await response.arrayBuffer()); // 兼容 gzip 或普通 JSON
      } catch (error) {
        console.error('Error fetching or parsing data:', error);
        // 如果发生任何错误，jsonData保持为默认的空数组
      }

      isSearchgene.value = true;
      overlayResultMode.value = 'gene';
      gwasScoreSummary.value = null;
      gwasPlottedCells.value = 0;
      syncSingleCellAgentContext({ selectedGene: searchQuery.value, activeTab: 'gene_expression', userPrimaryAction: 'viewing_gene_expression' });
      syncGeneExpressionContext();
      // 合并数据
      const ncMap = jsonData.reduce((acc, item) => {
        acc[item.i] = parseFloat(item.nc) || 0;
        return acc;
      }, {});

      // 合并数组
      const mergedArray = umapData.value.map(item => {
        item.nc = ncMap[item.i] || 0;
        return item;
      });
      mergedGeneArray.value = mergedArray;
      jsonData = [];
      //console.log(mergedGeneArray.value);
      // 分类信息
      const categories = [...new Set(mergedArray.map(item => item.c))];
      categories.sort();

      // 安全计算最大值
      maxNc.value = mergedArray.reduce(
        (max, item) => (item.nc > max ? item.nc : max),
        -Infinity
      );
      //-----------创建热图信息------------------------
      /*
      const numCategories = categories.length;
   
      const heatmapData = Array.from({ length: 11 }, () =>
        Array.from({ length: numCategories }, () => 0)
      );
      */
      const ncValues = mergedArray.map(item => item.nc).filter(n => n > 0);
      const minLogNC = Math.log10(Math.min(...ncValues));
      const maxLogNC = Math.log10(Math.max(...ncValues));
      const numBins = 11;
      const heatmapData = Array.from({ length: numBins }, () =>
        Array(categories.length).fill(0)
      );

      mergedArray.forEach(item => {
        const categoryIndex = categories.indexOf(item.c);
        if (categoryIndex !== -1 && item.nc > 0) {
          const logNC = Math.log10(item.nc);

          // 归一化
          const normLogNC = (logNC - minLogNC) / (maxLogNC - minLogNC);
          const expressionIndex = Math.floor(normLogNC * (numBins - 1));  // ✅ 修复这里

          // 边界保护
          const safeIndex = Math.min(Math.max(expressionIndex, 0), numBins - 1);

          if (
            safeIndex >= 0 && safeIndex < heatmapData.length &&
            categoryIndex >= 0 && categoryIndex < categories.length
          ) {
            heatmapData[safeIndex][categoryIndex]++;
          }
        }
      });




      //------------------------------------------------------
      //‼️ 按分类信息创建轨迹
      //按分类创建轨道,可以大幅度提高图表渲染速度和交互流畅😊。
      //------------------------------------------------------
      const traces = categories.map(category => {
        const categoryPoints = mergedArray.filter(point => point.c === category);

        const colors = categoryPoints.map(point => getColor(point.nc));
        return {
          x: categoryPoints.map(point => point.u1),
          y: categoryPoints.map(point => point.u2),
          mode: 'markers',
          type: 'scattergl',
          name: category,
          marker: {
            color: colors,
            size: markerSize2.value,
          },
          text: categoryPoints.map(point => `${point.i}<br>${point.nc}`), // 显示 cell_id 和 nc 信息
        };
      });
      const genelayout = umapLayoutBase();
      Plotly.newPlot('umap-chart-gene', traces, genelayout);

      // 重置左边图为初始视图,并重置勾选框为全选状态
      visibleLabels.value = [...global_clusterLabels.value];
      Plotly.relayout('umap-plot', {
        'xaxis.autorange': true,
        'yaxis.autorange': true
      });

      // 添加缩放事件监听，让右边图的缩放同步到左边图
      document.getElementById('umap-chart-gene').on('plotly_relayout', function(eventdata) {
        if (eventdata && eventdata['xaxis.range[0]'] !== undefined && !isSyncingZoom.value) {
          isSyncingZoom.value = true;
          
          // 获取缩放范围并选择可见的细胞类型
          const xRange = [eventdata['xaxis.range[0]'], eventdata['xaxis.range[1]']];
          const yRange = [eventdata['yaxis.range[0]'], eventdata['yaxis.range[1]']];
          selectVisibleCellTypes(xRange, yRange);
          
          // 同步缩放范围到左边图
          Plotly.relayout('umap-plot', {
            'xaxis.range[0]': eventdata['xaxis.range[0]'],
            'xaxis.range[1]': eventdata['xaxis.range[1]'],
            'yaxis.range[0]': eventdata['yaxis.range[0]'],
            'yaxis.range[1]': eventdata['yaxis.range[1]']
          });
          
          setTimeout(() => {
            isSyncingZoom.value = false;
          }, 100);
        }
      });
      
      // 添加双击重置事件监听，让右边图的双击同步到左边图
      document.getElementById('umap-chart-gene').on('plotly_doubleclick', function() {
        // 重置为全选状态
        visibleLabels.value = [...global_clusterLabels.value];
        
        // 重置左边图的视图
        Plotly.relayout('umap-plot', {
          'xaxis.autorange': true,
          'yaxis.autorange': true
        });
      });
      umapGeneLoading.value = false;



      //-----------绘制热图------------------------
      //各类细胞在不同表达量区间的细胞数量热图
      const layout = {
        autosize: true,
        title: 'Heatmap of Cell Counts Across Expression Levels and Clusters',
        xaxis: {
          title: '',
          showgrid: false,
          tickangle: 45, // 将标签旋转45度
          tickmode: 'linear', // 确保标签均匀分布
          tickfont: { size: 6 }, // 调整字体大小
          tickvals: categories.map((index) => index),
          ticktext: categories,
        },
        yaxis: {
          range: [0, numBins - 1],
          type: 'linear',
          showgrid: false,
          title: 'Gene expression (log10 scale)',
          tickvals: Array.from({ length: numBins }, (_, i) => i),
          ticktext: Array.from({ length: numBins }, (_, i) => {
            const logVal = minLogNC + (i / (numBins - 1)) * (maxLogNC - minLogNC)
            return Math.pow(10, logVal).toFixed(2)  // 显示原始值
          })
        },
      };

      const trace = {
        zauto: false,
        x: categories,
        y: Array.from({ length: numBins }, (_, i) => i),
        z: heatmapData,
        type: 'heatmap',
        colorscale: [
          [0.0, 'rgba(220, 220, 220, 0.1)'],
          [1.0, 'rgb(93, 116, 162)']
        ],
        zmin: 0,  // 设置热图颜色的最小值
        zmax: Math.max(...heatmapData.flat()),
      };

      Plotly.newPlot('expressionHeatmap', [trace], layout);
      
      // 重置左边图的视图到原始大小
      const leftChart = document.getElementById('umap-plot');
      if (leftChart) {
        Plotly.relayout('umap-plot', {
          'xaxis.autorange': true,
          'yaxis.autorange': true
        });
      }
      
      // 重置勾选框为全选状态
      visibleLabels.value = [...global_clusterLabels.value];
    } catch (error) {
      console.error('Failed to load genes:', error);
    }
  }


};

const searchGwasScore = async () => {
  if (umapLoading.value !== false || !selectedGwasTraitId.value) return;
  // 用户切到 GWAS/scDRS 评分模块：把模块归属记下来，避免仍按基因表达模块讲解。
  updateAgentContext({
    modules: scModuleList(),
    activeModule: 'gwas_score',
    activeTab: 'gwas_score',
    userPrimaryAction: 'viewing_gwas_score',
  });
  umapGeneLoading.value = true;
  try {
    const data = await getGzipJson('gwas_getCellScores.php', {
      trait_id: selectedGwasTraitId.value,
      sex: gwasSex.value,
      limit: 0,
    });
    const scores = Array.isArray(data.scores) ? data.scores : [];
    const scoreMap = scores.reduce((acc, item) => {
      const score = getScdrsScoreValue(item);
      if (item.i !== undefined && score !== null) {
        getScdrsIdVariants(item.i).forEach(id => {
          acc[id] = score;
        });
      }
      return acc;
    }, {});
    const mergedArray = umapData.value.map(item => {
      const matchedScore = getScdrsIdVariants(item.i)
        .map(id => scoreMap[id])
        .find(value => Number.isFinite(value));
      return {
        ...item,
        score: matchedScore ?? null,
      };
    });
    mergedGeneArray.value = mergedArray;
    isSearchgene.value = true;
    overlayResultMode.value = 'gwas';
    gwasScoreSummary.value = data;

    const categories = [...new Set(mergedArray.map(item => item.c))].sort();
    const scoreValues = mergedArray.map(item => item.score).filter(value => Number.isFinite(value));
    gwasPlottedCells.value = scoreValues.length;
    const minScore = scoreValues.length ? Math.min(...scoreValues) : 0;
    const maxScore = scoreValues.length ? Math.max(...scoreValues) : 0;

    Plotly.newPlot('umap-chart-gene', buildGwasOverlayTraces(mergedArray), buildOverlayLayout());

    const numBins = 11;
    const heatmapData = Array.from({ length: numBins }, () => Array(categories.length).fill(0));
    const span = maxScore - minScore;
    mergedArray.forEach(item => {
      if (!Number.isFinite(item.score)) return;
      const categoryIndex = categories.indexOf(item.c);
      const binIndex = span === 0 ? Math.floor(numBins / 2) : Math.min(Math.max(Math.floor(((item.score - minScore) / span) * (numBins - 1)), 0), numBins - 1);
      if (categoryIndex !== -1) heatmapData[binIndex][categoryIndex]++;
    });

    const matchedCells = data.matched_cells ?? scoreValues.length;
    Plotly.newPlot('expressionHeatmap', [{
      x: categories,
      y: Array.from({ length: numBins }, (_, i) => i),
      z: heatmapData,
      type: 'heatmap',
      colorscale: [[0, 'rgba(220,220,220,0.1)'], [1, 'rgb(176,138,48)']],
      zmin: 0,
      zmax: Math.max(...heatmapData.flat(), 1),
    }], {
      autosize: true,
      title: `scDRS score distribution (${Number(matchedCells || 0).toLocaleString()} matched cells)`,
      xaxis: { title: '', showgrid: false, tickangle: 45, tickfont: { size: 6 } },
      yaxis: {
        title: 'scDRS score',
        tickvals: Array.from({ length: numBins }, (_, i) => i),
        ticktext: Array.from({ length: numBins }, (_, i) => span === 0 ? minScore.toFixed(3) : (minScore + (i / (numBins - 1)) * span).toFixed(3)),
      },
    });

    visibleLabels.value = [...global_clusterLabels.value];
    Plotly.relayout('umap-plot', { 'xaxis.autorange': true, 'yaxis.autorange': true });

    document.getElementById('umap-chart-gene').on('plotly_relayout', function(eventdata) {
      if (eventdata && eventdata['xaxis.range[0]'] !== undefined && !isSyncingZoom.value) {
        isSyncingZoom.value = true;
        const xRange = [eventdata['xaxis.range[0]'], eventdata['xaxis.range[1]']];
        const yRange = [eventdata['yaxis.range[0]'], eventdata['yaxis.range[1]']];
        selectVisibleCellTypes(xRange, yRange);
        Plotly.relayout('umap-plot', {
          'xaxis.range[0]': eventdata['xaxis.range[0]'],
          'xaxis.range[1]': eventdata['xaxis.range[1]'],
          'yaxis.range[0]': eventdata['yaxis.range[0]'],
          'yaxis.range[1]': eventdata['yaxis.range[1]']
        });
        setTimeout(() => { isSyncingZoom.value = false; }, 100);
      }
    });

    document.getElementById('umap-chart-gene').on('plotly_doubleclick', function() {
      visibleLabels.value = [...global_clusterLabels.value];
      Plotly.relayout('umap-plot', { 'xaxis.autorange': true, 'yaxis.autorange': true });
    });
  } catch (error) {
    console.warn('GWAS/scDRS 评分暂无数据:', error.message);
    gwasScoreSummary.value = null;
    gwasPlottedCells.value = 0;
    ElMessage.warning(t('scd23_no_score_data'));
  } finally {
    umapGeneLoading.value = false;
  }
};

const { t } = useI18n();

// 更新 UMAP 图2 的点大小
const updateUmap2 = () => {
  if (isSearchgene.value !== true) return;
  if (overlayResultMode.value === 'gwas') {
    updateGenePlot();
  } else {
    Plotly.restyle('umap-chart-gene', 'marker.size', [markerSize2.value]);
  }
};


//###################################//
//差异表达分析
//###################################//

const group = ref('cellTypeSpecificGenes');
const cellTypes = ref([]);
const cellType = ref('');
const log2fc = ref(0);

const pageSize = ref(10);
//const pvalue = ref(5);
const selectedDirection = ref('all');

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const normalizeDEGRow = (item = {}) => ({
  ...item,
  i: item.i ?? item.gene_id ?? item.gene ?? item.feature_name ?? '',
  fc: toNumber(item.fc ?? item.f ?? item.log2fc),
  f: toNumber(item.f ?? item.fc ?? item.log2fc),
  a: toNumber(item.a ?? item.padj ?? item.adjusted_pvalue ?? item.pvalue, 1),
  t1: toNumber(item.t1 ?? item.pct1 ?? item.pct_1),
  t2: toNumber(item.t2 ?? item.pct2 ?? item.pct_2),
});

const DEGdata = ref([]);
const currentPage = ref(1);
const itemsPerPage = ref(10);

const filterDEGGenes = ref('');

const pValueSliderIndex = ref(5)  // 默认 0.05
// 定义 slider 的值及 label
const logPValues = [1e-6, 1e-5, 1e-4, 1e-3, 0.01, 0.05, 0.1, 0.5]
const pValueMarks = {
  0: '10⁻⁶',
  1: '10⁻⁵',
  2: '10⁻⁴',
  3: '10⁻³',
  4: '0.01',
  5: '0.05',
  6: '0.1',
  7: '0.5',
}

const formattedPValue = computed(() => logPValues[pValueSliderIndex.value])

const loadingDEG = ref(true);
const makeNotice = (message = '', type = 'info') => ({ message, type });
const DEGnotice = ref(makeNotice());
const KEGGnotice = ref(makeNotice());
const GOBPnotice = ref(makeNotice());
const GOMFnotice = ref(makeNotice());
const GOCCnotice = ref(makeNotice());
const DEGemptyText = computed(() => DEGnotice.value.message || 'No DEG records found for the selected cluster/filter.');
const KEGGemptyText = computed(() => KEGGnotice.value.message || 'No KEGG enrichment terms found.');

const GOCCemptyText = computed(() => GOCCnotice.value.message || 'No GO Cellular Component terms found.');
const requestErrorMessage = (error, label) => {
  const msg = error?.message || String(error || 'Unknown error');
  return msg.includes('Failed to fetch') ? `${label}: network request failed.` : `${label}: ${msg}`;
};
//----------------------------------
//基因富集分析部分的变量
const KEGGdata = ref([]);
const isenrichmentExpanded1 = ref("");
const isenrichmentExpanded2 = ref("");
const isenrichmentExpanded3 = ref("");
const isenrichmentExpanded4 = ref("");

//----------------------------------


// 图 → 数据（P4）：把 ?cluster= 里的标签对到真实细胞类型上。
// 组成图的标签常比 cellTypes 里的名字长（"Astro AQP4 SLC1A2" vs "Astro"），
// 所以先精确匹配，再做一次前缀匹配，避免退化成"永远选第一个"。
function matchCellType(rawWanted) {
  const wanted = String(rawWanted || '').trim().toLowerCase();
  if (!wanted) return '';
  return cellTypes.value.find((item) => {
    const name = String(item || '').trim().toLowerCase();
    if (!name) return false;
    return name === wanted || wanted.startsWith(name) || name.startsWith(wanted);
  }) || '';
}

// 已经在详情页时再从图里点另一个细胞类型：只是 query 变化，组件不会重新挂载，
// 因此要监听 query 主动切换（否则点了没反应）。
watch(() => route.query.cluster, (value) => {
  const hit = matchCellType(value);
  if (hit && hit !== cellType.value) cellType.value = hit;
});

//------------------------------------------------------//
//默认加载第一个细胞类型的差异数据
//------------------------------------------------------//
onMounted(() => {
  const params = new URLSearchParams({
    id: route.params.id,
  });
  fetch(config.apiUrl + `general_DEG_CellType.php?${params}`)
    .then((response) => response.json())
    .then((data) => {
      cellTypes.value = data || [];
      if (cellTypes.value.length > 0) {
        // 图 → 数据（P4）：从细胞类型组成图点某个柱子跳过来时（?cluster=Astro），
        // 直接选中该细胞类型；选中会触发下面的 watch，自动取这个 cluster 的 DEG。
        cellType.value = matchCellType(route.query.cluster) || cellTypes.value[0];
      }
      loadingDEG.value = false;
    })
    .catch((error) => {
      console.error("Failed to load cell types:", error);
      loadingDEG.value = false;
    });
});

//------------------------------------------------------//
//检测用户更换细胞类型
//------------------------------------------------------//
watch(cellType, async (newcellType) => {
  syncSingleCellAgentContext({ selectedCellType: newcellType || '', activeTab: 'DEG' });
  if (!newcellType) { loadingDEG.value = false; return; }
  loadingDEG.value = true;
  //获取差异数据
  const params = new URLSearchParams({
    id: route.params.id,
    cluster: newcellType
  });
  fetch(config.apiUrl + `general_getDEG_ByCluster.php?${params}`)
    .then((response) => response.arrayBuffer())
    .then((arrayBuffer) => {
      const parsed = parseMaybeGzipJson(arrayBuffer);
      if (Array.isArray(parsed) && parsed.length > 0) {
        DEGdata.value = parsed.map(normalizeDEGRow);
        console.log('[DEG] loaded', parsed.length, 'rows for cluster', newcellType);
      } else {
        DEGdata.value = [];
        console.warn('[DEG] empty or unexpected data for cluster', newcellType, parsed);
      }
      currentPage.value = 1;//回到第一页
      loadingDEG.value = false;
    })
    .catch((error) => {
      console.error("[DEG] Failed to load DEGs:", error);
      DEGdata.value = [];
      DEGnotice.value = makeNotice(requestErrorMessage(error, 'Failed to load DEGs'), 'error');
      loadingDEG.value = false;
    });
});



//------------------------------------------------------
//差异表达分析分页计算
//------------------------------------------------------
const filteredData = computed(() => {
  return DEGdata.value.filter(item => {
    currentPage.value = 1;
    const logFoldChange = toNumber(item.fc);
    const adjustedPvalue = toNumber(item.a, 1);
    // 将 filterDEGGenes.value 和 item.i 都转换为小写，然后检查是否包含
    const lowerCaseFilter = (filterDEGGenes.value || '').toLowerCase();
    const lowerCaseItemI = String(item.i || '').toLowerCase();

    let directionFilter = true;
    if (selectedDirection.value === 'up' && logFoldChange < 0) {
      directionFilter = false;
    } else if (selectedDirection.value === 'down' && logFoldChange > 0) {
      directionFilter = false;
    }

    return Math.abs(logFoldChange) >= log2fc.value &&
      adjustedPvalue <= formattedPValue.value &&
      lowerCaseItemI.includes(lowerCaseFilter) &&
      directionFilter;
  });
});
function handlePageChange(page) {
  currentPage.value = page
  // 你可以在这里重新 slice 数据用于渲染当前页内容
}

// DEG 筛选条件的人读描述，供 AI 引用「当前筛了什么」。
function degFilterText() {
  const parts = [`padj<=${formattedPValue.value}`, `|log2FC|>=${log2fc.value}`];
  if (selectedDirection.value === 'up') parts.push('方向=上调');
  if (selectedDirection.value === 'down') parts.push('方向=下调');
  if (filterDEGGenes.value) parts.push(`基因包含 ${filterDEGGenes.value}`);
  return parts.join(', ');
}

// 把「选中的细胞类型 / 基因 / DEG 筛选条件」与「用户肉眼可见的 DEG 行」写回上下文，
// 让 AI 能回答「这个数据怎么看」。只取 Top 20 行，且每行带来源标记。
function syncDEGContext(options = {}) {
  const userAction = options.userAction === true;
  const degGene = String(filterDEGGenes.value || '').trim();
  const gene = degGene || (geneSourceModule.value === 'gene_expression' ? String(searchQuery.value || '').trim() : '');
  const geneSource = degGene
    ? SC_MODULE_LABELS.deg_table
    : (SC_MODULE_LABELS[geneSourceModule.value] || '');

  const partial = {
    selection: {
      selectedCellType: cellType.value || '',
      selectedGene: gene,
      geneSource: gene ? geneSource : '',
      degFilter: degFilterText(),
    },
    visibleData: filteredData.value.slice(0, 20).map(row => ({
      gene: row.i || '',
      log2FC: row.fc,
      padj: row.a,
      pct1: row.t1,
      pct2: row.t2,
      source: 'DEG 表',
    })),
    modules: scModuleList(),
  };

  // 只有用户在 DEG 模块里真的动了筛选条件，才把模块切到 DEG 表。
  // 被动刷新（数据加载完、排序变化）不切模块，免得抢走「当前基因表达」的归属。
  if (userAction) {
    partial.activeModule = 'deg_table';
    partial.activeTab = 'DEG';
    partial.userPrimaryAction = 'viewing_deg_table';
  }
  updateAgentContext(partial);
}

// 数据加载完成 / 筛选变化时同步上报（被动刷新，不改变模块归属）。
watch(filteredData, () => {
  syncDEGContext();
});

// 用户主动调整 DEG 筛选条件：这是真实操作，模块归属切到 DEG 表。
watch([filterDEGGenes, log2fc, selectedDirection, pValueSliderIndex], () => {
  if (String(filterDEGGenes.value || '').trim()) geneSourceModule.value = 'deg_table';
  syncDEGContext({ userAction: true });
});
//------------------------------------------------------
//数据发生变化，需要基因富集分析数据，折叠基因富集分析面板
//------------------------------------------------------
watch(filteredData, () => {
  KEGGdata.value = [];
  isenrichmentExpanded1.value = "";
  GOBPdata.value = [];
  isenrichmentExpanded2.value = "";
  GOMFdata.value = [];
  isenrichmentExpanded3.value = "";
  GOCCdata.value = [];
  isenrichmentExpanded4.value = "";
});

/*
const totalPages = computed(() => {
  // 总页数基于筛选后的数据集计算
  return Math.ceil(filteredData.value.length / itemsPerPage.value);
});
*/
const paginatedData = computed(() => {
  // 分页应用于筛选后的数据集
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return sortedData.value.slice(start, end);
});

/*
const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};
*/
const headers = ['gene name', 'Adjusted p-value', 'Log fold-change', 'Pct.1', 'Pct.2'];
const download = () => {
  // 创建一个二维数组，每个元素都是表格的一行
  const dataForTable = filteredData.value.map((item) => {
    return Object.values(item);
  });

  // 创建 CSV 字符串
  const csvContent = [headers.join(",")].concat(dataForTable.map(e => e.join(","))).join("\n");

  // 创建一个下载链接
  const link = document.createElement("a");
  link.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
  link.target = "_blank";
  link.download = "ssMOOD-" + route.params.id + "-deg.csv"; // 指定下载的文件名
  link.click();
};

//------------------------------------------------------
//差异数据排序
//------------------------------------------------------

const sortProp = ref('') // 当前排序字段
const sortOrder = ref('') // asc / desc

// 排序计算属性
const sortedData = computed(() => {
  if (!sortProp.value || !sortOrder.value) {
    return filteredData.value
  }
  // 排序逻辑
  return [...filteredData.value].sort((a, b) => {
    const prop = sortProp.value
    let res = 0
    if (prop === 'i') {
      // 字符串排序
      res = String(a.i || '').localeCompare(String(b.i || ''))
    } else {
      // 数字排序
      res = toNumber(a[prop]) - toNumber(b[prop])
    }
    return sortOrder.value === 'ascending' ? res : -res
  })
})

// 监听排序变化
function handleSortChange({ prop, order }) {
  currentPage.value = 1;
  sortProp.value = prop
  sortOrder.value = order
}

//##########################################################################################//
//KEGG分析
//##########################################################################################//


//const isenrichmentExpanded1 = ref(false);定义在差异部分
//const KEGGdata = ref([]);定义在差异部分

const KEGGcurrentPage = ref(1);
const KEGGitemsPerPage = ref(10);

const filterKEGG = ref('');

const KeggGenes = computed(() => {
  return filteredData.value.map(item => item.i);
});

const loadingKEGG = ref(true);

//------------------------------------------------------//
//向服务器请求kegg数据
//------------------------------------------------------//
const getKEGG = (activeNames) => {
  // activeNames 是当前展开面板的 name 数组
  const isOpen = activeNames.includes('1')

  if (isOpen) {
    // 1. 展开：开始加载
    loadingKEGG.value = true
    KEGGdata.value = []          // 先清空旧数据（防止闪旧值）
    KEGGnotice.value = makeNotice();

    const genesJson = JSON.stringify(KeggGenes.value)
    const params = new FormData()
    params.append('genes', genesJson)
    console.log(dataset.value.species)
    if (dataset.value.species === "mouse") { params.append('gene_sets', 'KEGG_2019_Mouse.gmt') }
    else { params.append('gene_sets', 'KEGG_2019_Human.gmt') }

    params.append('id', route.params.id)

    fetch(config.apiUrl + 'enrichment.php', {
      method: 'POST',
      body: params
    })
      .then(res => {
        if (!res.ok) throw new Error('Network error: ' + res.status)
        return res.text()
      })
      .then(text => {
        try {
          const data = JSON.parse(text)
          if (Array.isArray(data)) {
            console.log('[KEGG] loaded', data.length, 'rows')
            KEGGdata.value = data
          } else {
            console.warn('[KEGG] non-array response:', data)
            KEGGdata.value = []
          }
        } catch (e) {
          console.warn('[KEGG] Server returned non-JSON:', text)
          KEGGdata.value = []
        }
      })
      .catch(err => {
        console.error('Failed to load KEGG:', err)
        KEGGnotice.value = makeNotice(requestErrorMessage(err, 'Failed to load KEGG'), 'error')
      })
      .finally(() => {
        loadingKEGG.value = false
      })
  } else {
    // 2. 折叠：仅清空
    KEGGdata.value = []
    KEGGnotice.value = makeNotice()
    loadingKEGG.value = false
  }
}




//------------------------------------------------------//
//按名字过滤通路
//------------------------------------------------------//
const KEGGfilteredData = computed(() => {
  return KEGGdata.value.filter(item => {
    KEGGcurrentPage.value = 1;
    // 将 filterDEGGenes.value 和 item.i 都转换为小写，然后检查是否包含
    const lowerCaseFilter = filterKEGG.value.toLowerCase();
    const lowerCaseItemI = item.t.toLowerCase();


    return lowerCaseItemI.includes(lowerCaseFilter);
  });
});
//console.log(KEGGfilteredData.value);


const KEGGpaginatedData = computed(() => {
  // 分页应用于筛选后的数据集
  const start = (KEGGcurrentPage.value - 1) * KEGGitemsPerPage.value;
  const end = start + KEGGitemsPerPage.value;
  return KEGGsortedData.value.slice(start, end);
});


function handleKEGGPageChange(page) {
  KEGGcurrentPage.value = page;
}

const KEGGsortProp = ref('')
const KEGGsortOrder = ref('')

// 排序计算属性
const KEGGsortedData = computed(() => {
  if (!KEGGsortProp.value || !KEGGsortOrder.value) {
    return KEGGfilteredData.value
  }

  const sortPaths = KEGGsortProp.value.split(',').map(s => s.trim())

  return [...KEGGfilteredData.value].sort((a, b) => {
    for (const path of sortPaths) {
      const valA = getNestedValue(a, path)
      const valB = getNestedValue(b, path)

      let res = 0
      if (typeof valA === 'string' && typeof valB === 'string') {
        res = valA.localeCompare(valB)
      } else {
        res = (valA ?? 0) - (valB ?? 0)
      }

      if (res !== 0) {
        return KEGGsortOrder.value === 'ascending' ? res : -res
      }
      // 如果当前字段相等，继续比较下一个字段
    }
    return 0
  })
})

// 辅助函数：通过字符串路径访问嵌套对象属性
function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}


// 监听排序变化
function handleKEGGSortChange({ prop, order }) {
  KEGGcurrentPage.value = 1;
  KEGGsortProp.value = prop
  KEGGsortOrder.value = order
}
//------------------------------------------------------//
//保存kegg数据为CSV
//------------------------------------------------------//
const KEGGheaders = ['Term', 'Adjusted p-value', 'Odds Ratio', 'Combined Score', 'Genes'];
const KEGGdownload = () => {
  // 创建一个二维数组，每个元素都是表格的一行
  const dataForTable = KEGGfilteredData.value.map((item) => {
    return Object.values(item);
  });

  // 创建 CSV 字符串
  const csvContent = [KEGGheaders.join(",")].concat(dataForTable.map(e => e.join(","))).join("\n");

  // 创建一个下载链接
  const link = document.createElement("a");
  link.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
  link.target = "_blank";
  link.download = "ssMOOD-" + route.params.id + "-kegg.csv"; // 指定下载的文件名
  link.click();
};


//------------------------------------------------------//
//基因列表模态窗
//------------------------------------------------------//

// 模态窗状态
const isKeggModalOpen = ref(false);
const selectedKeggGene = ref([]);

// 打开模态窗
const openKeggModal = (gene) => {
  selectedKeggGene.value = gene.split(';');
  isKeggModalOpen.value = true;
};

/*
// 关闭模态窗
const closeKeggModal = () => {
  isKeggModalOpen.value = false;
};
*/


//###############################################################################################//
// GO_BP 分析
//###############################################################################################//

const GOBPcurrentPage = ref(1);
const GOitemsPerPage = ref(10);
const filterGOBP = ref('');
const loadingGOBP = ref(false);
const GOBPdata = ref([]);

const GOGenes = computed(() => {
  return filteredData.value.map(item => item.i);
});

//------------------------------------------------------//
// 向服务器请求 GO BP 数据
//------------------------------------------------------//
const getGO_BP = (activeNames) => {
  const isOpen = activeNames.includes('1');
  if (!isOpen) {
    GOBPdata.value = [];
    GOBPnotice.value = makeNotice();
    loadingGOBP.value = false;
    return;
  }

  loadingGOBP.value = true;
  GOBPdata.value = [];

  const genesJson = JSON.stringify(GOGenes.value);
  const params = new FormData();
  params.append('genes', genesJson);
  params.append('gene_sets', 'GO_BP_2018.gmt');

  params.append('id', route.params.id);

  fetch(config.apiUrl + 'enrichment.php', {
    method: 'POST',
    body: params
  })
    .then(res => {
      if (!res.ok) throw new Error('Network error: ' + res.status);
      return res.text();
    })
    .then(text => {
      try {
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          console.log('[GO_BP] loaded', data.length, 'rows');
          GOBPdata.value = data;
        } else {
          console.warn('[GO_BP] non-array response:', data);
          GOBPdata.value = [];
        }
      } catch (e) {
        console.warn('[GO_BP] Server returned non-JSON:', text);
        GOBPdata.value = [];
      }
    })
    .catch(err => {
      console.error('Failed to load GO_BP:', err);
      GOBPnotice.value = makeNotice(requestErrorMessage(err, 'Failed to load GO_BP'), 'error');
    })
    .finally(() => {
      loadingGOBP.value = false;
    });
};

//------------------------------------------------------//
// 搜索过滤
//------------------------------------------------------//
const GOBPfilteredData = computed(() => {
  //GOBPcurrentPage.value = 1;
  const keyword = filterGOBP.value.toLowerCase();
  return GOBPdata.value.filter(item => item.t.toLowerCase().includes(keyword));
});

//------------------------------------------------------//
// 排序处理
//------------------------------------------------------//
const GOBPsortProp = ref('');
const GOBPsortOrder = ref('');

const GOBPsortedData = computed(() => {
  if (!GOBPsortProp.value || !GOBPsortOrder.value) return GOBPfilteredData.value;

  const sortPaths = GOBPsortProp.value.split(',').map(s => s.trim());
  return [...GOBPfilteredData.value].sort((a, b) => {
    for (const path of sortPaths) {
      const valA = getNestedValue(a, path);
      const valB = getNestedValue(b, path);
      let res = 0;
      if (typeof valA === 'string' && typeof valB === 'string') {
        res = valA.localeCompare(valB);
      } else {
        res = (valA ?? 0) - (valB ?? 0);
      }
      if (res !== 0) {
        return GOBPsortOrder.value === 'ascending' ? res : -res;
      }
    }
    return 0;
  });
});

function handleGOBPSortChange({ prop, order }) {
  GOBPcurrentPage.value = 1;
  GOBPsortProp.value = prop;
  GOBPsortOrder.value = order;
}

//------------------------------------------------------//
// 分页
//------------------------------------------------------//
const GOBPpaginatedData = computed(() => {
  const start = (GOBPcurrentPage.value - 1) * GOitemsPerPage.value;
  const end = start + GOitemsPerPage.value;
  return GOBPsortedData.value.slice(start, end);
});

function handleGOBPPageChange(page) {
  GOBPcurrentPage.value = page;
}

//------------------------------------------------------//
// 下载 CSV
//------------------------------------------------------//
const GOBPheaders = ['Term', 'Adjusted p-value', 'Odds Ratio', 'Combined Score', 'Genes'];
const GOBPdownload = () => {
  const dataForTable = GOBPfilteredData.value.map(item => Object.values(item));
  const csvContent = [GOBPheaders.join(",")].concat(dataForTable.map(e => e.join(","))).join("\n");

  const link = document.createElement("a");
  link.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
  link.target = "_blank";
  link.download = "ssMOOD-" + route.params.id + "-goBP.csv";
  link.click();
};

//------------------------------------------------------//
// 模态窗 - 显示基因列表
//------------------------------------------------------//
const isGOBPModalOpen = ref(false);
const selectedGOBPGene = ref([]);

const openGOBPModal = (gene) => {
  selectedGOBPGene.value = gene.split(';');
  isGOBPModalOpen.value = true;
};



//###############################################################################################//
// GO_MF 分析
//###############################################################################################//

const GOMFcurrentPage = ref(1);
const filterGOMF = ref('');
const loadingGOMF = ref(false);
const GOMFdata = ref([]);

/*无需重复定义
const GOGenes = computed(() => {
  return filteredData.value.map(item => item.i);
});
*/
//------------------------------------------------------//
// 向服务器请求 GO MF 数据
//------------------------------------------------------//
const getGO_MF = (activeNames) => {
  const isOpen = activeNames.includes('1');
  if (!isOpen) {
    GOMFdata.value = [];
    loadingGOMF.value = false;
    return;
  }

  loadingGOMF.value = true;
  GOMFdata.value = [];

  const genesJson = JSON.stringify(GOGenes.value);
  const params = new FormData();
  params.append('genes', genesJson);
  params.append('gene_sets', 'GO_MF_2018.gmt');

  params.append('id', route.params.id);

  fetch(config.apiUrl + 'enrichment.php', {
    method: 'POST',
    body: params
  })
    .then(res => {
      if (!res.ok) throw new Error('Network error: ' + res.status);
      return res.text();
    })
    .then(text => {
      try {
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          console.log('[GO_MF] loaded', data.length, 'rows');
          GOMFdata.value = data;
          GOMFnotice.value = data.length ? makeNotice() : makeNotice('No GO Molecular Function terms found.', 'info');
        } else {
          console.warn('[GO_MF] non-array response:', data);
          GOMFdata.value = [];
          GOMFnotice.value = makeNotice(data?.error || 'Unexpected GO_MF response format.', 'error');
        }
      } catch (e) {
        console.warn('[GO_MF] Server returned non-JSON:', text);
        GOMFdata.value = [];
        GOMFnotice.value = makeNotice('GO_MF returned non-JSON response. Check server logs.', 'error');
      }
    })
    .catch(err => {
      console.error('Failed to load GO_MF:', err);
      GOMFnotice.value = makeNotice(requestErrorMessage(err, 'Failed to load GO_MF'), 'error');
    })
    .finally(() => {
      loadingGOMF.value = false;
    });
};

//------------------------------------------------------//
// 搜索过滤
//------------------------------------------------------//
const GOMFfilteredData = computed(() => {
  //GOMFcurrentPage.value = 1;
  const keyword = filterGOMF.value.toLowerCase();
  return GOMFdata.value.filter(item => item.t.toLowerCase().includes(keyword));
});

//------------------------------------------------------//
// 排序处理
//------------------------------------------------------//
const GOMFsortProp = ref('');
const GOMFsortOrder = ref('');

const GOMFsortedData = computed(() => {
  if (!GOMFsortProp.value || !GOMFsortOrder.value) return GOMFfilteredData.value;

  const sortPaths = GOMFsortProp.value.split(',').map(s => s.trim());
  return [...GOMFfilteredData.value].sort((a, b) => {
    for (const path of sortPaths) {
      const valA = getNestedValue(a, path);
      const valB = getNestedValue(b, path);
      let res = 0;
      if (typeof valA === 'string' && typeof valB === 'string') {
        res = valA.localeCompare(valB);
      } else {
        res = (valA ?? 0) - (valB ?? 0);
      }
      if (res !== 0) {
        return GOMFsortOrder.value === 'ascending' ? res : -res;
      }
    }
    return 0;
  });
});

function handleGOMFSortChange({ prop, order }) {
  GOMFcurrentPage.value = 1;
  GOMFsortProp.value = prop;
  GOMFsortOrder.value = order;
}

//------------------------------------------------------//
// 分页
//------------------------------------------------------//
const GOMFpaginatedData = computed(() => {
  const start = (GOMFcurrentPage.value - 1) * GOitemsPerPage.value;
  const end = start + GOitemsPerPage.value;
  return GOMFsortedData.value.slice(start, end);
});

function handleGOMFPageChange(page) {
  GOMFcurrentPage.value = page;
}

//------------------------------------------------------//
// 下载 CSV
//------------------------------------------------------//
const GOMFheaders = ['Term', 'Adjusted p-value', 'Odds Ratio', 'Combined Score', 'Genes'];
const GOMFdownload = () => {
  const dataForTable = GOMFfilteredData.value.map(item => Object.values(item));
  const csvContent = [GOMFheaders.join(",")].concat(dataForTable.map(e => e.join(","))).join("\n");

  const link = document.createElement("a");
  link.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
  link.target = "_blank";
  link.download = "ssMOOD-" + route.params.id + "-goMF.csv";
  link.click();
};

//------------------------------------------------------//
// 模态窗 - 显示基因列表
//------------------------------------------------------//
const isGOMFModalOpen = ref(false);
const selectedGOMFGene = ref([]);

const openGOMFModal = (gene) => {
  selectedGOMFGene.value = gene.split(';');
  isGOMFModalOpen.value = true;
};

//###############################################################################################//
// GO_CC 分析
//###############################################################################################//

const GOCCcurrentPage = ref(1);
const filterGOCC = ref('');
const loadingGOCC = ref(false);
const GOCCdata = ref([]);

/*无需重复定义，基因列表共用
const GOGenes = computed(() => {
  return filteredData.value.map(item => item.i);
});
*/
//------------------------------------------------------//
// 向服务器请求 GO CC 数据
//------------------------------------------------------//
const getGO_CC = (activeNames) => {
  const isOpen = activeNames.includes('1');
  if (!isOpen) {
    GOCCdata.value = [];
    GOCCnotice.value = makeNotice();
    loadingGOCC.value = false;
    return;
  }

  loadingGOCC.value = true;
  GOCCdata.value = [];

  const genesJson = JSON.stringify(GOGenes.value);
  const params = new FormData();
  params.append('genes', genesJson);
  params.append('gene_sets', 'GO_CC_2018.gmt');

  params.append('id', route.params.id);

  fetch(config.apiUrl + 'enrichment.php', {
    method: 'POST',
    body: params
  })
    .then(res => {
      if (!res.ok) throw new Error('Network error: ' + res.status);
      return res.text();
    })
    .then(text => {
      try {
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          console.log('[GO_CC] loaded', data.length, 'rows');
          GOCCdata.value = data;
        } else {
          console.warn('[GO_CC] non-array response:', data);
          GOCCdata.value = [];
        }
      } catch (e) {
        console.warn('[GO_CC] Server returned non-JSON:', text);
        GOCCdata.value = [];
      }
    })
    .catch(err => {
      console.error('Failed to load GO_CC:', err);
      GOCCnotice.value = makeNotice(requestErrorMessage(err, 'Failed to load GO_CC'), 'error');
    })
    .finally(() => {
      loadingGOCC.value = false;
    });
};

//------------------------------------------------------//
// 搜索过滤
//------------------------------------------------------//
const GOCCfilteredData = computed(() => {
  //GOCCcurrentPage.value = 1;
  const keyword = filterGOCC.value.toLowerCase();
  return GOCCdata.value.filter(item => item.t.toLowerCase().includes(keyword));
});

//------------------------------------------------------//
// 排序处理
//------------------------------------------------------//
const GOCCsortProp = ref('');
const GOCCsortOrder = ref('');

const GOCCsortedData = computed(() => {
  if (!GOCCsortProp.value || !GOCCsortOrder.value) return GOCCfilteredData.value;

  const sortPaths = GOCCsortProp.value.split(',').map(s => s.trim());
  return [...GOCCfilteredData.value].sort((a, b) => {
    for (const path of sortPaths) {
      const valA = getNestedValue(a, path);
      const valB = getNestedValue(b, path);
      let res = 0;
      if (typeof valA === 'string' && typeof valB === 'string') {
        res = valA.localeCompare(valB);
      } else {
        res = (valA ?? 0) - (valB ?? 0);
      }
      if (res !== 0) {
        return GOCCsortOrder.value === 'ascending' ? res : -res;
      }
    }
    return 0;
  });
});

function handleGOCCSortChange({ prop, order }) {
  GOCCcurrentPage.value = 1;
  GOCCsortProp.value = prop;
  GOCCsortOrder.value = order;
}

//------------------------------------------------------//
// 分页
//------------------------------------------------------//
const GOCCpaginatedData = computed(() => {
  const start = (GOCCcurrentPage.value - 1) * GOitemsPerPage.value;
  const end = start + GOitemsPerPage.value;
  return GOCCsortedData.value.slice(start, end);
});

function handleGOCCPageChange(page) {
  GOCCcurrentPage.value = page;
}

//------------------------------------------------------//
// 下载 CSV
//------------------------------------------------------//
const GOCCheaders = ['Term', 'Adjusted p-value', 'Odds Ratio', 'Combined Score', 'Genes'];
const GOCCdownload = () => {
  const dataForTable = GOCCfilteredData.value.map(item => Object.values(item));
  const csvContent = [GOCCheaders.join(",")].concat(dataForTable.map(e => e.join(","))).join("\n");

  const link = document.createElement("a");
  link.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
  link.target = "_blank";
  link.download = "ssMOOD-" + route.params.id + "-goCC.csv";
  link.click();
};

//------------------------------------------------------//
// 模态窗 - 显示基因列表
//------------------------------------------------------//
const isGOCCModalOpen = ref(false);
const selectedGOCCGene = ref([]);

const openGOCCModal = (gene) => {
  selectedGOCCGene.value = gene.split(';');
  isGOCCModalOpen.value = true;
};





//-------所有富集分析共用------------//
const openLink = (gene, linkType) => {
  let url;
  if (linkType === 'link1') {
    url = `https://www.uniprot.org/uniprotkb/?query=${gene}`;
  } else if (linkType === 'link2') {
    url = `https://www.genecards.org/cgi-bin/carddisp.pl?gene=${gene}`;
  }
  window.open(url, '_blank');
};


//------检测页面的宽度变化------------//
onMounted(() => {
  window.addEventListener('resize', resizeMyChart);
});
const resizeMyChart = () => {
  Plotly.Plots.resize('myClusterChart');
  Plotly.Plots.resize('umap-plot');
  if (isSearchgene.value === true) {
    Plotly.Plots.resize('umap-chart-gene');
    Plotly.Plots.resize('expressionHeatmap');
  }

};

onUnmounted(() => {
  window.removeEventListener('resize', resizeMyChart);
  genes.value = [];
  umapData.value = [];
  mergedGeneArray.value = [];
  KEGGdata.value = [];
  GOBPdata.value = [];
  GOMFdata.value = [];
  GOCCdata.value = [];
});

</script>

<style scoped>
@import 'css/MainStyles.css';
@import 'css/SCDStyles.css';

/* ----------------------------------------------------------- */
.scroller-wrapper {
  height: 400px;
}

.plot-comparison-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-template-rows: auto auto;
  column-gap: 24px;
  row-gap: 14px;
  align-items: stretch;
}

.plot-comparison-grid .information-left,
.plot-comparison-grid .information-right {
  width: auto;
  min-width: 0;
  margin: 0;
}

.plot-panel {
  display: grid;
  grid-row: span 2;
  grid-template-rows: auto auto;
  grid-template-rows: subgrid;
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--ss-border-soft, #e5eaf2);
  border-radius: 12px;
  background: linear-gradient(180deg, #fff 0%, #f8fafd 100%);
}

.plot-panel-header {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
  flex-shrink: 0;
}

.overlay-mode-tabs {
  display: inline-flex;
  align-self: flex-start;
  gap: 2px;
  padding: 4px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.overlay-tab {
  padding: 6px 18px;
  border-radius: 7px;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  color: #64748b;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  transition: color .2s ease, background-color .2s ease, box-shadow .2s ease;
}

.overlay-tab:hover:not(.active) {
  color: #334155;
  background: rgba(255, 255, 255, .65);
}

.overlay-tab.active {
  color: #1d4ed8;
  font-weight: 600;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, .08), 0 1px 3px rgba(15, 23, 42, .1);
}

.plot-panel-header h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.35;
  color: #0f172a;
}

.plot-toolbar {
  display: flex;
  align-items: center;
  width: auto;
  height: auto;
  min-height: 40px;
  flex-wrap: wrap;
  gap: 10px 12px;
  padding: 10px 12px;
  border: 1px solid var(--ss-border-soft, #e5eaf2);
  border-radius: 10px;
  background: var(--ss-bg, #f8fafc);
}

.plot-toolbar .search-gene-input {
  flex: 1 1 220px;
  max-width: none;
}

.plot-square-card {
  position: relative;
  width: 100%;
  min-height: 400px;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border: 1px solid var(--ss-border-soft, #e5eaf2);
  border-radius: 10px;
  background: #fff;
}

.plot-square {
  width: 100%;
  height: 100%;
}

.plot-loading {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 80%;
  height: 80%;
  object-fit: contain;
  z-index: 1;
}

@media (max-width: 900px), (orientation: portrait) {
  .plot-comparison-grid {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto;
  }

  .plot-panel {
    grid-row: auto;
    grid-template-rows: auto auto;
  }
}

.overlay-intro {
  margin: 0 0 12px;
  font-size: 12.5px;
  color: var(--ss-text-2);
  line-height: 1.55;
}
.overlay-controls {
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--ss-border-soft);
  border-radius: 10px;
  background: var(--ss-bg);
}
.overlay-field {
  display: flex;
  align-items: center;
  gap: 8px;
}
.overlay-gene-search {
  position: relative;
  width: 300px;
  max-width: 100%;
}
.overlay-gene-search .search-gene-input {
  max-width: none;
}
.overlay-scroller {
  top: calc(100% + 6px);
  left: 0;
  width: 100%;
}
.overlay-label {
  font-size: 12px;
  color: var(--ss-text-2);
  white-space: nowrap;
}
.overlay-mode-select {
  width: 210px;
}
.gwas-sex-select {
  width: 110px;
}
.overlay-note {
  margin: 8px 0 0;
  padding: 9px 11px;
  border-left: 3px solid #b08a30;
  border-radius: 8px;
  background: rgba(176, 138, 48, 0.08);
  font-size: 12px;
  color: var(--ss-text-2);
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.overlay-note strong {
  color: var(--ss-text);
}
.overlay-warning {
  color: #9a3412;
  font-weight: 600;
}
</style>
