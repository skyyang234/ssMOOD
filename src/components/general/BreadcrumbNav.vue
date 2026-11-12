<template>
  <nav class="ss-breadcrumb" aria-label="Breadcrumb">
    <ol class="ss-breadcrumb-list">
      <li class="ss-breadcrumb-item">
        <router-link to="/" class="ss-breadcrumb-link">{{ $t('home') }}</router-link>
        <span class="ss-breadcrumb-sep">›</span>
      </li>
      <li class="ss-breadcrumb-item">
        <router-link :to="parentRoute" class="ss-breadcrumb-link">{{ parentLabel }}</router-link>
        <span class="ss-breadcrumb-sep">›</span>
      </li>
      <li class="ss-breadcrumb-item ss-breadcrumb-current">
        {{ currentLabel }}
      </li>
    </ol>
  </nav>
</template>

<script setup>
defineProps({
  parentRoute: {
    type: [String, Object],
    required: true
  },
  parentLabel: {
    type: String,
    required: true
  },
  currentLabel: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
.ss-breadcrumb {
  padding: 12px 0;
  margin-bottom: 4px;
}

.ss-breadcrumb-list {
  display: flex;
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
  flex-wrap: wrap;
  gap: 0;
}

.ss-breadcrumb-item {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #8c8c8c;
}

.ss-breadcrumb-link {
  color: #5d74a2;
  text-decoration: none;
  transition: color 0.15s ease;
}

.ss-breadcrumb-link:hover {
  color: #3b5998;
  text-decoration: underline;
}

.ss-breadcrumb-sep {
  margin: 0 8px;
  color: #c0c4cc;
  user-select: none;
}

.ss-breadcrumb-current {
  color: #333;
  font-weight: 500;
}
</style>
