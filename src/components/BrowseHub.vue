<template>
  <div>
    <NavigationBar />

    <main>
      <section class="page-section">


        <div class="hub-hero">
          <div class="eyebrow">{{ $t('browse_hub_eyebrow') }}</div>
          <h1 class="hub-title">{{ $t('browse_hub_title') }}</h1>
          <p class="hub-lead">{{ $t('browse_hub_sub') }}</p>
        </div>

        <!-- 模态卡片 -->
        <div class="modality-grid">
          <!-- snRNA-seq -->
          <router-link to="/browse/singlecell" class="modality sc">
            <div class="mod-icon sc">
              <svg viewBox="0 0 28 28" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6">
                <circle cx="7" cy="9" r="2.5"/><circle cx="16" cy="6" r="3"/><circle cx="21" cy="14" r="2.5"/>
                <circle cx="10" cy="17" r="3"/><circle cx="19" cy="21" r="2"/>
              </svg>
            </div>
            <div class="mod-name">{{ $t('browse_hub_sc_title') }} <span class="mod-short">snRNA</span></div>
            <div class="mod-desc">{{ $t('browse_hub_sc_desc') }}</div>
            <div class="mod-stats">
              <div><div class="mod-stat-n">{{ counts.scDatasets }}</div><div class="mod-stat-l">{{ $t('browse_hub_datasets') }}</div></div>
              <div><div class="mod-stat-n">{{ counts.scCellsFmt }}</div><div class="mod-stat-l">{{ $t('browse_hub_cells') }}</div></div>
            </div>
            <div class="mod-cta"><span>{{ $t('browse_hub_sc_tech') }}</span><span>{{ $t('browse_hub_browse') }} →</span></div>
          </router-link>

          <!-- Spatial Transcriptomics -->
          <router-link to="/browse/spatialtranscriptome" class="modality st">
            <div class="mod-icon st">
              <svg viewBox="0 0 28 28" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6">
                <rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/>
                <rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>
                <circle cx="7" cy="7" r="1.6" fill="currentColor"/><circle cx="17" cy="17" r="1.6" fill="currentColor"/>
              </svg>
            </div>
            <div class="mod-name">{{ $t('browse_hub_st_title') }} <span class="mod-short">ST</span></div>
            <div class="mod-desc">{{ $t('browse_hub_st_desc') }}</div>
            <div class="mod-stats">
              <div><div class="mod-stat-n">{{ counts.stDatasets }}</div><div class="mod-stat-l">{{ $t('browse_hub_datasets') }}</div></div>
              <div><div class="mod-stat-n">{{ counts.stSpotsFmt }}</div><div class="mod-stat-l">{{ $t('browse_hub_spots') }}</div></div>
            </div>
            <div class="mod-cta"><span>{{ $t('browse_hub_st_tech') }}</span><span>{{ $t('browse_hub_browse') }} →</span></div>
          </router-link>

        </div>

        <!-- 未来模态 + Roadmap -->
        <div style="margin-top:44px;margin-bottom:12px;display:flex;align-items:center;gap:12px">
          <h3 style="font-size:12px;color:var(--ss-text-3);text-transform:uppercase;letter-spacing:.12em;font-weight:600;margin:0">{{ $t('browse_hub_coming_next') }}</h3>
          <div style="flex:1;height:1px;background:var(--ss-border)"></div>
        </div>

        <div class="fmodality-grid">
          <div class="fmodality">
            <div class="fmodality-icon" style="background:rgba(74,127,193,.12);color:#4a7fc1">
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="10" height="4" rx="1"/><rect x="3" y="9" width="10" height="4" rx="1"/><path d="M6 5 H6.01 M6 11 H6.01 M10 5 H11 M10 11 H11" stroke-linecap="round"/></svg>
            </div>
            <div>
              <div class="fmodality-name">{{ $t('browse_hub_female_title') }}</div>
              <div class="fmodality-when">{{ $t('browse_hub_female_when') }}</div>
            </div>
          </div>
          <div class="fmodality">
            <div class="fmodality-icon" style="background:rgba(90,171,138,.12);color:#3a8a72">
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="4" cy="4" r="2"/><circle cx="12" cy="4" r="2"/><circle cx="8" cy="12" r="2"/><path d="M5.6 5.4 L7.1 10.1 M10.4 5.4 L8.9 10.1 M6 4 H10"/></svg>
            </div>
            <div>
              <div class="fmodality-name">{{ $t('browse_hub_multiome_title') }}</div>
              <div class="fmodality-when">{{ $t('browse_hub_multiome_when') }}</div>
            </div>
          </div>
          <div class="fmodality">
            <div class="fmodality-icon" style="background:rgba(102,82,168,.12);color:#6652a8">
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 4 H13 M3 8 H13 M3 12 H9" stroke-linecap="round"/><circle cx="12" cy="12" r="1.8"/><path d="M13.4 13.4 L15 15" stroke-linecap="round"/></svg>
            </div>
            <div>
              <div class="fmodality-name">{{ $t('browse_hub_methylation_title') }}</div>
              <div class="fmodality-when">{{ $t('browse_hub_methylation_when') }}</div>
            </div>
          </div>
        </div>

        <!-- Roadmap -->
        <div class="roadmap">
          <div class="roadmap-icon">
            <svg viewBox="0 0 28 28" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 14 L25 14 M14 3 L25 14 L14 25"/></svg>
          </div>
          <div>
            <div class="roadmap-eyebrow">{{ $t('browse_hub_roadmap_eyebrow') }}</div>
            <div class="roadmap-title">{{ $t('browse_hub_roadmap_title') }}</div>
            <div class="roadmap-desc">{{ $t('browse_hub_roadmap_desc') }}</div>
          </div>
          <router-link to="/about/doc/News" class="roadmap-btn">{{ $t('browse_hub_view_news') }} →</router-link>
        </div>
      </section>
    </main>

    <BackToTop />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import NavigationBar from './general/NavigationBar.vue';
