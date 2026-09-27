<script setup>
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import Icon from '../components/Icon.vue';
import EmptyState from '../components/EmptyState.vue';
import StatusBadge from '../components/StatusBadge.vue';
import ArgumentGraph from '../components/ArgumentGraph.vue';
import { workspace, commit, notify } from '../stores/workspace';
import { labels, relationTypes } from '../data/seed';
import { downloadFile } from '../utils/annotation';
import { graphSvg } from '../utils/graph';
const route = useRoute();
const taskId = ref(String(route.query.task || 'all'));
const includeDrafts = ref(false);
const format = ref('json');
const filename = ref('明理-文书标注成果');
const selected = ref([]);
const previewTab = ref('data');
const eligible = computed(() =>
  workspace.documents.filter(
    (doc) =>
      (includeDrafts.value || doc.status === '已完成') &&
      (taskId.value === 'all' ||
        workspace.tasks.find((task) => task.id === taskId.value)?.documentIds.includes(doc.id)),
  ),
);
const chosen = computed(() => eligible.value.filter((doc) => selected.value.includes(doc.id)));
const allChecked = computed(
  () => eligible.value.length > 0 && eligible.value.every((doc) => selected.value.includes(doc.id)),
);
const output = computed(() => ({
  schemaVersion: '1.0',
  guideVersion: 'v1.0',
  source: 'mingli-frontend-demo',
  offsetEncoding: 'UTF-16; start inclusive, end exclusive',
  guide: { labels, relations: relationTypes },
  documents: chosen.value.map((doc) => ({
    id: doc.id,
    title: doc.title,
    number: doc.number,
    court: doc.court,
    category: doc.category,
    status: doc.status,
    text: doc.text,
    annotations: doc.annotations,
    relations: doc.relations,
  })),
}));
const jsonPreview = computed(() => JSON.stringify(output.value, null, 2));
function toggleAll() {
  selected.value = allChecked.value ? [] : eligible.value.map((doc) => doc.id);
}
async function exportResults() {
  if (!chosen.value.length) return notify('请先选择需要导出的文书。', 'error');
  if (format.value === 'svg' && chosen.value.length !== 1)
    return notify('SVG 图示请每次选择一份文书；多文书可使用 JSON。', 'error');
  const name = (filename.value.trim() || '明理-文书标注成果').replace(/[\\/:*?"<>|]/g, '-');
  const fullName = `${name}.${format.value}`;
  try {
    if (format.value === 'json')
      downloadFile(
        JSON.stringify({ ...output.value, exportedAt: new Date().toISOString() }, null, 2),
        fullName,
        'application/json;charset=utf-8',
      );
    else
      downloadFile(
        graphSvg(chosen.value[0].annotations, chosen.value[0].relations),
        fullName,
        'image/svg+xml;charset=utf-8',
      );
    await commit((data) => {
      data.exports.unshift({
        id: `E${Date.now()}`,
        filename: fullName,
        count: chosen.value.length,
        createdAt: new Date().toISOString(),
        author: workspace.user.name,
      });
      data.exports = data.exports.slice(0, 20);
    });
    notify('已发起下载，请查看浏览器下载记录');
  } catch {
    notify('导出失败，请重新选择文书后重试。', 'error');
  }
}
</script>
<template>
  <div class="page-heading">
    <div>
      <span class="eyebrow">WORKSPACE / EXPORT</span>
      <h1>
        结果导出
        <span class="heading-dot">.</span>
      </h1>
      <p>将细致的标注，转化为可复用的研究成果。</p>
    </div>
    <span class="guide-version">
      <Icon name="ShieldCheck" :size="16" />
      附带标签指南 v1.0
    </span>
  </div>
  <div class="export-layout">
    <section class="panel export-config">
      <div class="panel-toolbar">
        <h2>配置导出内容</h2>
        <span class="step-label">01 — SELECT</span>
      </div>
      <div class="export-form form-stack">
        <label>
          任务范围
          <select v-model="taskId">
            <option value="all">全部任务与文书</option>
            <option v-for="task in workspace.tasks" :key="task.id" :value="task.id">
              {{ task.name }}
            </option>
          </select>
        </label>
        <label class="check-label">
          <input v-model="includeDrafts" type="checkbox" />
          包含草稿及待裁定结果
        </label>
        <div class="export-docs">
          <div class="row-between">
            <label class="check-label">
              <input
                type="checkbox"
                :checked="allChecked"
                :disabled="!eligible.length"
                @change="toggleAll"
              />
              选择全部文书
            </label>
            <small class="muted">已选 {{ chosen.length }} 份</small>
          </div>
          <label v-for="doc in eligible" :key="doc.id" class="export-doc">
            <input v-model="selected" type="checkbox" :value="doc.id" />
            <Icon name="FileText" :size="18" />
            <span>
              {{ doc.title }}
              <small>{{ doc.annotations.length }} 个命题 · {{ doc.relations.length }} 条关系</small>
            </span>
            <StatusBadge :status="doc.status" />
          </label>
          <p v-if="!eligible.length" class="muted">
            暂无已完成文书，可调整任务范围或勾选包含草稿。
          </p>
        </div>
        <label>导出格式</label>
        <div class="format-options">
          <button :class="{ active: format === 'json' }" @click="format = 'json'">
            <span class="format-symbol">{ }</span>
            <strong>JSON 数据</strong>
            <small>完整原文、标签与关系</small>
            <Icon v-if="format === 'json'" name="CircleCheck" :size="16" />
          </button>
          <button :class="{ active: format === 'svg' }" @click="format = 'svg'">
            <Icon name="Network" :size="24" />
            <strong>SVG 图示</strong>
            <small>单份文书 · 矢量图片</small>
            <Icon v-if="format === 'svg'" name="CircleCheck" :size="16" />
          </button>
        </div>
        <label>
          文件名称
          <div class="filename-input">
            <input v-model="filename" maxlength="100" placeholder="请输入文件名称" />
            <span>.{{ format }}</span>
          </div>
        </label>
        <div class="notice">
          <Icon name="Info" :size="17" />
          <p>
            JSON 包含完整标签指南和原文定位；SVG 适合展示论证关系。Excel、批量打包等导出待后续接入。
          </p>
        </div>
        <button class="button primary" :disabled="!chosen.length" @click="exportResults">
          <Icon name="Download" />
          导出 {{ chosen.length }} 份文书
        </button>
      </div>
    </section>
    <div class="export-right">
      <section class="panel export-preview">
        <div class="panel-toolbar">
          <h2>内容预览</h2>
          <div class="segmented">
            <button :class="{ active: previewTab === 'data' }" @click="previewTab = 'data'">
              数据
            </button>
            <button :class="{ active: previewTab === 'graph' }" @click="previewTab = 'graph'">
              图示
            </button>
          </div>
        </div>
        <EmptyState
          v-if="!chosen.length"
          title="你的成果，即将呈现"
          description="选择左侧文书，预览完整的标注结构。"
          icon="Network"
        />
        <template v-else>
          <div class="preview-summary">
            <span>
              <b>{{ chosen.length }}</b>
              份文书
            </span>
            <span>
              <b>{{ chosen.reduce((sum, doc) => sum + doc.annotations.length, 0) }}</b>
              个命题
            </span>
            <span>
              <b>{{ chosen.reduce((sum, doc) => sum + doc.relations.length, 0) }}</b>
              条关系
            </span>
          </div>
          <pre v-if="previewTab === 'data'" class="json-preview">{{ jsonPreview }}</pre>
          <template v-else>
            <p class="panel-hint">
              图示预览：{{ chosen[0].title }}{{ chosen.length > 1 ? '（仅展示第一份）' : '' }}
            </p>
            <ArgumentGraph :annotations="chosen[0].annotations" :relations="chosen[0].relations" />
          </template>
        </template>
      </section>
      <section class="panel export-history">
        <div class="panel-toolbar">
          <h2>最近导出</h2>
          <Icon name="Clock3" :size="17" />
        </div>
        <p v-if="!workspace.exports.length" class="muted history-empty">
          暂无导出记录，完成首次导出后将显示在这里。
        </p>
        <div v-for="item in workspace.exports.slice(0, 4)" :key="item.id" class="history-row">
          <span class="stat-icon teal"><Icon name="Download" :size="16" /></span>
          <div>
            <strong>{{ item.filename }}</strong>
            <small>{{ item.count }} 份文书 · {{ item.author }}</small>
          </div>
          <time>
            {{
              new Date(item.createdAt).toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })
            }}
          </time>
        </div>
      </section>
    </div>
  </div>
</template>
