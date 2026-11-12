<template>
  <footer class="ss-footer">
    <div class="ss-footer-inner">
      <div class="ss-footer-brand">
        <div class="ss-footer-name">ssMOOD</div>
        <div class="ss-footer-tag">{{ $t('footer_tagline') || 'Spatial & Single-cell Major Depression Omics Online Database' }}</div>
        <div class="ss-footer-meta">
          <span>v{{ version }}</span>
          <span class="ss-dot">·</span>
          <span>Released {{ releaseDate }}</span>
        </div>
      </div>

      <div class="ss-footer-cols">
        <div class="ss-footer-col">
          <div class="ss-footer-col-title">{{ $t('database') || 'Database' }}</div>
          <router-link to="/browse/singlecell" class="ss-footer-link">{{ $t('browse-SingleCell') }}</router-link>
          <router-link to="/browse/spatialtranscriptome" class="ss-footer-link">{{ $t('browse-SpatialTranscriptome') }}</router-link>
          <router-link to="/browse/atac" class="ss-footer-link">scATAC-seq</router-link>
          <router-link to="/browse/gwas" class="ss-footer-link">GWAS / scDRS</router-link>
        </div>

        <div class="ss-footer-col">
          <div class="ss-footer-col-title">{{ $t('resources') || 'Resources' }}</div>
          <router-link to="/about" class="ss-footer-link">{{ $t('about') }}</router-link>
          <router-link to="/about/VisitLog" class="ss-footer-link">{{ $t('vl1') || 'Visitor Statistics' }}</router-link>
          <a href="https://github.com/YuLab-SMU/ssMOOD" target="_blank" rel="noopener" class="ss-footer-link">GitHub</a>
        </div>

        <div class="ss-footer-col">
          <div class="ss-footer-col-title">{{ $t('contact') || 'Contact' }}</div>
          <div class="ss-footer-affil">Prof. Xiong Cao · Southern Medical University</div>
          <div class="ss-footer-affil">YuLab · Southern Medical University</div>
          <div class="ss-footer-affil">BGI Genomics</div>
          <router-link to="/about/ContactUs" class="ss-footer-link">{{ $t('feedback') || 'Feedback' }}</router-link>
        </div>
      </div>
    </div>

    <div class="ss-footer-base">
      <div class="ss-footer-inner ss-footer-base-inner">
        <span class="ss-footer-legal">© {{ year }} ssMOOD. {{ $t('footer_legal_notice') }}</span>
        <span class="ss-tech">
          <span class="ss-tech-pill">Vue 3</span>
          <span class="ss-tech-pill">Element Plus</span>
          <span class="ss-tech-pill">Plotly</span>
        </span>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { computed } from 'vue';

const version = '2.0.0';
const releaseDate = 'August 2026';
const year = computed(() => new Date().getFullYear());
</script>

<style scoped>
.ss-footer {
  background: var(--ss-navy);
  color: rgba(255, 255, 255, 0.7);
  margin-top: 64px;
}

.ss-footer-inner {
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 48px 40px 32px;
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 64px;
}

.ss-footer-name {
  font-family: var(--ss-mono);
  font-size: 22px;
  font-weight: 600;
  color: white;
  letter-spacing: -0.01em;
  margin-bottom: 8px;
}
.ss-footer-tag {
  font-size: 12px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.55);
  margin-bottom: 14px;
}
.ss-footer-meta {
  font-family: var(--ss-mono);
  font-size: 11px;
  color: rgba(255, 255, 255, 0.40);
  display: flex;
  gap: 8px;
}
.ss-dot { opacity: 0.5; }

.ss-footer-cols {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}
.ss-footer-col { display: flex; flex-direction: column; gap: 6px; }
.ss-footer-col-title {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 10px;
}
.ss-footer-link {
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.75);
  text-decoration: none;
  padding: 3px 0;
  transition: var(--ss-tr-fast);
}
.ss-footer-link:hover {
  color: white;
  text-decoration: none;
  padding-left: 4px;
}
.ss-footer-affil {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  padding: 3px 0;
}

.ss-footer-base {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.20);
}
.ss-footer-base-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 40px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
}
.ss-tech { display: flex; gap: 6px; }
.ss-tech-pill {
  font-family: var(--ss-mono);
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 100px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.65);
}

@media (max-width: 800px) {
  .ss-footer-inner { grid-template-columns: 1fr; gap: 32px; padding: 32px 20px; }
  .ss-footer-cols { grid-template-columns: 1fr 1fr; gap: 24px; }
  .ss-footer-base-inner { flex-direction: column; align-items: flex-start; gap: 8px; padding: 16px 20px; }
  .ss-footer-legal { max-width: none; }
}
</style>
