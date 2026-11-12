<template>
  <header class="ss-nav">
    <div class="ss-nav-inner">
      <!-- Logo + wordmark -->
      <router-link to="/" class="ss-brand">
        <span class="ss-brand-mark" v-html="logoSvg"></span>
        <span class="ss-brand-text">
          <span class="ss-brand-name">ssMOOD</span>
          <span class="ss-brand-tag">{{ $t('footer_tagline') || 'Spatial & Single-cell Major Depression Omics' }}</span>
        </span>
      </router-link>

      <!-- Primary nav -->
      <nav class="ss-nav-links">
        <router-link to="/" class="ss-nav-link" exact-active-class="active">
          {{ $t('home') }}
        </router-link>

        <!-- Browse with submenu -->
        <div
          class="ss-nav-link has-submenu"
          :class="{ active: isBrowse }"
          @mouseenter="showBrowse = true"
          @mouseleave="showBrowse = false"
        >
          <router-link to="/browse" class="ss-browse-trigger" @click.stop>
            <span>{{ $t('browse') }}</span>
          </router-link>
          <svg class="ss-caret" viewBox="0 0 12 12" width="10" height="10">
            <path d="M2 4 L6 8 L10 4" fill="none" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <transition name="ss-fade">
            <div v-if="showBrowse" class="ss-submenu">
              <router-link to="/browse/singlecell" class="ss-sub-item">
                <span class="ss-sub-dot" style="background: rgb(93,116,162)"></span>
                <div>
                  <div class="ss-sub-title">{{ $t('browse-SingleCell') }}</div>
                  <div class="ss-sub-desc">snRNA-seq</div>
                </div>
              </router-link>
              <router-link to="/browse/spatialtranscriptome" class="ss-sub-item">
                <span class="ss-sub-dot" style="background: #3a8a72"></span>
                <div>
                  <div class="ss-sub-title">{{ $t('browse-SpatialTranscriptome') }}</div>
                  <div class="ss-sub-desc">Stereo-seq</div>
                </div>
              </router-link>

            </div>
          </transition>
        </div>

        <router-link to="/about" class="ss-nav-link" active-class="active">
          {{ $t('about') }}
        </router-link>
      </nav>

      <!-- Right side: language switcher (self-contained, uses i18n directly) -->
      <div class="ss-nav-right">
        <LanguageSwitcher />
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import LanguageSwitcher from './LanguageSwitcher.vue';

const route = useRoute();
const showBrowse = ref(false);
const isBrowse = computed(() => route.path.startsWith('/browse'));

// Inline logo SVG (matches src/assets/logo-mark.svg)
const logoSvg = `
<svg viewBox="0 0 56 56" width="36" height="36">
  <path d="M10 30 C8 20,12 10,20 7 C26 4,34 4,40 8 C47 13,50 20,48 28 C46 35,42 40,38 43 C34 46,30 47,28 47 C26 47,22 46,18 43 C13 39,11 36,10 30Z"
        fill="none" stroke="rgb(93,116,162)" stroke-width="1.2" opacity="0.30"/>
  <path d="M20 22 C24 18,30 19,34 16" fill="none" stroke="rgb(93,116,162)" stroke-width="0.9" opacity="0.30"/>
  <circle cx="19" cy="19" r="5.5" fill="rgb(93,116,162)" opacity="0.18"/>
  <circle cx="19" cy="19" r="3.2" fill="rgb(93,116,162)"/>
  <circle cx="36" cy="16" r="2.6" fill="rgb(140,170,210)"/>
  <circle cx="41" cy="30" r="4.8" fill="#c0614a" opacity="0.16"/>
  <circle cx="41" cy="30" r="2.8" fill="#c0614a"/>
  <circle cx="28" cy="42" r="2.4" fill="#3a8a72"/>
  <circle cx="16" cy="35" r="2.0" fill="#5aab8a"/>
  <circle cx="30" cy="26" r="2.2" fill="#6652a8"/>
  <line x1="19" y1="19" x2="36" y2="16" stroke="rgb(93,116,162)" stroke-width="0.9" opacity="0.32"/>
  <line x1="19" y1="19" x2="16" y2="35" stroke="rgb(93,116,162)" stroke-width="0.9" opacity="0.22"/>
  <line x1="16" y1="35" x2="28" y2="42" stroke="#3a8a72" stroke-width="0.9" opacity="0.26"/>
  <line x1="41" y1="30" x2="28" y2="42" stroke="#c0614a" stroke-width="0.9" opacity="0.22"/>
  <line x1="30" y1="26" x2="19" y2="19" stroke="#6652a8" stroke-width="0.9" opacity="0.20"/>
</svg>`;
</script>