import BackToTop from './general/BackToTop.vue';

import { getCachedHomeStats, loadHomeStats } from '@/utils/api';

const counts = ref(getCachedHomeStats());

onMounted(async () => {
  counts.value = await loadHomeStats();
});
</script>

<style scoped>
@import 'css/MainStyles.css';

/* ── Page centering ── */
.page-section {
  width: 100%;
  max-width: 1100px;
  margin-left: auto;
  margin-right: auto;
}

/* ── Hub Hero ── */
.hub-hero {
  margin: 0 auto 28px;
  max-width: 780px;
  text-align: center;
}
.hub-title {
  font-size: 30px;
  font-weight: 600;
  color: var(--ss-navy);
  margin: 4px 0 10px;
  letter-spacing: -0.02em;
  line-height: 1.2;
}
.hub-title::before { display: none; }
.hub-lead {
  font-size: 14.5px;
  color: var(--ss-text-2);
  line-height: 1.65;
  margin: 0;
}

/* ── Modality Cards ── */
.modality-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 400px));
  justify-content: center;
  gap: 16px;
  margin-bottom: 14px;
}
.modality {
  background: var(--ss-surface);
  border: 1.5px solid var(--ss-border);
  border-radius: 14px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.25s;
  position: relative;
  overflow: hidden;
  text-decoration: none;
}
.modality::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 4px;
}
.modality:hover {
  border-color: var(--ss-primary);
  transform: translateY(-3px);
  box-shadow: var(--ss-shadow-md);
  text-decoration: none;
}
.modality.sc::before { background: linear-gradient(90deg, var(--ss-primary), #7a96c8); }
.modality.st::before { background: linear-gradient(90deg, #3a8a72, #5eae93); }
.modality.atac::before { background: linear-gradient(90deg, #6652a8, #8a72c8); }

/* Coming soon */
.modality.coming {
  cursor: default;
  opacity: 0.78;
}
.modality.coming::before {
  background: repeating-linear-gradient(45deg, var(--ss-border), var(--ss-border) 6px, var(--ss-border-soft) 6px, var(--ss-border-soft) 12px);
  height: 4px;
}
.modality.coming:hover {
  transform: none;
  box-shadow: none;
  border-color: var(--ss-border);
}
.coming-badge {
  position: absolute;
  top: 14px;
  right: 14px;
  font-family: var(--ss-mono);
  font-size: 10px;
  padding: 3px 9px;
  border-radius: 100px;
  background: rgba(176, 138, 48, 0.12);
  color: #7a5b1a;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-weight: 600;
}

.mod-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mod-icon.sc { background: var(--ss-primary-10); color: var(--ss-primary); }
.mod-icon.st { background: rgba(58,138,114,.12); color: #3a8a72; }
.mod-icon.atac { background: rgba(102,82,168,.12); color: #6652a8; }

.mod-name {
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--ss-text);
}
.mod-short {
  font-family: var(--ss-mono);
  font-size: 11px;
  color: var(--ss-text-3);
  padding: 2px 7px;
  border-radius: 4px;
  background: var(--ss-bg);
  font-weight: 500;
}
.mod-desc {
  font-size: 13px;
  color: var(--ss-text-2);
  line-height: 1.6;
  flex: 1;
}
.mod-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--ss-border-soft);
}
.mod-stat-n {
  font-family: var(--ss-mono);
  font-size: 18px;
  font-weight: 600;
  color: var(--ss-text);
  line-height: 1;
}
.mod-stat-l {
  font-size: 10.5px;
  color: var(--ss-text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 3px;
}
.mod-cta {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 14px;
  font-size: 12.5px;
  color: var(--ss-primary);
  font-weight: 500;
  padding-top: 8px;
  border-top: 1px solid var(--ss-border-soft);
}

/* ── Future Modalities ── */
.fmodality-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 320px));
  justify-content: center;
  gap: 14px;
  margin-bottom: 32px;
}
.fmodality {
  background: var(--ss-bg);
  border: 1px dashed var(--ss-border);
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.fmodality-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0.7;
}
.fmodality-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ss-text-2);
}
.fmodality-when {
  font-family: var(--ss-mono);
  font-size: 10.5px;
  color: var(--ss-text-3);
  margin-top: 2px;
}

/* ── Roadmap ── */
.roadmap {
  background: linear-gradient(135deg, var(--ss-navy), #1e3458);
  color: white;
  border-radius: 14px;
  padding: 28px 32px;
  margin: 32px 0 0;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 24px;
  align-items: center;
}
.roadmap-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.10);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.15);
}
.roadmap-eyebrow {
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
  margin-bottom: 4px;
}
.roadmap-title {
  font-size: 18px;
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
}
.roadmap-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  max-width: 520px;
}
.roadmap-btn {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: white;
  font-size: 12.5px;
  font-weight: 500;
  padding: 9px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-family: var(--ss-font);
  white-space: nowrap;
  text-decoration: none;
  transition: background 0.15s;
}
.roadmap-btn:hover {
  background: rgba(255, 255, 255, 0.20);
  text-decoration: none;
}

@media (max-width: 900px) {
  .modality-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .fmodality-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .roadmap { grid-template-columns: 1fr; text-align: center; }
  .roadmap-btn { justify-self: center; }
}
@media (max-width: 600px) {
  .modality-grid { grid-template-columns: minmax(0, 420px); }
  .fmodality-grid { grid-template-columns: minmax(0, 320px); }
}
</style>
