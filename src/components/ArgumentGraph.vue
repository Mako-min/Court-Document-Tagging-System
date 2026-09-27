<script setup>
import { computed } from 'vue';
import { graphLayout } from '../utils/graph';
defineEmits(['select']);
const props = defineProps({ annotations: Array, relations: Array });
const graph = computed(() => graphLayout(props.annotations, props.relations));
</script>
<template>
  <div class="graph-container">
    <svg :viewBox="`0 0 ${graph.width} ${graph.height}`" role="img" aria-label="命题论证关系图">
      <defs>
        <marker
          id="graph-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0 0L10 5L0 10z" fill="#657ca1" />
        </marker>
      </defs>
      <g v-for="edge in graph.edges" :key="edge.id">
        <path
          :d="edge.path"
          fill="none"
          stroke="#657ca1"
          stroke-width="1.5"
          marker-end="url(#graph-arrow)"
        />
        <text :x="edge.x" :y="edge.y" class="graph-edge-label">{{ edge.type }}</text>
      </g>
      <g
        v-for="node in graph.nodes"
        :key="node.id"
        class="graph-node"
        tabindex="0"
        role="button"
        :aria-label="`${node.id} ${node.text}`"
        @click="$emit('select', node.id)"
        @keydown.enter="$emit('select', node.id)"
      >
        <title>{{ node.text }}</title>
        <rect :x="node.x" :y="node.y" width="220" height="86" rx="10" />
        <text :x="node.x + 14" :y="node.y + 24" class="graph-node-id">
          {{ node.id }} · {{ node.label }}
        </text>
        <text :x="node.x + 14" :y="node.y + 47">{{ node.text.slice(0, 15) }}</text>
        <text :x="node.x + 14" :y="node.y + 66">
          {{ node.text.slice(15, 29) }}{{ node.text.length > 29 ? '…' : '' }}
        </text>
      </g>
    </svg>
  </div>
</template>
