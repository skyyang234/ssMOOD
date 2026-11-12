<template>
    <div>
        <NavigationBar />
        <main class="container">
            <section class="page-section">
                <div v-if="loading">{{ $t('doc_loading') }}</div>
                <template v-else>
                    <VideoPlayer v-if="isUsage" />
                    <div v-html="content" class="md"></div>
                </template>
            </section>
        </main>
        <BackToTop />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import BackToTop from "./general/BackToTop.vue";
import NavigationBar from "./general/NavigationBar.vue";
import VideoPlayer from "./general/VideoPlayer.vue";

import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-light.css';

// 配置 markdown-it
const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return '<pre class="hljs"><code>' +
                       hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
                       '</code></pre>';
            } catch (err) {
                console.error('[DocPage] 高亮失败:', err);
            }
        }
        return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
    }
});

const route = useRoute();
const { t, locale } = useI18n();
const content = ref("");
const loading = ref(true);
const isUsage = computed(() => route.params.name === "Usage");

const loadMarkdown = async (name) => {
    if (!name) {
        content.value = `<p style="color:red;">${t('doc_error')}</p>`;
        loading.value = false;
        return;
    }

    try {
        loading.value = true;
        // 按当前语言加载对应版本文档：zh-CN 加载 _cn，zh-TW 加载 _tw，缺失时回退英文原版
        let file = name;
        const localizedDocs = {
            'zh-CN': { Methods: "Methods_cn", Usage: "Usage_cn", News: "News_cn" },
            'zh-TW': { Methods: "Methods_tw", Usage: "Usage_tw", News: "News_tw" }
        };
        const docMap = localizedDocs[locale.value] || {};
        if (docMap[name]) file = docMap[name];
        const res = await fetch(`/doc/${file}.md`);
        if (!res.ok) throw new Error(`${file}.md`);
        const text = await res.text();
        content.value = md.render(text);
    } catch (err) {
        console.error('[DocPage] load failed:', err);
        content.value = `<p style="color:red;">${t('doc_error')}: ${err.message}</p>`;
    } finally {
        loading.value = false;
    }
};

onMounted(() => loadMarkdown(route.params.name));
watch(() => route.params.name, (newName) => {
    if (newName) {
        loadMarkdown(newName);
    }
});
// 切换语言时重新加载当前文档
watch(locale, () => {
    if (route.params.name) {
        loadMarkdown(route.params.name);
    }
});
</script>


<style scoped>
@import "css/MainStyles.css";

/* 让 markdown 更美观 */
.prose {
    max-width: 90%;
    line-height: 1.8;
}

.md {
    width: 70%;
    margin: 0 auto;
}

/* 代码块样式优化 */
.md :deep(pre.hljs) {
    background: #f5f5f5;
    border-radius: 0.5rem;
    padding: 1rem;
    overflow-x: auto;
    margin: 1rem 0;
}

.md :deep(code) {
    font-size: 0.9rem;
    font-family: 'Courier New', monospace;
}

.md :deep(img) {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 1rem auto;
}

/* 其他 Markdown 元素样式 */
.md :deep(h1),
.md :deep(h2),
.md :deep(h3),
.md :deep(h4),
.md :deep(h5),
.md :deep(h6) {
    margin-top: 1.5rem;
    margin-bottom: 1rem;
    font-weight: 600;
}

.md :deep(p) {
    margin: 1rem 0;
    line-height: 1.8;
}

.md :deep(ul),
.md :deep(ol) {
    margin: 1rem 0;
    padding-left: 2rem;
}

.md :deep(li) {
    margin: 0.5rem 0;
}

.md :deep(blockquote) {
    border-left: 4px solid #ddd;
    margin: 1rem 0;
    padding-left: 1rem;
    color: #666;
    background: #f9f9f9;
    padding: 0.5rem 1rem;
}

.md :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
}

.md :deep(th),
.md :deep(td) {
    border: 1px solid #ddd;
    padding: 0.5rem;
    text-align: left;
}

.md :deep(th) {
    background: #f5f5f5;
    font-weight: 600;
}

.md :deep(a) {
    color: #42b983;
    text-decoration: none;
}

.md :deep(a:hover) {
    text-decoration: underline;
}
</style>
