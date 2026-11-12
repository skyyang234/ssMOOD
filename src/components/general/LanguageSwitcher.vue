<template>
  <div class="lang-dropdown" ref="dropdownRef">
    <button class="lang-trigger" @click="open = !open">
      <span class="lang-trigger-label">{{ currentLabel }}</span>
      <svg class="lang-trigger-caret" :class="{ flipped: open }" viewBox="0 0 12 12" width="10" height="10">
        <path d="M2 4 L6 8 L10 4" fill="none" stroke="currentColor" stroke-width="1.6"/>
      </svg>
    </button>
    <transition name="lang-dd">
      <ul v-if="open" class="lang-menu">
        <li
          v-for="opt in options"
          :key="opt.value"
          class="lang-item"
          :class="{ active: locale === opt.value }"
          @click="switchTo(opt.value)"
        >
          {{ opt.label }}
          <svg v-if="locale === opt.value" class="lang-check" viewBox="0 0 12 12" width="10" height="10">
            <path d="M2 6 L5 9 L10 3" fill="none" stroke="currentColor" stroke-width="1.6"/>
          </svg>
        </li>
      </ul>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

const options = [
  { label: '简体中文', value: 'zh-CN' },
  { label: '繁體中文', value: 'zh-TW' },
  { label: 'English',  value: 'en'     },
]

const open = ref(false)
const dropdownRef = ref(null)

const currentLabel = computed(() => {
  const found = options.find(o => o.value === locale.value)
  return found ? found.label : 'Language'
})

const switchTo = (val) => {
  locale.value = val
  localStorage.setItem('selectedLanguage', val)
  open.value = false
}

/* close on outside click */
const onClickOutside = (e) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
  const saved = localStorage.getItem('selectedLanguage')
  if (saved === 'zh1') { locale.value = 'zh-CN'; return }
  if (saved === 'zh2') { locale.value = 'zh-TW'; return }
  if (saved === 'en' || saved === 'zh-CN' || saved === 'zh-TW') { locale.value = saved; return }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
})
</script>

<style scoped>
.lang-dropdown {
  position: relative;
  user-select: none;
}

/* ── Trigger button ── */
.lang-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: rgba(220, 235, 250, 0.82);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.18s ease;
  font-family: var(--ss-font, system-ui, sans-serif);
  line-height: 1.5;
  outline: none;
  white-space: nowrap;
}
.lang-trigger:hover {
  color: #f0f5ff;
  background: rgba(120, 170, 230, 0.18);
  border-color: rgba(255, 255, 255, 0.28);
}
.lang-trigger-caret {
  opacity: 0.6;
  transition: transform 0.18s ease;
}
.lang-trigger-caret.flipped {
  transform: rotate(180deg);
}

/* ── Dropdown menu ── */
.lang-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 132px;
  margin: 0;
  padding: 4px;
  list-style: none;
  background: rgba(20, 28, 48, 0.98);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
  z-index: 1100;
}

.lang-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 12px;
  font-size: 12.5px;
  font-weight: 500;
  color: rgba(220, 235, 250, 0.80);
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.lang-item:hover {
  background: rgba(120, 170, 230, 0.16);
  color: #f0f6ff;
}
.lang-item.active {
  color: #ffffff;
  background: rgba(100, 160, 220, 0.26);
  font-weight: 600;
}
.lang-check {
  flex-shrink: 0;
  opacity: 0.8;
}

/* ── Transition ── */
.lang-dd-enter-active,
.lang-dd-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.lang-dd-enter-from,
.lang-dd-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
