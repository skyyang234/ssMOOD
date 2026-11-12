<template>
  <el-config-provider :locale="elementLocale">
    <div id="app">
      <router-view :key="routerKey"/>
        <HelloInfo/>
        <!-- 气泡 = 使用助手（站内操作指引 + 术语解释） -->
        <AiChatWidget profile="guide" />
        <!-- 数据助手是独立页面（/ai，见 components/AIPage.vue），由路由承载，不在这里挂载 -->
        <!-- AI 页面占满整屏，不显示站点页脚 -->
        <SsFooter v-if="route.path !== '/ai'" />
    </div>
  </el-config-provider>

</template>
<script setup>
import { onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import enLocale from 'element-plus/es/locale/lang/en';
import zhCnLocale from 'element-plus/es/locale/lang/zh-cn';
import zhTwLocale from 'element-plus/es/locale/lang/zh-tw';
import config from '@/config';
import SsFooter from './components/general/SsFooter.vue'
import AiChatWidget from './components/general/AiChatWidget.vue'
//-------------------------------------------------------
//💻 终端欢迎信息输出
//项目使用git管理，欢迎信息中的版本号自动获取，为git的branch名
//email在config/index.js中定义
//-------------------------------------------------------
import HelloInfo from './components/general/HelloInfo.vue';

// Router-view key: 强制 scStudy / stStudy 在 study 参数变化时重建组件，从而刷新整合数据。
// （单/空间整合页的所有数据都在 onMounted 读取 route.params.study，同路由换脑区不会自动重载）
const route = useRoute();
const routerKey = computed(() => {
  if (route.name === 'scStudy' || route.name === 'stStudy') return route.fullPath;
  return route.path;
});

// ElementPlus 内置文案（表格空数据、分页、弹窗按钮等）跟随站点语言切换
const { locale } = useI18n();
const elementLocale = computed(() =>
  ({ en: enLocale, 'zh-CN': zhCnLocale, 'zh-TW': zhTwLocale }[locale.value] || enLocale)
);
//------------------------------------------------------------------------------------------------------
//⚠️ 重写ResizeObserver函数，加入防抖，避免使用element-plus的元素出现警告：
//ResizeObserver loop completed with undelivered notifications.
//    at handleError (webpack-internal:///./node_modules/webpack-dev-server/client/overlay.js:251:58)
//    at eval (webpack-internal:///./node_modules/webpack-dev-server/client/overlay.js:270:7)
//-------------------------------------------------------------------------------------------------------
import debounce from 'lodash/debounce'
// 1. 保存原始构造函数
const NativeResizeObserver = window.ResizeObserver
// 2. 重写全局 ResizeObserver：回调加防抖
window.ResizeObserver = class extends NativeResizeObserver {
  constructor(callback) {
    super(debounce(callback, 100))
  }
}
//-------------------------------------------------------
//💻 访问统计
//-------------------------------------------------------
onMounted(() => {
  fetch(config.apiUrl+`log_visit.php`)
})

</script>
<style>
/* ── Global layout resets (non‑scoped so they hit html/body/#app) ── */
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
}
body {
  font-family: var(--ss-font, 'IBM Plex Sans', system-ui, sans-serif);
  background: var(--ss-bg, #f3f5fb);
  color: var(--ss-text, #1a2438);
  font-size: 14px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Make router-view stretch to fill available space */
#app > :first-child {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Text selection */
::selection {
  background: var(--ss-primary-80, rgba(74,127,193,0.8));
  color: white;
}
::-moz-selection {
  background: var(--ss-primary-80, rgba(74,127,193,0.8));
  color: white;
}

/* Scrollbar */
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: var(--ss-bg, #f3f5fb); }
::-webkit-scrollbar-thumb {
  background: var(--ss-primary-50, rgba(74,127,193,0.5));
  border-radius: 6px;
}
::-webkit-scrollbar-thumb:hover { background: var(--ss-primary, rgb(74,127,193)); }
</style>