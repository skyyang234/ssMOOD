<template>
  <el-config-provider :locale="elementLocale">
    <div id="app">
      <router-view :key="routerKey"/>
        <HelloInfo/>
        <SsFooter/>
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
//-------------------------------------------------------
//💻 终端欢迎信息输出
//项目使用git管理，欢迎信息中的版本号自动获取，为git的branch名
//email在config/index.js中定义
//-------------------------------------------------------
import HelloInfo from './components/general/HelloInfo.vue';

// Router-view key: 强制 scStudy / stStudy 在 study 参数变化时重建组件
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

</style>