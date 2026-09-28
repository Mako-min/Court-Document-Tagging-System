<script setup>
import Icon from './Icon.vue';
defineProps({
  title: { type: String, default: '暂无内容' },
  description: String,
  icon: { type: String, default: 'FolderOpen' },
});
</script>
<template>
  <div class="empty-state">
    <span class="empty-icon"><Icon :name="icon" :size="30" /></span>
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <slot />
  </div>
</template>
