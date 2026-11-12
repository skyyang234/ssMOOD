<template>
  <div class="ai-page">
    <NavigationBar />
    <main class="ai-page-main">
      <div class="ai-page-wrap">
        <!-- 数据助手：作为页面内容（inline），不再是浮层 -->
        <AiChatWidget profile="data" variant="page" inline :show-fab="false" />
      </div>
    </main>
  </div>
</template>

<script setup>
// 导航栏「AI」对应的页面：数据问答 + 出图。
// 复用 AiChatWidget 的编排引擎（工具、提示词、图表弹窗全部共用），
// 只把外壳换成"页面内布局"——左栏引用样本 + 中间对话列 + 底部输入。
import NavigationBar from './general/NavigationBar.vue';
import AiChatWidget from './general/AiChatWidget.vue';
</script>

<style scoped>
.ai-page {
  display: flex;
  flex-direction: column;
  /* 关键一：必须是「确定高度」，否则面板会被内容撑高，
     输入框被顶到屏幕外、整页跟着滚动（表现为标题栏滚没了、输入框到不了底）。
     关键二：NavigationBar 是 position:fixed（不占文档流），这里必须用等高的
     padding-top 把它的空间补出来，否则页面从 y=0 开始、顶部内容被导航栏盖住。 */
  height: 100vh;
  padding-top: var(--ss-nav-h, 56px);
  box-sizing: border-box;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}
.ai-page-main {
  /* 剩余高度交给 flex 分配（= 100vh - 导航高），不再写死 calc，避免与 padding 重复相减 */
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  /* 铺满整页：不留外框留白，面板直接顶到导航栏下沿与窗口左右边界 */
  padding: 0;
  overflow: hidden;
  background: #ffffff;
}
.ai-page-wrap {
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: none;
  margin: 0;
  display: flex;
}
/* 子组件（AiChatWidget）的根节点：撑满并纵向排布，使内嵌面板能用 flex:1 拿到高度 */
.ai-page-wrap > * {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
@media (max-width: 1100px) {
  .ai-page-main { padding: 16px 18px 20px; }
}
@media (max-width: 900px) {
  .ai-page-main { padding: 10px 10px 12px; }
}
</style>
