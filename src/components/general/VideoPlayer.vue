<template>
    <div class="video-container">
        <h2>📺 {{ videoTitle }}</h2>
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

<script>
import { computed } from 'vue';

export default {
    name: 'VideoPlayer',
    props: {
        locale: {
            type: String,
            required: true
        }
    },
    setup(props) {
        const videoConfig = {
            'zh-CN': {
                title: '视频教程',
                bvid: 'BV1SsQdBNEVs',
                cid: '36907583709'
            },
            'zh-TW': {
                title: '視頻教程',
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

        const videoTitle = computed(() => videoConfig[props.locale]?.title || videoConfig['en'].title);

        const videoSrc = computed(() => {
            const config = videoConfig[props.locale] || videoConfig['en'];
            if (props.locale === 'en') {
                return `//player.bilibili.com/player.html?isOutside=true&aid=${config.aid}&bvid=${config.bvid}&cid=${config.cid}&p=1`;
            }
            return `//player.bilibili.com/player.html?isOutside=true&high_quality=1&bvid=${config.bvid}&cid=${config.cid}&p=1`;
        });

        return { videoTitle, videoSrc };
    }
};
</script>

<style scoped>
.video-container {
    margin: 0 0 30px 0;
}

.video-container h2 {
    text-align: center;
    margin: 0 0 16px 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #333;
}

.video-wrapper {
    position: relative;
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    aspect-ratio: 16 / 9;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.video-wrapper iframe {
    width: 100%;
    height: 100%;
}
</style>
