<template>
  <div>
    <NavigationBar />

    <main>
      <div class="page-section about-hub">
        <div class="eyebrow">{{ $t('about_eyebrow') }}</div>
        <h1 class="hub-title">{{ $t('about_hub_title') }}</h1>
        <p class="hub-lead">{{ $t('about_hub_sub') }}</p>

        <div class="hub-grid">
          <!-- Methods -->
          <router-link to="/about/doc/Methods" class="hub-card">
            <div class="hub-icon hub-i-blue">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6">
                <path d="M14 3 L20 3 L20 21 L4 21 L4 3 L10 3"/><path d="M9 3 L9 7 L15 7 L15 3"/><path d="M8 13 L16 13 M8 17 L13 17"/>
              </svg>
            </div>
            <div class="hub-name">{{ $t('about_methods') }}</div>
            <div class="hub-desc">{{ $t('about_methods_desc') }}</div>
            <div class="hub-meta">
              <span>{{ $t('about_methods_meta') }}</span>
              <span class="hub-link">{{ $t('about_link_read') }} &rarr;</span>
            </div>
          </router-link>

          <!-- Usage -->
          <router-link to="/about/doc/Usage" class="hub-card">
            <div class="hub-icon hub-i-teal">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6">
                <path d="M8 4 L4 8 L8 12"/><path d="M16 12 L20 16 L16 20"/><path d="M14 4 L10 20"/>
              </svg>
            </div>
            <div class="hub-name">{{ $t('about_usage') }}</div>
            <div class="hub-desc">{{ $t('about_usage_desc') }}</div>
            <div class="hub-meta">
              <span>{{ $t('about_usage_meta') }}</span>
              <span class="hub-link">{{ $t('about_link_read') }} &rarr;</span>
            </div>
          </router-link>

          <!-- News -->
          <router-link to="/about/doc/News" class="hub-card">
            <div class="hub-icon hub-i-violet">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6">
                <rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9 L21 9 M8 4 L8 2 M16 4 L16 2"/>
              </svg>
            </div>
            <div class="hub-name">{{ $t('about_news') }}</div>
            <div class="hub-desc">{{ $t('about_news_desc') }}</div>
            <div class="hub-meta">
              <span>{{ $t('about_news_meta') }}</span>
              <span class="hub-link">{{ $t('about_link_read') }} &rarr;</span>
            </div>
          </router-link>

          <!-- Visit Statistics -->
          <router-link to="/about/VisitLog" class="hub-card">
            <div class="hub-icon hub-i-gold">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6">
                <path d="M3 17 L9 11 L13 14 L21 6"/><path d="M15 6 L21 6 L21 12"/>
              </svg>
            </div>
            <div class="hub-name">{{ $t('about_stats') }}</div>
            <div class="hub-desc">{{ $t('about_stats_desc') }}</div>
            <div class="hub-meta">
              <span>{{ $t('about_stats_meta', { n: '-' }) }}</span>
              <span class="hub-link">{{ $t('about_link_view') }} &rarr;</span>
            </div>
          </router-link>

          <!-- Team & Contact -->
          <router-link to="/about/ContactUs" class="hub-card">
            <div class="hub-icon hub-i-coral">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6">
                <circle cx="9" cy="8" r="3"/><path d="M3 20 C3 16, 6 14, 9 14 C12 14, 15 16, 15 20"/><circle cx="17" cy="9" r="2.5"/><path d="M14 20 C14 17, 16 15, 17 15 C19 15, 21 17, 21 20"/>
              </svg>
            </div>
            <div class="hub-name">{{ $t('about_team') }}</div>
            <div class="hub-desc">{{ $t('about_team_desc') }}</div>
            <div class="hub-meta">
              <span>{{ $t('about_team_meta') }}</span>
              <span class="hub-link">{{ $t('about_link_view') }} &rarr;</span>
            </div>
          </router-link>

          <!-- Download（临时隐藏：点开仍有问题，恢复时取消注释即可）
          <router-link to="/about/download" class="hub-card">
            <div class="hub-icon hub-i-blue">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6">
                <path d="M12 3v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>
              </svg>
            </div>
            <div class="hub-name">{{ $t('about_source') }}</div>
            <div class="hub-desc">{{ $t('about_source_desc') }}</div>
            <div class="hub-meta">
              <span>{{ $t('about_source_meta') }}</span>
              <span class="hub-link">{{ $t('about_link_view') }} &rarr;</span>
            </div>
          </router-link>
          -->
        </div>
      </div>
    </main>

    <back-to-top />
  </div>
</template>

<script>
import NavigationBar from './general/NavigationBar.vue';
import BackToTop from './general/BackToTop.vue';

export default {
  name: 'AboutPage',
  components: { NavigationBar, BackToTop },
};
</script>

<style scoped>
@import 'css/MainStyles.css';

/* ── Hub page layout ── */
.about-hub {
  max-width: 1024px;
  margin-left: auto;
  margin-right: auto;
  padding-top: 44px;
  padding-bottom: 72px;
  text-align: center;
}

/* Eyebrow */
.eyebrow {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ss-primary);
  margin-bottom: 6px;
}

/* Title */
.hub-title {
  font-size: 30px;
  font-weight: 600;
  color: var(--ss-navy);
  margin: 0 0 10px;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

/* Lead */
.hub-lead {
  font-size: 14.5px;
  color: var(--ss-text-2);
  max-width: 680px;
  line-height: 1.65;
  margin: 0 auto 36px;
}

/* ── Card grid（5 卡片：3 + 2 最后一行居中）── */
.hub-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
}

/* ── Card ── */
.hub-card {
  background: var(--ss-surface);
  border: 1px solid var(--ss-border);
  border-radius: 12px;
  padding: 22px;
  box-sizing: border-box;
  width: calc((100% - 32px) / 3);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  text-decoration: none;
  transition: all 0.25s;
  position: relative;
  overflow: hidden;
}
.hub-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--ss-primary);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s;
}
.hub-card:hover {
  border-color: var(--ss-primary-50);
  box-shadow: var(--ss-shadow-md);
  transform: translateY(-2px);
}
.hub-card:hover::before { transform: scaleX(1); }

/* Icon */
.hub-icon {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hub-i-blue  { background: var(--ss-primary-10); color: var(--ss-primary); }
.hub-i-teal  { background: rgba(58,138,114,.12); color: rgb(58,138,114); }
.hub-i-violet{ background: rgba(102,82,168,.12);  color: rgb(102,82,168); }
.hub-i-gold  { background: rgba(176,138,48,.12);  color: rgb(176,138,48); }
.hub-i-coral { background: rgba(192,97,74,.12);  color: rgb(192,97,74); }

/* Card text */
.hub-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--ss-text);
}
.hub-desc {
  font-size: 13px;
  color: var(--ss-text-2);
  flex: 1;
  line-height: 1.55;
}
.hub-meta {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  font-family: var(--ss-mono);
  font-size: 11px;
  color: var(--ss-text-3);
  padding-top: 10px;
  border-top: 1px solid var(--ss-border);
  margin-top: 4px;
}
.hub-link {
  color: var(--ss-primary);
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

/* ── Responsive ── */
@media (max-width: 800px) {
  .hub-card { width: calc((100% - 16px) / 2); }
}
@media (max-width: 520px) {
  .hub-card { width: 100%; }
  .hub-title { font-size: 24px; }
}
</style>
