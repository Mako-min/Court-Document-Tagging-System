<script setup>
defineProps({ status: String });
const colors = {
  未开始: 'neutral',
  标注中: 'teal',
  待裁定: 'amber',
  已完成: 'blue',
  待处理: 'amber',
  已裁定: 'teal',
};
</script>
<template>
  <span class="status" :class="colors[status] || 'neutral'">
    <i></i>
    {{ status }}
  </span>
</template>
