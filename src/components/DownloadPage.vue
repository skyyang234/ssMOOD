<template>
  <div>
    <NavigationBar />
    <main>
      <section class="page-section">

        <div class="page-hero">
          <div class="eyebrow">Resources · {{ $t('download') }}</div>
          <h1 class="page-hero-title">{{ $t('dp01') }}</h1>
          <p class="page-hero-sub">{{ $t('about_source_desc') }}</p>
        </div>

        <div class="dl-grid">
          <!-- GitHub source card -->
          <div class="dl-card">
            <div class="dl-card-head">
              <div class="dl-icon dl-icon-blue">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M12 .5C5.7.5.5 5.7.5 12c0 5 3.3 9.3 7.9 10.8.6.1.8-.2.8-.5v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.6-1.3-1.6-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.7.4-1.3.7-1.5-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.4-2.3 1.2-3.2-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2.9-.3 2-.4 3-.4s2 .1 3 .4c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.1.7.9 1.2 1.9 1.2 3.2 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5 4.6-1.5 7.9-5.8 7.9-10.8C23.5 5.7 18.3.5 12 .5z"/>
                </svg>
              </div>
              <div>
                <div class="dl-card-title">{{ $t('dp02') }}</div>
                <div class="dl-card-sub">github.com/YuLab-SMU/ssMOOD</div>
              </div>
              <span class="dl-card-tag">Open source</span>
            </div>
            <p class="dl-card-desc">{{ $t('dp03') }}</p>
            <div class="dl-card-actions">
              <button class="btn btn-primary" @click="openGitHub">
                <svg viewBox="0 0 16 16" width="13" height="13"><path d="M8 1v10 M4 7 L8 11 L12 7 M2 14 L14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                {{ $t('dp04') }}
              </button>
              <a href="https://github.com/YuLab-SMU/ssMOOD/issues" target="_blank" rel="noopener" class="btn btn-ghost">Issues</a>
            </div>
          </div>

          <!-- Bio data card -->
          <div class="dl-card">
            <div class="dl-card-head">
              <div class="dl-icon dl-icon-teal">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M14 3 L20 3 L20 21 L4 21 L4 3 L10 3"/>
                  <path d="M9 3 L9 7 L15 7 L15 3"/>
                  <path d="M8 13 L16 13 M8 17 L13 17"/>
                </svg>
              </div>
              <div>
                <div class="dl-card-title">{{ $t('dp05') }}</div>
                <div class="dl-card-sub">NGDC · ngdc.cncb.ac.cn</div>
              </div>
              <span class="dl-card-tag dl-card-tag-pending">Coming soon</span>
            </div>
            <p class="dl-card-desc">{{ $t('dp06') }}</p>
            <div class="dl-card-actions">
              <button class="btn btn-primary" :disabled="true">
                <svg viewBox="0 0 16 16" width="13" height="13"><path d="M8 1v10 M4 7 L8 11 L12 7 M2 14 L14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                {{ $t('dp07') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Citation block -->
        <div class="cite-card">
          <div class="cite-head">
            <span class="eyebrow">How to cite</span>
            <button class="btn-copy" @click="copyCitation">
              <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="9" height="10" rx="1"/><path d="M9 4 V2 H2 V11 H4"/></svg>
              {{ copied ? 'Copied!' : 'Copy' }}
            </button>
          </div>
          <pre class="cite-text">{{ citationText }}</pre>
        </div>
      </section>
    </main>
    <BackToTop />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import BackToTop from './general/BackToTop.vue';
import NavigationBar from './general/NavigationBar.vue';

const BRANCH = process.env.BRANCH;

const openGitHub = () => window.open('https://github.com/YuLab-SMU/ssMOOD/tree/' + BRANCH, '_blank');

const citationText = `YuLab-SMU (2026). ssMOOD: Spatial & Single-cell Major Depression
Omics Online Database. https://ssmood.genomics.cn`;

const copied = ref(false);
async function copyCitation() {
  await navigator.clipboard.writeText(citationText);
  copied.value = true;
  setTimeout(() => copied.value = false, 2000);
}
</script>

<style scoped>
@import 'css/MainStyles.css';

.page-hero { margin-bottom: 28px; max-width: 800px; }
.page-hero-title { font-size: 30px; font-weight: 600; margin: 4px 0 8px; color: var(--ss-text); }
.page-hero-title::before { display: none; }
.page-hero-sub { font-size: 14px; color: var(--ss-text-2); }

.dl-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-bottom: 28px;
}
.dl-card {
  background: var(--ss-surface);
  border: 1px solid var(--ss-border);
  border-radius: var(--ss-r-lg);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.dl-card-head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  align-items: center;
}
.dl-icon {
  width: 44px; height: 44px;
  border-radius: var(--ss-r-md);
  display: flex; align-items: center; justify-content: center;
}
.dl-icon-blue { background: var(--ss-primary-10); color: var(--ss-primary); }
.dl-icon-teal { background: var(--ss-teal-pale); color: var(--ss-teal); }
.dl-card-title { font-size: 15px; font-weight: 600; color: var(--ss-text); }
.dl-card-sub {
  font-family: var(--ss-mono);
  font-size: 11.5px;
  color: var(--ss-text-3);
  margin-top: 2px;
}
.dl-card-tag {
  font-family: var(--ss-mono);
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 100px;
  background: var(--ss-teal-pale);
  color: var(--ss-teal);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
}
.dl-card-tag-pending { background: rgba(214, 140, 42, 0.12); color: var(--ss-warning); }

.dl-card-desc {
  font-size: 13px;
  line-height: 1.65;
  color: var(--ss-text-2);
  margin: 0;
}
.dl-card-actions { display: flex; gap: 8px; }

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border-radius: var(--ss-r-md);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  border: 1px solid transparent;
  cursor: pointer;
  transition: var(--ss-tr-fast);
  font-family: var(--ss-font);
}
.btn-primary { background: var(--ss-primary); color: white; }
.btn-primary:hover:not(:disabled) { background: var(--ss-primary-dark); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost { background: transparent; color: var(--ss-primary); border-color: var(--ss-primary-50); }
.btn-ghost:hover { background: var(--ss-primary-10); }

/* Citation card */
.cite-card {
  background: var(--ss-surface);
  border: 1px solid var(--ss-border);
  border-radius: var(--ss-r-lg);
  padding: 18px 20px;
}
.cite-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.cite-text {
  background: var(--ss-bg);
  border: 1px solid var(--ss-border-soft);
  padding: 14px 16px;
  border-radius: var(--ss-r-md);
  font-size: 12px;
  line-height: 1.7;
  color: var(--ss-text);
  margin: 0;
  white-space: pre-wrap;
}
.btn-copy {
  background: none;
  border: 1px solid var(--ss-border);
  color: var(--ss-text-2);
  font-size: 11px;
  padding: 4px 10px;
  border-radius: var(--ss-r-md);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--ss-font);
  transition: var(--ss-tr-fast);
}
.btn-copy:hover { color: var(--ss-primary); border-color: var(--ss-primary); }

@media (max-width: 800px) {
  .dl-grid { grid-template-columns: 1fr; }
}
</style>
