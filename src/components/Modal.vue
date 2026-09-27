<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import Icon from './Icon.vue';
defineProps({ title: String, wide: Boolean });
const emit = defineEmits(['close']);
const panel = ref(null);
let previousFocus;
function onKey(event) {
  if (event.key === 'Escape') emit('close');
  if (event.key !== 'Tab') return;
  const controls = [
    ...panel.value.querySelectorAll('button, input, textarea, select, a[href], [tabindex="0"]'),
  ].filter((el) => !el.disabled && el.offsetParent !== null);
  const first = controls[0];
  const last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  }
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}
onMounted(() => {
  previousFocus = document.activeElement;
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', onKey);
  panel.value.querySelector('input, textarea, select, button')?.focus();
});
onUnmounted(() => {
  document.body.style.overflow = '';
  document.removeEventListener('keydown', onKey);
  previousFocus?.focus();
});
</script>
<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="emit('close')">
      <section
        ref="panel"
        class="modal"
        :class="{ wide }"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <header class="modal-head">
          <h2>{{ title }}</h2>
          <button class="icon-button" aria-label="关闭弹窗" @click="emit('close')">
            <Icon name="X" />
          </button>
        </header>
        <div class="modal-body"><slot /></div>
        <footer v-if="$slots.footer" class="modal-foot"><slot name="footer" /></footer>
      </section>
    </div>
  </Teleport>
</template>
