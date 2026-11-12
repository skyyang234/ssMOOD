<template>
  <div>
    <NavigationBar></NavigationBar>
    <main>
      <section class="page-section">
        <div class="main-container">

          <!--##################################################-->
          <!--详细信息容器-->
          <div class="information-container">
            <div class="title-bar">
              <div class="title-bar-header">
                <h1>{{ $t('std1') }}</h1>
              </div>
            </div>
            <div class="information-content">
              <div class="information-left">
                <h1>{{ $t('std2') }}</h1>

                <p><span class="bold-black">{{ $t('std3') }}</span>: {{ dataset.display_name || dataset.dataset_id }}</p>
                <p><span class="bold-black">{{ $t('std4') }}</span>: {{ dataset.species }}</p>
                <p><span class="bold-black">{{ $t('std5') }}</span>: {{ dataset.area }}</p>
                <p><span class="bold-black">{{ $t('std6') }}</span>: {{ dataset.conditions }}</p>
                <p><span class="bold-black">{{ $t('std7') }}</span>: {{ dataset.sex }}</p>
                <p><span class="bold-black">{{ $t('std8') }}</span>: {{ dataset.age }}</p>
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
                <h1>{{ $t('std14') }}</h1>
              </div>
            </div>
            <div class="information-content plot-comparison-grid">
              <div class="information-left plot-panel">
                <div class="plot-panel-header">
                  <h1>{{ $t('std17') }}</h1>
                  <div class="marker-size-controller plot-toolbar">
                    <span class="label">{{ $t('std16') }}:</span>
                    <el-input-number v-model="markerSize1" :min="1" :max="100" :step="1" size="small" controls-position=""
                      @change="updateUmap1" />
                  </div>
                </div>
                <!-- coord_chart的容器 -->
                <div class="plot-square-card">
                  <!-- 加载图 -->
                  <img v-if="coord_chartLoading" src="/loading.gif" alt="Loading" class="plot-loading" />
                  <div id="coord_chart" class="plot-square"
                    :style="{ visibility: coord_chartLoading ? 'hidden' : 'visible' }">
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
                <!-- 空间基因表达量图的容器 -->
                <div class="plot-square-card">
                  <!-- 加载图 -->
                  <img v-if="coord_chartGeneLoading" src="/loading.gif" alt="Loading" class="plot-loading" />

                  <!-- Plotly 图表容器 -->
                  <div id="coord_chart_gene" class="plot-square"
                    :style="{ visibility: coord_chartGeneLoading ? 'hidden' : 'visible' }">
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
            </div>
            <!-- ################################ -->
            <!-- 第二列 -->
            <div class="information-second">
              <div id="expressionHeatmap" style="width: auto; height: 100%;"></div>
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
                      @sort-change="handleGOBPSortChange" :empty-text="GOBPemptyText">
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
                      @sort-change="handleGOMFSortChange" :empty-text="GOMFemptyText">
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
    <back-to-top></back-to-top>
  </div>
</template>

<script setup>
import Plotly from 'plotly.js-dist-min';
import VirtualListItem from './general/VirtualListItem.vue';
import VirtualList from 'vue3-virtual-scroll-list'