<style scoped>
/* ===== Deep navigation theme =====
   Self-contained: does NOT follow the page light/dark theme.
   All --nav-* vars live on .ss-nav so they inherit down. */
.ss-nav {
  --nav-bg: rgba(18, 26, 42, 0.95);
  --nav-border: rgba(255, 255, 255, 0.10);
  --nav-text: rgba(225, 235, 248, 0.82);
  --nav-text-hover: #dce8f8;
  --nav-text-active: #a8cff0;
  --nav-brand: #e8eef8;
  --nav-brand-tag: rgba(170, 195, 225, 0.62);
  --nav-hover-bg: rgba(120, 170, 230, 0.14);
  --nav-active-bg: rgba(120, 170, 230, 0.18);
  --nav-accent: #7fb5ea;

  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--ss-nav-h);
  background: var(--nav-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--nav-border);
  z-index: 1000;
  transition: var(--ss-tr-md);
}

.ss-nav-inner {
  /* 关键修复：width:100% + padding 需要 border-box，
     否则总宽 = 100% + 80px，右侧 40px 被推出视口（语言按钮因此"超出边界"） */
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 0 40px;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Brand block */
.ss-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  flex-shrink: 0;
  margin-right: 24px;
}
.ss-brand-mark { display: flex; line-height: 0; }
.ss-brand-text { display: flex; flex-direction: column; line-height: 1.1; }
.ss-brand-name {
  font-size: 17px;
  font-weight: 600;
  color: var(--nav-brand);
  letter-spacing: -0.01em;
  font-family: var(--ss-mono);
}
.ss-brand-tag {
  font-size: 9.5px;
  color: var(--nav-brand-tag);
  font-weight: 400;
  letter-spacing: 0.04em;
  margin-top: 2px;
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Primary links */
.ss-nav-links {
  display: flex;
  align-items: center;
  gap: 4px;
}
.ss-nav-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 14px;
  height: 36px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--nav-text);
  text-decoration: none;
  border-radius: var(--ss-r-md);
  cursor: pointer;
  transition: var(--ss-tr-fast);
  user-select: none;
}
.ss-nav-link:hover {
  color: var(--nav-text-hover);
  background: var(--nav-hover-bg);
}
.ss-nav-link.active {
  color: var(--nav-text-active);
  font-weight: 600;
  background: var(--nav-active-bg);
}
/* 「使用助手」是 <button>：复用 .ss-nav-link 的排版，去掉按钮默认外观 */
.ss-nav-guide {
  background: none;
  border: 0;
  font-family: inherit;
  appearance: none;
}
.ss-nav-guide:hover { background: var(--nav-hover-bg); }
.ss-nav-link.active::after {
  content: '';
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: -10px;
  height: 2px;
  background: var(--nav-accent);
  border-radius: 1px;
}
.ss-caret { opacity: 0.55; }

/* Browse trigger — make the text a clickable link while preserving submenu hover */
.ss-browse-trigger {
  color: inherit;
  text-decoration: none;
  display: flex;
  align-items: center;
  height: 100%;
}
.ss-browse-trigger:hover {
  color: inherit;
  text-decoration: none;
}

/* Submenu */
.has-submenu { position: relative; }
.ss-submenu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 8px;
  background: rgba(24, 32, 52, 0.98);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--ss-r-lg);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.40);
  padding: 6px;
  min-width: 260px;
  z-index: 1001;
}
.ss-sub-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--ss-r-md);
  text-decoration: none;
  color: rgba(220, 232, 248, 0.85);
  transition: var(--ss-tr-fast);
}
.ss-sub-item:hover {
  background: rgba(120, 170, 230, 0.16);
  text-decoration: none;
  color: #f0f6ff;
}
.ss-sub-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px rgba(0,0,0,0.25);
}
.ss-sub-title {
  font-size: 13px;
  font-weight: 500;
  color: rgba(225, 238, 252, 0.92);
}
.ss-sub-desc {
  font-size: 11px;
  color: rgba(160, 190, 220, 0.58);
  font-family: var(--ss-mono);
  margin-top: 1px;
}

/* Right slot — pushed to far right */
.ss-nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  margin-left: auto;
}

/* Transitions */
.ss-fade-enter-active, .ss-fade-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.ss-fade-enter-from, .ss-fade-leave-to { opacity: 0; transform: translateY(-4px); }

/* Mobile */
@media (max-width: 900px) {
  .ss-nav-inner { padding: 0 16px; gap: 4px; }
  .ss-brand-tag { display: none; }
  .ss-nav-link { padding: 0 8px; font-size: 12.5px; }
  .ss-nav-link.active::after { left: 8px; right: 8px; }
  .ss-brand { margin-right: 8px; }
}
</style>
