import { createRouter, createWebHashHistory } from 'vue-router';
import NProgress from 'nprogress'; // 引入 NProgress
import 'nprogress/nprogress.css';  // 引入 NProgress 样式

import HomeView from '../components/HomeView.vue';


import SingleCellList from '../components/SingleCellList.vue'; 
import SingleCellPage from '../components/SingleCellPage.vue'; 

import studySingleCellPage from '../components/studySingleCellPage.vue'; 

import STList from '../components/STList.vue'; 
import STPage from '../components/STPage.vue'; 
import studySTPage from '../components/studySTPage.vue'; 
import ATACList from '../components/ATACList.vue';
import ATACPage from '../components/ATACPage.vue';
import GWASPage from '../components/GWASPage.vue';

//import SearchPage from '../components/SearchPage.vue'; 
import DownloadPage from '../components/DownloadPage.vue'; 
import DocPage from '../components/DocPage.vue';
import VisitLogPage from '../components/VisitLogPage.vue';

import ContactUsPage from '../components/ContactUsPage.vue';
import AboutPage from '../components/AboutPage.vue';
import BrowseHub from '../components/BrowseHub.vue';
import AIPage from '../components/AIPage.vue';


const routes = [
  { path: '/', name: 'Home', component: HomeView, meta: { requiresLoading: true } },
  { path: '/browse', name: 'BrowseHub', component: BrowseHub, meta: { requiresLoading: true } },
  // AI 数据助手（导航栏「AI」）：独立页面，不是浮层
  { path: '/ai', name: 'AIPage', component: AIPage, meta: { requiresLoading: true } },
  { path: '/browse/SingleCell', name: 'SingleCellList', component: SingleCellList, meta: { requiresLoading: true } },
  { path: '/browse/SpatialTranscriptome', name: 'SpatialTranscriptomeList', component: STList, meta: { requiresLoading: true } },
  { path: '/browse/atac', name: 'ATACList', component: ATACList, meta: { requiresLoading: true } },
  { path: '/browse/ATAC', redirect: '/browse/atac' },
  { path: '/browse/gwas', name: 'GWASPage', component: GWASPage, meta: { requiresLoading: true } },
  { path: '/browse/gwas/:id', name: 'GWASTraitPage', component: GWASPage, meta: { requiresLoading: true } },
  { path: '/browse/GWAS', redirect: '/browse/gwas' },
  //{ path: '/search', name: 'Search', component: SearchPage, meta: { requiresLoading: true } },
  { path: '/download', redirect: '/about/download' },
  { path: '/about/download', name: 'Download', component: DownloadPage, meta: { requiresLoading: true } },
  { path: '/about/doc/:name', name: 'Doc', component: DocPage, meta: { requiresLoading: true } },
  { path: '/browse/SingleCell/:id', name: 'SingleCellPage', component: SingleCellPage, meta: { requiresLoading: true } },
  { path: '/browse/atac/:id', name: 'ATACPage', component: ATACPage, meta: { requiresLoading: true } },
  { path: '/browse/ATAC/:id', redirect: to => `/browse/atac/${to.params.id}` },
  { path: '/browse/singleCellStudy/:study', name: 'scStudy', component: studySingleCellPage, meta: { requiresLoading: true } },
  { path: '/browse/stStudy/:study', name: 'stStudy', component: studySTPage, meta: { requiresLoading: true } },
  { path: '/browse/SpatialTranscriptome/:id', name: 'STPage', component: STPage, meta: { requiresLoading: true } },
  { path: '/about', name: 'About', component: AboutPage, meta: { requiresLoading: true } },
  { path: '/about/VisitLog', name: 'VisitLogPage', component: VisitLogPage, meta: { requiresLoading: true } },
  { path: '/about/ContactUs', name: 'ContactUsPage', component: ContactUsPage, meta: { requiresLoading: true } }
];

const router = createRouter({
  history: createWebHashHistory(process.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    if (to.path.startsWith('/browse/gwas') && from.path.startsWith('/browse/gwas')) {
      return false;
    }
    return { left: 0, top: 0 };
  }
});

router.beforeEach((to, from, next) => {
  NProgress.start(); // 开始加载进度条
  next(); // 确保调用 next() 以继续路由导航
});

router.afterEach(() => {
  NProgress.done(); // 完成加载进度条
});

export default router;