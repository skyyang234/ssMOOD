<template>
    <div class="video-container">
        <h2 class="video-title">{{ videoTitle }}</h2>
        <div class="video-wrapper">
            <iframe
                :src="videoSrc"
                scrolling="no"
                border="0"
                frameborder="no"
                framespacing="0"
                allowfullscreen="true"
            ></iframe>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { locale } = useI18n();

const videoConfig = {
    'zh-CN': {
        title: '视频教程',
        bvid: 'BV1SsQdBNEVs',
        cid: '36907583709'
    },
    'zh-TW': {
        title: '影片教學',
        bvid: 'BV1SsQdBNEVs',
        cid: '36907583709'
    },
    'en': {
        title: 'Video Tutorial',
        bvid: 'BV1iiQmBREkG',
        cid: '36967219208',
        aid: '116288806590113'
    }
};

const videoTitle = computed(() => videoConfig[locale.value]?.title || videoConfig['en'].title);

const videoSrc = computed(() => {
    const config = videoConfig[locale.value] || videoConfig['en'];
    if (locale.value === 'en') {
        return `//player.bilibili.com/player.html?isOutside=true&aid=${config.aid}&bvid=${config.bvid}&cid=${config.cid}&p=1`;
    }
    return `//player.bilibili.com/player.html?isOutside=true&high_quality=1&bvid=${config.bvid}&cid=${config.cid}&p=1`;
});
</script>

<style scoped>
.video-container {
    width: 100%;
    max-width: 800px;
    margin: 0 auto 30px;
}

.video-title {
    text-align: center;
    margin: 0 0 16px;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--ss-text);
}

.video-wrapper {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid var(--ss-border);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    background: var(--ss-surface);
}

.video-wrapper iframe {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
}
</style>
