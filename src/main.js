import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import zhCn from './locales/zh-cn.json';
import zhTw from './locales/zh-tw.json';
import mitt from 'mitt';
import { createTerminal } from 'vue-web-terminal';
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css';
import './styles/element-theme.css';

// 创建国际化实例
const i18n = createI18n({
  locale: 'en',
  legacy: false,
  globalInjection: true,
  messages: {
    en,
    'zh-CN': zhCn,
    'zh-TW': zhTw,
  }
});
const eventBus = mitt();
const app = createApp(App);

app.use(router);
app.use(i18n);

app.use(createTerminal());
app.provide('eventBus', eventBus);

app.use(ElementPlus)
// 挂载应用
app.mount('#app');
// 等 Vue 渲染就绪 + 留足动画展示时间后关闭 loading
setTimeout(() => {
  const loader = document.getElementById('ss-loader')
  if (loader) {
    loader.classList.add('done')
    setTimeout(() => { if (loader) loader.style.display = 'none' }, 800)
  }
}, 3500)