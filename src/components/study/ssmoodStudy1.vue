<template>
  <article class="integrated-study-card">
    <div class="study-card-head">
      <span>{{ $t('integrated_study_type_sc') }}</span>
      <strong>{{ $t('integrated_study_sc_mouse') }}</strong>
    </div>
    <p>{{ $t('integrated_desc_sc_mouse') }}</p>
    <div class="study-stats">
      <div><span>{{ $t('integrated_label_species') }}</span><strong>{{ $t('integrated_species_mouse') }}</strong></div>
      <div><span>{{ $t('integrated_label_regions') }}</span><strong>I-V</strong></div>
      <div><span>{{ $t('integrated_label_conditions') }}</span><strong>5</strong></div>
      <div><span>{{ $t('integrated_label_route') }}</span><strong>scStudy</strong></div>
    </div>
    <div class="study-action-panel">
      <div class="study-action-section overview">
        <span class="study-action-label">{{ $t('integrated_action_overview') }}</span>
        <button class="study-action primary" @click="goToPage('study1.all')">{{ $t('integrated_action_all_samples') }}</button>
      </div>
      <div class="study-action-section">
        <span class="study-action-label">{{ $t('integrated_action_condition') }}</span>
        <div class="study-action-row">
          <button v-for="item in conditionActions" :key="item.id" class="study-action" @click="goToPage(item.id)">
            {{ item.label }}
          </button>
        </div>
      </div>
      <div class="study-action-section">
        <span class="study-action-label">{{ $t('integrated_action_brain_region') }}</span>
        <div class="study-action-row compact">
          <button v-for="item in regionActions" :key="item.id" class="study-action muted" @click="goToPage(item.id)">
            {{ item.label }}
          </button>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();
const conditionActions = [
  { id: 'study1.conditions.0D', label: '0D Control' },
  { id: 'study1.conditions.3D', label: '3D' },
  { id: 'study1.conditions.7D', label: '7D' },
  { id: 'study1.conditions.S', label: 'Susceptible' },
  { id: 'study1.conditions.R', label: 'Resilient' },
];
const regionActions = ['I', 'II', 'III', 'IV', 'V'].map(region => ({ id: `study1.area.${region}`, label: region }));

const goToPage = (study) => {
  router.push({ name: 'scStudy', params: { study } });
};
</script>

<style scoped>
.integrated-study-card {
  background: var(--ss-surface);
  border: 1px solid var(--ss-border);
  border-radius: 12px;
  padding: 14px 16px;
  min-height: 100%;
}
.study-card-head { display: grid; gap: 4px; margin-bottom: 8px; }
.study-card-head span { font-size: 11px; color: var(--ss-text-3); text-transform: uppercase; letter-spacing: .08em; }
.study-card-head strong { font-size: clamp(15px, 1.35vw, 18px); line-height: 1.25; color: var(--ss-text); font-family: var(--ss-font); font-weight: 700; overflow-wrap: anywhere; }
p { margin: 0 0 12px; color: var(--ss-text-2); font-size: 13px; line-height: 1.55; }
.study-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
.study-stats div { border: 1px solid var(--ss-border-soft); border-radius: 8px; padding: 8px; background: rgba(255,255,255,.55); }
.study-stats span { display: block; color: var(--ss-text-3); font-size: 10px; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 3px; }
.study-stats strong { color: var(--ss-text); font-size: 12px; font-family: var(--ss-mono); }
.study-action-panel { display: grid; gap: 10px; }
.study-action-section { border: 1px solid var(--ss-border-soft); border-radius: 8px; padding: 9px 10px; background: rgba(248,250,253,.72); }
.study-action-section.overview { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.study-action-label { display: block; margin-bottom: 7px; color: var(--ss-text-3); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; }
.study-action-section.overview .study-action-label { margin-bottom: 0; }
.study-action-row { display: flex; flex-wrap: wrap; gap: 6px; }
.study-action-row.compact .study-action { min-width: 40px; text-align: center; }
.study-action { border: 1px solid var(--ss-border); background: white; color: var(--ss-text-2); border-radius: 999px; padding: 5px 10px; font-size: 12px; font-family: var(--ss-font); cursor: pointer; transition: var(--ss-tr-fast); }
.study-action:hover { border-color: var(--ss-primary); color: var(--ss-primary); background: var(--ss-primary-10); }
.study-action.primary { background: var(--ss-primary); border-color: var(--ss-primary); color: white; }
.study-action.muted { color: var(--ss-teal); border-color: rgba(58,138,114,.28); }
@media (max-width: 900px) { .study-stats { grid-template-columns: repeat(2, 1fr); } }
</style>