import { ref, onMounted, computed, watch,nextTick, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
//import debounce from 'lodash.debounce';
import { QuestionFilled } from '@element-plus/icons-vue'
//----------以下为一个ssmood页面需要的最基础的东西--------------
import BackToTop from './general/BackToTop.vue';
import NavigationBar from './general/NavigationBar.vue';

import config from '@/config';
//----------以上为一个ssmood页面需要的最基础的东西--------------
import colorMap from './color_map.js';
import { getGzipJson, getJson, parseMaybeGzipJson } from '@/utils/api';
import { updateAgentContext, clearAgentContext } from '@/utils/agentContext';
const route = useRoute();

//------------------------------------------------------
//加载数据集详细信息
//------------------------------------------------------
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

function spatialPrimaryAction(activeTab) {
  const tab = String(activeTab || '').toLowerCase();
  if (tab.includes('gene')) return 'viewing_gene_expression';
  if (tab.includes('deg')) return 'viewing_deg_table';
  return 'viewing_dataset_overview';
}

function syncSTAgentContext(extra = {}) {
  const activeTab = extra.activeTab || 'spatial_detail';
  updateAgentContext({
    businessState: {
      datasetId: dataset.value.dataset_id || route.params.id || '',
      omicsType: 'ST',
      species: dataset.value.species || '',
      brainRegion: dataset.value.area || '',
      condition: dataset.value.conditions || '',
      selectedGene: searchQuery.value || '',
      selectedCellType: cellType.value || '',
      activeTab,
      userPrimaryAction: extra.userPrimaryAction || spatialPrimaryAction(activeTab),
      ...extra,
    },
    pageSummary: {
      cells: dataset.value.cells || '',
      clusters: dataset.value.clusters || '',
    },
  });
}

onMounted(() => {
  const params = new URLSearchParams({
    id: route.params.id // 使用 route.params 获取路由参数
  });

  fetch(`${config.apiUrl}std_getSTDatasetDetail.php?${params}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json(); // 直接解析为 JSON，而不是 text
    })
    .then(dataArray => {
      if (dataArray && dataArray.length > 0) {
        dataset.value = {
          ...dataArray[0],
          information: parseInformation(dataArray[0].information || dataArray[0].detail)
        };
        syncSTAgentContext();
      }

      //console.log(dataset.value); // 打印更新后的 dataset
    })
    .catch(error => {
      console.error('Error fetching dataset details:', error);
    });
});

//------------------------------------------------------
//加载空间位置图
//------------------------------------------------------
const coordinate_data = ref([]);
const markerSize1 = ref(2);
const global_clusterLabels = ref([])
const visibleLabels = ref([])
const colors = ref({})
const isIndeterminate = ref(false)
const checkAllFlag = ref(true)

const coord_chartLoading = ref(true)

// 防止缩放同步循环的标志位
const isSyncingZoom = ref(false)
const isSelectZoom = ref(false)
// 防止双击重置时的重复更新
const isDoubleClickReset = ref(false)


// 根据缩放范围自动选择可见的细胞类型
const selectVisibleCellTypes = (xRange, yRange) => {
  if (!xRange || !yRange || coordinate_data.value.length === 0) return;
  isSelectZoom.value = true;
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;
  
  // 找出在当前视图范围内的细胞类型
  const visibleTypes = new Set();
  
  coordinate_data.value.forEach(cell => {
    const x = parseFloat(cell.x);
    const y = parseFloat(cell.y);
    
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
  if(!isSelectZoom.value) {
    updatePlot()
    updateGenePlot()
  } // 如果是缩放触发的变化，跳过
  
}

// 自动追踪 visibleLabels 的变化，更新全选与半选中状态
watch(visibleLabels, (val) => {
  const total = global_clusterLabels.value.length
  const checkedCount = val.length

  checkAllFlag.value = checkedCount === total
  isIndeterminate.value = checkedCount > 0 && checkedCount < total
  
  // 只有在非缩放选择且非双击重置的情况下才更新图表
  if (!isSelectZoom.value && !isDoubleClickReset.value) {
    updatePlot()
    updateGenePlot()
  }
}, { flush: 'post' })

// 裸轴：隐藏坐标轴与网格，仅保留散点；scaleanchor 保证空间图长宽比不变形
const buildOverlayLayout = () => ({
  showlegend: false,
  autosize: true,
  margin: { t: 10, r: 60, b: 10, l: 10 },
  xaxis: { visible: false, showgrid: false, zeroline: false },
  yaxis: { visible: false, showgrid: false, zeroline: false, scaleanchor: 'x' },
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
});

const buildGeneOverlayTraces = (source) => {
  const categories = [...new Set(source.map(item => item.c))].sort();
  return categories.map(category => {
    const categoryPoints = source.filter(point => point.c === category);
    return {
      x: categoryPoints.map(point => point.x),
      y: categoryPoints.map(point => point.y),
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
      x: backgroundPoints.map(point => point.x),
      y: backgroundPoints.map(point => point.y),
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
      x: scoredPoints.map(point => point.x),
      y: scoredPoints.map(point => point.y),
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
  Plotly.react('coord_chart_gene', traces, buildOverlayLayout());
}

const updatePlot = () => {
  const umap1 = coordinate_data.value.map(d => parseFloat(d.x));
  const umap2 = coordinate_data.value.map(d => parseFloat(d.y));
  const cellIds = coordinate_data.value.map(d => d.i);
  const clusterLabelsData = coordinate_data.value.map(d => d.c);

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

  Plotly.react('coord_chart', traces, buildOverlayLayout())
}



onMounted(() => {
  coord_chartLoading.value = true;
  const params = new URLSearchParams({
    id: route.params.id
  });

  fetch(`${config.apiUrl}std_getCoordinate.php?${params}`)
    .then(response => {
      if (!response.ok) {
        return response.json().then(err => { throw new Error(err?.error || `坐标数据加载失败 (HTTP ${response.status})`); });
      }
      return response.arrayBuffer();
    })
    .then(arrayBuffer => {
      const data = parseMaybeGzipJson(arrayBuffer); // 兼容 gzip 或浏览器自动解压后的 JSON
      if (!data || !Array.isArray(data.coordinate_data)) {
        throw new Error('坐标数据为空或格式异常');
      }

      coordinate_data.value = data.coordinate_data;
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
      global_clusterLabels.value = clusterLabels;
      visibleLabels.value = [...clusterLabels];
      // 用散点图的 cluster_labels（cluster_label2 优先）作为 DEG 下拉选项
      // 这些值与 deg_result.cell_type 一致，避免 general_DEG_CellType.php 中 cell.cell_type 不匹配的问题
      cellTypes.value = clusterLabels;
      if (clusterLabels.length > 0) {
        cellType.value = clusterLabels[0];
      }
      loadingDEG.value = false;
      const umap1 = coordinate_data.value.map(d => parseFloat(d.x));
      const umap2 = coordinate_data.value.map(d => parseFloat(d.y));
      const cellIds = coordinate_data.value.map(d => d.i);
      const clusterLabelsData = coordinate_data.value.map(d => d.c);

      colors.value = clusterLabels.reduce((acc, label) => {
        acc[label] = colorMap[label] || 'rgb(128,128,128)'; // 如果没有找到对应的颜色，则使用默认颜色 #000
        return acc;
      }, {});

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
            color: colors[label]
          }
        };
      });

      const layout = buildOverlayLayout();

      Plotly.newPlot('coord_chart', traces, layout);
      
      // 添加缩放事件监听，让左边图的缩放同步到右边图
      document.getElementById('coord_chart').on('plotly_relayout', function(eventdata) {
        if (eventdata && eventdata['xaxis.range[0]'] !== undefined && !isSyncingZoom.value) {
          isSyncingZoom.value = true;

          // 获取缩放范围并选择可见的细胞类型
          const xRange = [eventdata['xaxis.range[0]'], eventdata['xaxis.range[1]']];
          const yRange = [eventdata['yaxis.range[0]'], eventdata['yaxis.range[1]']];
          selectVisibleCellTypes(xRange, yRange);

          // 同步缩放范围到右边图
          if (isSearchgene.value === true) {
            const rightChart = document.getElementById('coord_chart_gene');
            if (rightChart) {
              Plotly.relayout('coord_chart_gene', {
                'xaxis.range[0]': eventdata['xaxis.range[0]'],
                'xaxis.range[1]': eventdata['xaxis.range[1]'],
                'yaxis.range[0]': eventdata['yaxis.range[0]'],
                'yaxis.range[1]': eventdata['yaxis.range[1]']
              });
            }
          }
          
          setTimeout(() => {
            isSyncingZoom.value = false;
          }, 100);
        }
      });
      
      // 添加双击重置事件监听
      document.getElementById('coord_chart').on('plotly_doubleclick', function() {
        // 防止重复触发
        if (isDoubleClickReset.value) return;
        isDoubleClickReset.value = true;
        
        // 直接重置视图，不触发勾选框更新
        Plotly.relayout('coord_chart', {
          'xaxis.autorange': true,
          'yaxis.autorange': true
        });
        
        // 重置勾选框状态
        visibleLabels.value = [...global_clusterLabels.value];
        
        // 重置右边图的视图
        if (isSearchgene.value === true) {
          const rightChart = document.getElementById('coord_chart_gene');
          if (rightChart) {
            Plotly.relayout('coord_chart_gene', {
              'xaxis.autorange': true,
              'yaxis.autorange': true
            });
          }
        }
        
        // 延时重置防抖标志
        setTimeout(() => {
          isDoubleClickReset.value = false;
        }, 300);
      });
      
      coord_chartLoading.value = false;
    })
    .catch(error => {
      console.error('坐标数据加载失败:', error);
      coord_chartLoading.value = false;
    });
});


// 更新 UMAP 图表的方法
const updateUmap1 = () => {
  Plotly.restyle('coord_chart', 'marker.size', [markerSize1.value]);
  // // 同步更新右边图的点大小
  // if (isSearchgene.value === true) {
  //   markerSize2.value = markerSize1.value;
  //   Plotly.restyle('coord_chart_gene', 'marker.size', [markerSize2.value]);
  // }
};

//------------------------------------------------------
//分类表
//------------------------------------------------------
onMounted(async () => {
  const params = new URLSearchParams({
    id: route.params.id
  });
  // 绘制各数据集分布
  fetch(config.apiUrl + `std_getNumberOfCluster.php?${params}`)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
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

//------------------------------------------------------
//基因搜索框
//------------------------------------------------------


const genes = ref([]);
//const filteredGenes = ref([]);
const searchQuery = ref('');
const showScroller = ref(false);
const markerSize2 = ref(2); // 默认点大小
const overlayMode = ref('gene');
const overlayResultMode = ref('gene');
const gwasTraits = ref([]);
const selectedGwasTraitId = ref(null);
const gwasScoreSummary = ref(null);
const gwasPlottedCells = ref(0);
const gsmapAvailability = ref({ has_gsmap_spatial: false, has_gsmap_cauchy: false });






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
    const overlayChart = document.getElementById('coord_chart_gene');
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

  try {
    const availability = await getJson('gwas_getGsmapAvailability.php', { id: route.params.id });
    const datasets = Array.isArray(availability.datasets) ? availability.datasets : [];
    const datasetInfo = datasets[0] || availability;
    gsmapAvailability.value = {
      has_gsmap_spatial: Boolean(datasetInfo?.has_gsmap_spatial),
      has_gsmap_cauchy: Boolean(datasetInfo?.has_gsmap_cauchy),
    };
  } catch (error) {
    console.error('Failed to load GSMap availability:', error);
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


const handleSelectItem = (item) => {
  searchQuery.value = item;
  showScroller.value = false;
  syncSTAgentContext({ selectedGene: item || '', activeTab: 'gene_expression' });
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
  if (value === 0) return 'rgba(222, 222, 222,0.7)';
  const t = Math.min(value / maxNc.value, 1);
  const h = 0;                    // 红色
  const s = 60 + 40 * t;          // 60% → 100%
  const l = 80 - 35 * t;          // 80% → 45%
  return `hsl(${h}, ${s}%, ${l}%)`;
};
const isSearchgene = ref(false);
const mergedGeneArray = ref([]);
const coord_chartGeneLoading = ref(false);

const searchgene = async () => {
  syncSTAgentContext({ selectedGene: searchQuery.value || '', activeTab: 'gene_expression' });
  if (coord_chartLoading.value === false) {
    coord_chartGeneLoading.value = true;
    // 请求参数
    const params = new URLSearchParams({
      id: route.params.id,
      gene: searchQuery.value
    });
    let jsonData = [];
    try {
      try {
        const response = await fetch(config.apiUrl + `std_getGeneExpression_bin.php?${params}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        jsonData = parseMaybeGzipJson(await response.arrayBuffer());
      } catch (error) {
        console.error('Error fetching or parsing data:', error);
        // 如果发生任何错误，jsonData保持为默认的空数组
      }

      isSearchgene.value = true;
      overlayResultMode.value = 'gene';
      gwasScoreSummary.value = null;
      gwasPlottedCells.value = 0;
      // 合并数据
      const ncMap = jsonData.reduce((acc, item) => {
        acc[item.i] = parseFloat(item.nc) || 0;
        return acc;
      }, {});

      // 合并数组
      const mergedArray = coordinate_data.value.map(item => {
        item.nc = ncMap[item.i] || 0;
        return item;
      });

      mergedGeneArray.value = mergedArray;


      // 分类信息
      const categories = [...new Set(mergedArray.map(item => item.c))];

      categories.sort();

      // 安全计算最大值
      maxNc.value = jsonData.reduce(
        (max, item) => (item.nc > max ? item.nc : max),
        -Infinity
      );
      //-----------创建热图信息------------------------

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
          const expressionIndex = Math.floor(normLogNC * (numBins - 1));

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

      //---------------------------------------
      // 按分类信息创建轨迹
      const traces = categories.map(category => {
        const categoryPoints = mergedArray.filter(point => point.c === category);

        const colors = categoryPoints.map(point => getColor(point.nc));
        return {
          x: categoryPoints.map(point => point.x),
          y: categoryPoints.map(point => point.y),
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
      const genelayout = buildOverlayLayout();
      Plotly.newPlot('coord_chart_gene', traces, genelayout);
      
      // 添加缩放事件监听，让右边图的缩放同步到左边图
      document.getElementById('coord_chart_gene').on('plotly_relayout', function(eventdata) {
        if (eventdata && eventdata['xaxis.range[0]'] !== undefined && !isSyncingZoom.value) {
          isSyncingZoom.value = true;


          // 获取缩放范围并选择可见的细胞类型
          const xRange = [eventdata['xaxis.range[0]'], eventdata['xaxis.range[1]']];
          const yRange = [eventdata['yaxis.range[0]'], eventdata['yaxis.range[1]']];
          selectVisibleCellTypes(xRange, yRange);

          // 同步缩放范围到左边图
          Plotly.relayout('coord_chart', {
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
      
      // 添加双击重置事件监听
      document.getElementById('coord_chart_gene').on('plotly_doubleclick', function() {
        // 防止重复触发
        if (isDoubleClickReset.value) return;
        isDoubleClickReset.value = true;
        
        // 直接重置视图，不触发勾选框更新
        Plotly.relayout('coord_chart_gene', {
          'xaxis.autorange': true,
          'yaxis.autorange': true
        });
        
        // 重置勾选框状态
        visibleLabels.value = [...global_clusterLabels.value];
        
        // 重置左边图的视图
        const leftChart = document.getElementById('coord_chart');
        if (leftChart) {
          Plotly.relayout('coord_chart', {
            'xaxis.autorange': true,
            'yaxis.autorange': true
          });
        }
        
        // 延时重置防抖标志
        setTimeout(() => {
          isDoubleClickReset.value = false;
        }, 300);
      });
      coord_chartLoading.value = false;


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
      coord_chartGeneLoading.value = false;
      
      // 重置左边图的视图到原始大小
      const leftChart = document.getElementById('coord_chart');
      if (leftChart) {
        Plotly.relayout('coord_chart', {
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
  if (coord_chartLoading.value !== false || !selectedGwasTraitId.value) return;
  coord_chartGeneLoading.value = true;
  try {
    const traitId = selectedGwasTraitId.value;
    const spatialData = await getGzipJson('gwas_getGsmapSpatialScores.php', {
      id: route.params.id,
      trait_id: traitId,
      limit: 0,
    });
    const results = Array.isArray(spatialData.scores) ? spatialData.scores : [];

    const scoreMap = results.reduce((acc, item) => {
      const score = Number(item?.z ?? item?.beta ?? item?.score);
      if (item.i !== undefined && Number.isFinite(score)) {
        getScdrsIdVariants(item.i).forEach(id => {
          acc[id] = score;
        });
      }
      return acc;
    }, {});
    const mergedArray = coordinate_data.value.map(item => {
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
    gwasScoreSummary.value = {
      ...spatialData,
      matched_cells: results.length,
      gsmap_available: true,
      trait_id: traitId,
    };

    const categories = [...new Set(mergedArray.map(item => item.c))].sort();
    const scoreValues = mergedArray.map(item => item.score).filter(value => Number.isFinite(value));
    gwasPlottedCells.value = scoreValues.length;
    const minScore = scoreValues.length ? Math.min(...scoreValues) : 0;
    const maxScore = scoreValues.length ? Math.max(...scoreValues) : 0;
    const span = maxScore - minScore;
    const numBins = 11;
    const heatmapData = Array.from({ length: numBins }, () => Array(categories.length).fill(0));

    mergedArray.forEach(item => {
      if (!Number.isFinite(item.score)) return;
      const categoryIndex = categories.indexOf(item.c);
      const binIndex = span === 0 ? Math.floor(numBins / 2) : Math.min(Math.max(Math.floor(((item.score - minScore) / span) * (numBins - 1)), 0), numBins - 1);
      if (categoryIndex !== -1) heatmapData[binIndex][categoryIndex]++;
    });

    Plotly.newPlot('coord_chart_gene', buildGwasOverlayTraces(mergedArray), buildOverlayLayout());
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
      title: `GSMap spatial score distribution (${Number(gwasPlottedCells.value || 0).toLocaleString()} matched spots)`,
      xaxis: { title: '', showgrid: false, tickangle: 45, tickfont: { size: 6 } },
      yaxis: {
        title: 'GSMap score',
        tickvals: Array.from({ length: numBins }, (_, i) => i),
        ticktext: Array.from({ length: numBins }, (_, i) => span === 0 ? minScore.toFixed(3) : (minScore + (i / (numBins - 1)) * span).toFixed(3)),
      },
    });

    visibleLabels.value = [...global_clusterLabels.value];
    Plotly.relayout('coord_chart', { 'xaxis.autorange': true, 'yaxis.autorange': true });

    document.getElementById('coord_chart_gene').on('plotly_relayout', function(eventdata) {
      if (eventdata && eventdata['xaxis.range[0]'] !== undefined && !isSyncingZoom.value) {
        isSyncingZoom.value = true;
        const xRange = [eventdata['xaxis.range[0]'], eventdata['xaxis.range[1]']];
        const yRange = [eventdata['yaxis.range[0]'], eventdata['yaxis.range[1]']];
        selectVisibleCellTypes(xRange, yRange);
        Plotly.relayout('coord_chart', {
          'xaxis.range[0]': eventdata['xaxis.range[0]'],
          'xaxis.range[1]': eventdata['xaxis.range[1]'],
          'yaxis.range[0]': eventdata['yaxis.range[0]'],
          'yaxis.range[1]': eventdata['yaxis.range[1]']
        });
        setTimeout(() => { isSyncingZoom.value = false; }, 100);
      }
    });

    document.getElementById('coord_chart_gene').on('plotly_doubleclick', function() {
      visibleLabels.value = [...global_clusterLabels.value];
      Plotly.relayout('coord_chart', { 'xaxis.autorange': true, 'yaxis.autorange': true });
    });
  } catch (error) {
    console.warn('GWAS 评分暂无数据:', error.message);
    gwasScoreSummary.value = null;
    gwasPlottedCells.value = 0;
    ElMessage.warning(t('std_no_score_data'));
  } finally {
    coord_chartGeneLoading.value = false;
  }
};

const { t } = useI18n();

// 更新空间图2的点大小
const updateUmap2 = () => {
  if (isSearchgene.value !== true) return;
  if (overlayResultMode.value === 'gwas') {
    updateGenePlot();
  } else {
    Plotly.restyle('coord_chart_gene', 'marker.size', [markerSize2.value]);
  }
  markerSize1.value = markerSize2.value;
  Plotly.restyle('coord_chart', 'marker.size', [markerSize1.value]);
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
const GOBPemptyText = computed(() => GOBPnotice.value.message || 'No GO Biological Process terms found.');
const GOMFemptyText = computed(() => GOMFnotice.value.message || 'No GO Molecular Function terms found.');
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


//------------------------------------------------------//
//默认加载第一个细胞类型的差异数据
//------------------------------------------------------//
// 当 global_clusterLabels 从坐标数据加载后，同步到 DEG 下拉（这些值与 deg_result.cell_type 一致）
watch(global_clusterLabels, (newLabels) => {
  if (newLabels.length > 0 && cellTypes.value.length === 0) {
    cellTypes.value = newLabels;
    cellType.value = newLabels[0];
    loadingDEG.value = false;
    console.log('[ST cellTypes] using global_clusterLabels (cluster_label2):', newLabels.length, 'types');
  }
}, { immediate: true });

// 备用：坐标数据超时后，降级到 general_DEG_CellType.php
onMounted(() => {
  const params = new URLSearchParams({ id: route.params.id });
  setTimeout(() => {
    if (cellTypes.value.length > 0) return; // 坐标数据已加载，无需fallback
    console.log('[ST cellTypes] fallback: requesting general_DEG_CellType.php');
    fetch(config.apiUrl + `general_DEG_CellType.php?${params}`)
      .then((response) => response.json())
      .then((data) => {
        if (cellTypes.value.length > 0) return; // 坐标数据可能刚好加载完
        cellTypes.value = data || [];
        console.log('[ST cellTypes] loaded from fallback:', cellTypes.value.length, 'types');
        if (cellTypes.value.length > 0) {
          cellType.value = cellTypes.value[0];
        }
        loadingDEG.value = false;
      })
      .catch((error) => {
        console.error("Failed to load cell types:", error);
        if (cellTypes.value.length === 0) loadingDEG.value = false;
      });
  }, 5000); // 5秒后坐标数据还没到，启动fallback
});

//------------------------------------------------------//
//检测用户更换细胞类型
//------------------------------------------------------//
watch(cellType, async (newcellType) => {
  syncSTAgentContext({ selectedCellType: newcellType || '', activeTab: 'DEG' });
  if (!newcellType) { loadingDEG.value = false; DEGnotice.value = makeNotice('No cluster selected.', 'info'); return; }
  loadingDEG.value = true;
  DEGnotice.value = makeNotice();
  // 获取差异数据 — 对 cluster 名做 trim，防止数据库字段有前后空格导致匹配失败
  const clusterRaw = (newcellType || '').trim();
  if (!clusterRaw) {
    console.warn('[ST DEG] cluster name empty after trim:', JSON.stringify(newcellType));
    loadingDEG.value = false;
    return;
  }
  const params = new URLSearchParams({
    id: route.params.id,
    cluster: clusterRaw
  });
  const url = config.apiUrl + `general_getDEG_ByCluster.php?${params}`;
  console.log('[ST DEG] requesting URL:', url);
  console.log('[ST DEG] cluster raw:', JSON.stringify(newcellType), '→ trimmed:', JSON.stringify(clusterRaw));
  fetch(url)
    .then((response) => {
      console.log('[ST DEG] HTTP status:', response.status, 'for cluster:', JSON.stringify(clusterRaw));
      return response.arrayBuffer();
    })
    .then((arrayBuffer) => {
      const parsed = parseMaybeGzipJson(arrayBuffer);
      console.log('[ST DEG] parsed:', Array.isArray(parsed) ? `array[${parsed.length}]` : (parsed?.error ? 'error: ' + parsed.error : JSON.stringify(parsed)));
      if (Array.isArray(parsed) && parsed.length > 0) {
        DEGdata.value = parsed.map(normalizeDEGRow);
        console.log('[ST DEG] loaded', parsed.length, 'rows for cluster', clusterRaw);
      } else {
        DEGdata.value = [];
        console.warn('[ST DEG] empty or unexpected data for cluster', clusterRaw, parsed);
      }
      currentPage.value = 1;//回到第一页
      loadingDEG.value = false;
    })
    .catch((error) => {
      console.error("[ST DEG] Failed to load DEGs:", error);
      DEGdata.value = [];
      loadingDEG.value = false;
    });
});



//------------------------------------------------------
//差异表达分析分页计算
//------------------------------------------------------
const filteredData = computed(() => {
  return DEGdata.value.filter(item => {
    currentPage.value = 1;
    const logFoldChange = parseFloat(item.fc);
    const adjustedPvalue = parseFloat(item.a);
    // 将 filterDEGGenes.value 和 item.i 都转换为小写，然后检查是否包含
    const lowerCaseFilter = filterDEGGenes.value.toLowerCase();
    const lowerCaseItemI = item.i.toLowerCase();

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
    if (dataset.species === "mouse") { params.append('gene_sets', 'KEGG_2019_Mouse.gmt') }
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
            console.log('[ST KEGG] loaded', data.length, 'rows')
            KEGGdata.value = data
          } else {
            console.warn('[ST KEGG] non-array response:', data)
            KEGGdata.value = []
          }
        } catch (e) {
          console.warn('[ST KEGG] Server returned non-JSON:', text)
          KEGGdata.value = []
        }
      })
      .catch(err => {
        console.error('Failed to load KEGG:', err)
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
          console.log('[ST GO_BP] loaded', data.length, 'rows');
          GOBPdata.value = data;
        } else {
          console.warn('[ST GO_BP] non-array response:', data);
          GOBPdata.value = [];
        }
      } catch (e) {
        console.warn('[ST GO_BP] Server returned non-JSON:', text);
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
  GOMFnotice.value = makeNotice();

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
          console.log('[ST GO_MF] loaded', data.length, 'rows');
          GOMFdata.value = data;
        } else {
          console.warn('[ST GO_MF] non-array response:', data);
          GOMFdata.value = [];
        }
      } catch (e) {
        console.warn('[ST GO_MF] Server returned non-JSON:', text);
        GOMFdata.value = [];
      }
    })
    .catch(err => {
      console.error('Failed to load GO_MF:', err);
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
          console.log('[ST GO_CC] loaded', data.length, 'rows');
          GOCCdata.value = data;
        } else {
          console.warn('[ST GO_CC] non-array response:', data);
          GOCCdata.value = [];
        }
      } catch (e) {
        console.warn('[ST GO_CC] Server returned non-JSON:', text);
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
  Plotly.Plots.resize('coord_chart');
  if (isSearchgene.value === true) {
    Plotly.Plots.resize('coord_chart_gene');
    Plotly.Plots.resize('expressionHeatmap');
  }

};

onUnmounted(() => {
  clearAgentContext();
  // 清理事件总线
  if (eventBus) {
    eventBus.off('select-item', handleSelectItem);
  }
  
  // 清理窗口resize事件
  window.removeEventListener('resize', resizeMyChart);
  
  // 清理Plotly事件监听器
  const leftChart = document.getElementById('coord_chart');
  const rightChart = document.getElementById('coord_chart_gene');
  
  try {
    if (leftChart && typeof leftChart.removeAllListeners === 'function') {
      leftChart.removeAllListeners('plotly_relayout');
      leftChart.removeAllListeners('plotly_doubleclick');
    }
  } catch (e) {
    console.warn('cleanup leftChart events failed:', e.message);
  }
  
  try {
    if (rightChart && typeof rightChart.removeAllListeners === 'function') {
      rightChart.removeAllListeners('plotly_relayout');
      rightChart.removeAllListeners('plotly_doubleclick');
    }
  } catch (e) {
    console.warn('cleanup rightChart events failed:', e.message);
  }
  
  // 清理数据
  genes.value = [];
  coordinate_data.value = [];
  mergedGeneArray.value = [];
  KEGGdata.value = [];
  GOBPdata.value = [];
  GOMFdata.value = [];
  GOCCdata.value = [];
  
  // 重置标志位
  isSelectZoom.value = false;
  isDoubleClickReset.value = false;
  isSyncingZoom.value = false;
  
  // 移除ResizeObserver错误处理器
  window.removeEventListener('error', function(event) {
    if (event.error && event.error.message && event.error.message.includes('ResizeObserver')) {
      event.preventDefault();
      console.warn('ResizeObserver error suppressed:', event.error.message);
      return false;
    }
  });
});
</script>

<style scoped>
@import 'css/MainStyles.css';
@import 'css/SCDStyles.css';


/* ----------------------------------------------------------- */
/* 差异表达分析右容器表格,避免影响全局样式 */
.table-container {
  max-width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid var(--ss-border);
}

.pagination {
  margin-top: 10px;
}

button {
  margin: 0 5px;
}

.st-coord-content {
  display: flex;
  flex-direction: column;
  /* 子元素垂直排列 */
  flex: 1;
  gap: 30px;
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
.overlay-controls {
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--ss-border-soft);
  border-radius: 10px;
  background: var(--ss-bg);
}
.overlay-field {
  display: flex;
  align-items: center;
  gap: 8px;
}
.overlay-label {
  font-size: 11px;
  color: var(--ss-text-3);
  white-space: nowrap;
}
.overlay-gene-search {
  position: relative;
  flex: 1 1 240px;
}
.overlay-scroller {
  left: 0;
  right: 0;
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
  background: rgba(176, 138, 48, 0.08);
  color: var(--ss-text-2);
  font-size: 12px;
  line-height: 1.55;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.overlay-note strong {
  color: var(--ss-text);
}
.overlay-warning {
  color: #b45309;
  font-weight: 600;
}

/* ----------------------------------------------------------- */
</style>