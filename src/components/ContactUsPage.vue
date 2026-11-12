<template>
  <div>
    <NavigationBar />
    <main>
      <section class="page-section">

        <div class="page-hero">
          <div class="eyebrow">{{ $t('about') }}</div>
          <h1 class="page-hero-title">{{ $t('ContactUs') }}</h1>
          <p class="page-hero-sub">The team behind ssMOOD.</p>
        </div>

        <div class="people-grid">
          <div v-for="m in members" :key="m.email" class="person-card">
            <div class="person-avatar-wrap">
              <img :src="m.avatar" :alt="m.name" class="person-avatar" />
              <span class="person-affil-dot" :style="{ background: m.affilColor }" :title="m.affil"></span>
            </div>
            <div class="person-name">{{ m.name }}</div>
            <div class="person-loc">
              <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M8 1 C5 1 3 3 3 6 C3 10 8 15 8 15 C8 15 13 10 13 6 C13 3 11 1 8 1 Z"/><circle cx="8" cy="6" r="1.8"/></svg>
              {{ m.loc }}
            </div>
            <div class="person-email">
              <a :href="`mailto:${m.email}`">
                <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="3" width="12" height="10" rx="1"/><path d="M2 5 L8 9 L14 5"/></svg>
                <span>{{ m.safeEmail }}</span>
              </a>
              <button class="copy-btn" @click="copyEmail(m.email)" :aria-label="`Copy ${m.name}'s email`">
                <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="9" height="10" rx="1"/><path d="M9 4 V2 H2 V11 H4"/></svg>
              </button>
            </div>
          </div>
        </div>

      </section>
    </main>
    <BackToTop />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { ElMessage } from 'element-plus';
import BackToTop from './general/BackToTop.vue';
import NavigationBar from './general/NavigationBar.vue';

import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const e1 = ['caoxiong', 'smu.edu.cn'].join('@');
const e2 = ['guangchuangyu', 'smu.edu.cn'].join('@');
const e3 = ['treywea', 'smu.edu.cn'].join('@');
const e4 = ['yt22520318', 'i.smu.edu.cn'].join('@');

const safe = (e) => e.replace('@', '＠');

const COLOR_SMU = 'rgb(93,116,162)';

const members = computed(() => [
  { name: t('acu01'), role: 'Principal Investigator', loc: t('acu05'), affil: 'SMU', affilColor: COLOR_SMU, avatar: '/boy.png',  email: e1, safeEmail: safe(e1) },
  { name: t('acu02'), role: 'Co-PI',                   loc: t('acu06'), affil: 'SMU', affilColor: COLOR_SMU, avatar: '/boy.png',  email: e2, safeEmail: safe(e2) },
  { name: t('acu03'), role: 'Developer',               loc: t('acu06'), affil: 'SMU', affilColor: COLOR_SMU, avatar: '/girl.png', email: e3, safeEmail: safe(e3) },
  { name: t('acu04'), role: 'Developer',               loc: t('acu06'), affil: 'SMU', affilColor: COLOR_SMU, avatar: '/boy.png',  email: e4, safeEmail: safe(e4) },
]);

const copyEmail = async (email) => {
  try {
    await navigator.clipboard.writeText(email);
    ElMessage({ message: '邮箱已复制 / Email copied', type: 'success', duration: 1500 });
  } catch {
    ElMessage({ message: '复制失败，请手动复制', type: 'error' });
  }
};
</script>

<style scoped>
@import 'css/MainStyles.css';

.page-hero { margin-bottom: 28px; max-width: 700px; }
.page-hero-title { font-size: 30px; font-weight: 600; margin: 4px 0 8px; }
.page-hero-title::before { display: none; }
.page-hero-sub { font-size: 14px; color: var(--ss-text-2); }

.people-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  max-width: 920px;
  margin: 0 auto;
}
.person-card {
  background: var(--ss-surface);
  border: 1px solid var(--ss-border);
  border-radius: var(--ss-r-lg);
  padding: 24px 22px;
  transition: var(--ss-tr-md);
  text-align: center;
}
.person-card:hover {
  border-color: var(--ss-primary-50);
  box-shadow: var(--ss-shadow-md);
  transform: translateY(-2px);
}

.person-avatar-wrap {
  position: relative;
  width: 64px;
  height: 64px;
  margin: 0 auto 12px;
}
.person-avatar {
  width: 64px; height: 64px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--ss-bg);
  border: 2px solid var(--ss-border-soft);
}
.person-affil-dot {
  position: absolute;
  right: 0; bottom: 2px;
  width: 14px; height: 14px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: var(--ss-shadow-sm);
}

.person-name { font-size: 15px; font-weight: 600; color: var(--ss-text); }
.person-role {
  font-family: var(--ss-mono);
  font-size: 11px;
  color: var(--ss-primary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 4px;
}
.person-loc {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--ss-text-3);
  margin-top: 8px;
}
.person-email {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--ss-border-soft);
}
.person-email a {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--ss-mono);
  font-size: 11.5px;
  color: var(--ss-primary);
  text-decoration: none;
}
.person-email a:hover { color: var(--ss-primary-dark); text-decoration: underline; }
.copy-btn {
  background: none;
  border: none;
  color: var(--ss-text-3);
  cursor: pointer;
  padding: 3px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  transition: var(--ss-tr-fast);
}
.copy-btn:hover { color: var(--ss-primary); background: var(--ss-primary-10); }


@media (max-width: 800px) {
  .people-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 480px) {
  .people-grid { grid-template-columns: 1fr; }
}
</style>
