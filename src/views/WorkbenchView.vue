<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router';
import Icon from '../components/Icon.vue';
import Modal from '../components/Modal.vue';
import EmptyState from '../components/EmptyState.vue';
import StatusBadge from '../components/StatusBadge.vue';
import ArgumentGraph from '../components/ArgumentGraph.vue';
import { workspace, commit, notify, syncTaskStatus } from '../stores/workspace';
import { labels, relationTypes } from '../data/seed';
import { nextId, overlaps, validateAnnotations } from '../utils/annotation';

const route = useRoute();
const router = useRouter();
const draft = ref(null);
const baseline = ref('');
const past = ref([]);
const future = ref([]);
const textElement = ref(null);
const activeTab = ref('annotations');
const showInfo = ref(false);
const selectedText = ref(null);
const editing = ref(null);
const showRelation = ref(false);
const showChecks = ref(false);
const submitting = ref(false);
const deleting = ref(null);
const leaving = ref(false);
let resolveLeave;
const annotationForm = reactive({ label: 'SF', subtype: '法律条文', note: '' });
const relationForm = reactive({ sources: [], target: '', type: 'S' });
const findText = ref('');
const foundIndex = ref(0);
const busy = ref(false);
const selectedId = ref('');
const subtypes = [
  '法律条文',
  '法律解释',
  '合同及合同解释',
  '习惯与行业惯例',
  '道德与价值观念',
  '其他规范判断',
];
const currentId = computed(() => route.params.id || workspace.documents[0]?.id);
const index = computed(() => workspace.documents.findIndex((doc) => doc.id === currentId.value));
const readonly = computed(() => draft.value && ['待裁定', '已完成'].includes(draft.value.status));
const serialize = () =>
  JSON.stringify({ annotations: draft.value?.annotations, relations: draft.value?.relations });
const dirty = computed(() => draft.value && serialize() !== baseline.value);
const issues = computed(() => (draft.value ? validateAnnotations(draft.value) : []));
const matches = computed(() => {
  if (!findText.value || !draft.value) return [];
  const result = [];
  let offset = draft.value.text.indexOf(findText.value);
  while (offset !== -1 && result.length < 1000) {
    result.push(offset);
    offset = draft.value.text.indexOf(findText.value, offset + Math.max(1, findText.value.length));
  }
  return result;
});
const segments = computed(() => {
  if (!draft.value) return [];
  const doc = draft.value;
  const cuts = new Set([0, doc.text.length]);
  doc.annotations.forEach((item) => {
    cuts.add(item.start);
    cuts.add(item.end);
  });
  const found = matches.value[foundIndex.value];
  if (found !== undefined) {
    cuts.add(found);
    cuts.add(found + findText.value.length);
  }
  const sorted = [...cuts].sort((a, b) => a - b);
  return sorted.slice(0, -1).map((start, i) => {
    const end = sorted[i + 1];
    const annotation = doc.annotations.find((item) => item.start <= start && item.end >= end);
    return {
      start,
      end,
      text: doc.text.slice(start, end),
      annotation,
      found: found !== undefined && start >= found && end <= found + findText.value.length,
    };
  });
});
function load() {
  const doc = workspace.documents.find((item) => item.id === currentId.value);
  draft.value = doc ? JSON.parse(JSON.stringify(doc)) : null;
  baseline.value = serialize();
  past.value = [];
  future.value = [];
  selectedText.value = null;
  showChecks.value = false;
  selectedId.value = '';
  findText.value = '';
}
watch(currentId, load, { immediate: true });
watch(
  () => workspace.documents,
  () => {
    if (!dirty.value) load();
  },
);
function checkpoint() {
  past.value.push(serialize());
  if (past.value.length > 50) past.value.shift();
  future.value = [];
}
function undo() {
  if (!past.value.length || readonly.value) return;
  future.value.push(serialize());
  Object.assign(draft.value, JSON.parse(past.value.pop()));
}
function redo() {
  if (!future.value.length || readonly.value) return;
  past.value.push(serialize());
  Object.assign(draft.value, JSON.parse(future.value.pop()));
}
function confirmLeave() {
  if (!dirty.value) return true;
  if (resolveLeave) return false;
  // 页面内弹窗避免原生对话框阻塞嵌入式浏览器。
  leaving.value = true;
  return new Promise((resolve) => {
    resolveLeave = resolve;
  });
}
function finishLeave(confirmed) {
  leaving.value = false;
  resolveLeave?.(confirmed);
  resolveLeave = null;
}
onBeforeRouteLeave(confirmLeave);
onBeforeRouteUpdate((to, from) => to.params.id === from.params.id || confirmLeave());
function beforeUnload(event) {
  if (dirty.value) {
    event.preventDefault();
    event.returnValue = '';
  }
}
function keyboard(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    if (!readonly.value) save();
  }
}
onMounted(() => {
  window.addEventListener('beforeunload', beforeUnload);
  window.addEventListener('keydown', keyboard);
});
onBeforeUnmount(() => {
  finishLeave(false);
  window.removeEventListener('beforeunload', beforeUnload);
  window.removeEventListener('keydown', keyboard);
});
function captureSelection() {
  if (readonly.value) return;
  const selection = window.getSelection();
  if (!selection?.rangeCount || selection.isCollapsed) return;
  const range = selection.getRangeAt(0);
  if (
    !textElement.value.contains(range.startContainer) ||
    !textElement.value.contains(range.endContainer)
  )
    return;
  // Range 前缀长度对应规范化原文的 UTF-16 字符偏移，重复文本也可准确定位。
  const prefix = range.cloneRange();
  prefix.selectNodeContents(textElement.value);
  prefix.setEnd(range.startContainer, range.startOffset);
  const raw = range.toString();
  const start = prefix.toString().length + raw.length - raw.trimStart().length;
  const text = raw.trim();
  if (!text) return;
  const end = start + text.length;
  if (overlaps(draft.value.annotations, start, end)) {
    notify('选区与已有标注重叠，请点击已有标注修改，或重新选择。', 'error');
    selectedText.value = null;
    return;
  }
  selectedText.value = { start, end, text };
}
function openAnnotation(annotation = null) {
  if (annotation) {
    editing.value = annotation;
    Object.assign(annotationForm, {
      label: annotation.label,
      subtype: annotation.subtype || '法律条文',
      note: annotation.note,
    });
  } else if (selectedText.value) {
    editing.value = { ...selectedText.value, id: '' };
    Object.assign(annotationForm, { label: 'SF', subtype: '法律条文', note: '' });
  }
}
function saveAnnotation() {
  checkpoint();
  const item = {
    ...editing.value,
    ...annotationForm,
    subtype: annotationForm.label === 'GM' ? annotationForm.subtype : '',
    id: editing.value.id || nextId(draft.value.annotations, 'P'),
  };
  const existing = draft.value.annotations.findIndex((annotation) => annotation.id === item.id);
  if (existing >= 0) draft.value.annotations[existing] = item;
  else draft.value.annotations.push(item);
  draft.value.annotations.sort((a, b) => a.start - b.start);
  editing.value = null;
  selectedText.value = null;
  selectedId.value = item.id;
  window.getSelection()?.removeAllRanges();
}
function removeAnnotation() {
  checkpoint();
  draft.value.annotations = draft.value.annotations.filter((item) => item.id !== deleting.value.id);
  draft.value.relations = draft.value.relations.filter(
    (item) => item.target !== deleting.value.id && !item.sources.includes(deleting.value.id),
  );
  deleting.value = null;
  editing.value = null;
}
function addRelation() {
  if (!relationForm.sources.length || !relationForm.target)
    return notify('请选择起点命题和终点命题。', 'error');
  if (relationForm.sources.includes(relationForm.target))
    return notify('关系起点与终点不能相同。', 'error');
  if (relationForm.type === 'J' && relationForm.sources.length < 2)
    return notify('组合关系至少需要两个起点命题。', 'error');
  if (relationForm.type !== 'J' && relationForm.sources.length !== 1)
    return notify('该关系请选择一个起点；多个共同理由请使用组合关系。', 'error');
  if (
    draft.value.relations.some(
      (item) =>
        item.type === relationForm.type &&
        item.target === relationForm.target &&
        [...item.sources].sort().join() === [...relationForm.sources].sort().join(),
    )
  )
    return notify('这条关系已存在。', 'error');
  checkpoint();
  draft.value.relations.push({
    ...JSON.parse(JSON.stringify(relationForm)),
    id: nextId(draft.value.relations, 'R'),
  });
  showRelation.value = false;
}
function deleteRelation(id) {
  checkpoint();
  draft.value.relations = draft.value.relations.filter((item) => item.id !== id);
}
function openRelation() {
  Object.assign(relationForm, { sources: [], target: '', type: 'S' });
  showRelation.value = true;
}
async function focusAnnotation(id) {
  selectedId.value = id;
  activeTab.value = 'annotations';
  await nextTick();
  textElement.value
    ?.querySelector(`[data-annotation="${id}"]`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
async function findNext(step = 1) {
  if (!matches.value.length) return;
  foundIndex.value = (foundIndex.value + step + matches.value.length) % matches.value.length;
  await nextTick();
  textElement.value
    ?.querySelector('.search-match')
    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
watch(findText, () => {
  foundIndex.value = 0;
  findNext(0);
});
async function save(submit = false) {
  if (busy.value || !draft.value || readonly.value) return;
  if (submit && issues.value.length) {
    showChecks.value = true;
    submitting.value = false;
    return notify('请先完成标注检查中的待修正项。', 'error');
  }
  busy.value = true;
  const saved = JSON.parse(JSON.stringify(draft.value));
  saved.status = submit ? '待裁定' : saved.annotations.length ? '标注中' : '未开始';
  saved.updatedAt = new Date().toISOString();
  const ok = await commit((data) => {
    data.documents[data.documents.findIndex((doc) => doc.id === saved.id)] = saved;
    syncTaskStatus(data);
  });
  if (ok) {
    draft.value = saved;
    baseline.value = serialize();
    submitting.value = false;
    notify(submit ? '标注已提交，可在冲突裁定页复核' : '草稿已保存到当前浏览器');
  }
  busy.value = false;
}
function nextDocument(direction) {
  const doc = workspace.documents[index.value + direction];
  if (doc) router.push(`/workbench/${doc.id}`);
}
</script>
<template>
  <Modal v-if="leaving" title="有未保存的标注" @close="finishLeave(false)">
    <p>当前文书的修改尚未保存。返回工作台保存草稿，或放弃本次修改后离开。</p>
    <template #footer>
      <button class="button" @click="finishLeave(false)">继续编辑</button>
      <button class="button danger" @click="finishLeave(true)">放弃修改并离开</button>
    </template>
  </Modal>
  <template v-if="draft">
    <div class="workbench-heading">
      <div>
        <RouterLink to="/documents" class="back-link">
          <Icon name="ArrowLeft" :size="15" />
          文书列表
        </RouterLink>
        <h1>
          标注工作台
          <span class="heading-dot">.</span>
        </h1>
      </div>
      <div class="button-row">
        <span class="save-status" :class="{ unsaved: dirty }">
          <span class="tiny-dot" :class="dirty ? 'amber' : 'teal'"></span>
          {{ readonly ? '已提交 · 只读' : dirty ? '有未保存的修改' : '所有修改已保存' }}
        </span>
        <button class="button" @click="showChecks = !showChecks">
          <Icon name="ListChecks" />
          检查标注
        </button>
        <button class="button" :disabled="readonly || busy || !dirty" @click="save()">
          <Icon name="Save" />
          保存草稿
        </button>
        <button class="button primary" :disabled="readonly || busy" @click="submitting = true">
          提交标注
          <Icon name="ArrowRight" :size="16" />
        </button>
      </div>
    </div>
    <div class="workbench-layout">
      <aside class="panel document-sidebar">
        <div class="sidebar-title">
          <h3>文书目录</h3>
          <span>{{ workspace.documents.length }}</span>
        </div>
        <button
          v-for="(doc, i) in workspace.documents"
          :key="doc.id"
          class="document-nav"
          :class="{ active: doc.id === draft.id }"
          @click="router.push(`/workbench/${doc.id}`)"
        >
          <span class="document-index">{{ String(i + 1).padStart(2, '0') }}</span>
          <div>
            <strong>{{ doc.title }}</strong>
            <span>
              <i :class="doc.status === '已完成' ? 'done-dot' : ''"></i>
              {{ doc.status }}
            </span>
          </div>
        </button>
        <div class="sidebar-help">
          <Icon name="Highlighter" :size="20" />
          <strong>从一句理由开始</strong>
          <p>在原文中拖选文字，再点击“添加标注”。点击已有色块可查看或修改。</p>
          <RouterLink to="/guide?tab=help">
            操作说明
            <Icon name="ArrowUpRight" :size="13" />
          </RouterLink>
        </div>
      </aside>
      <section class="panel reading-panel">
        <div class="reading-toolbar">
          <div class="button-row">
            <Icon name="FileText" :size="17" />
            <strong>文书原文</strong>
            <span class="muted">{{ draft.text.length }} 字</span>
          </div>
          <div class="button-row">
            <button
              class="icon-button"
              :disabled="!past.length || readonly"
              aria-label="撤销"
              title="撤销"
              @click="undo"
            >
              <Icon name="Undo2" :size="17" />
            </button>
            <button
              class="icon-button"
              :disabled="!future.length || readonly"
              aria-label="重做"
              title="重做"
              @click="redo"
            >
              <Icon name="Redo2" :size="17" />
            </button>
            <button
              class="icon-button"
              :aria-expanded="showInfo"
              aria-label="文书信息"
              @click="showInfo = !showInfo"
            >
              <Icon name="Info" :size="17" />
            </button>
          </div>
        </div>
        <div v-if="showInfo" class="document-info">
          <p>案号：{{ draft.number || '未填写' }}</p>
          <p>法院：{{ draft.court || '未填写' }}</p>
          <p>案由：{{ draft.category }} · 指南：v1.0</p>
        </div>
        <div class="document-search">
          <Icon name="Search" :size="15" />
          <input
            v-model="findText"
            placeholder="查找原文关键词"
            aria-label="查找原文关键词"
            @keydown.enter="findNext()"
          />
          <span v-if="findText">
            {{ matches.length ? foundIndex + 1 : 0 }}/{{ matches.length }}
          </span>
          <button
            class="icon-button"
            aria-label="下一个匹配"
            :disabled="!matches.length"
            @click="findNext()"
          >
            <Icon name="ChevronDown" :size="15" />
          </button>
        </div>
        <div class="document-paper">
          <div class="paper-heading">
            <span>民事判决书 · 教学标注</span>
            <h2>{{ draft.title }}</h2>
            <p>{{ draft.number || '自定义文书' }}</p>
          </div>
          <div class="paper-divider"><span>文 书 正 文</span></div>
          <div
            ref="textElement"
            class="document-text"
            @mouseup="captureSelection"
            @keyup="captureSelection"
          >
            <span
              v-for="segment in segments"
              :key="segment.start"
              :data-annotation="segment.annotation?.id"
              :class="[
                segment.annotation ? `text-highlight label-${segment.annotation.label}` : '',
                {
                  'selected-highlight': segment.annotation && segment.annotation.id === selectedId,
                  'search-match': segment.found,
                },
              ]"
              :title="
                segment.annotation
                  ? `${segment.annotation.id} · ${segment.annotation.label}，点击查看标注`
                  : undefined
              "
              @click="segment.annotation && openAnnotation(segment.annotation)"
              v-text="segment.text"
            ></span>
          </div>
          <div v-if="selectedText && !readonly" class="selection-bar">
            <span>已选择 {{ selectedText.text.length }} 字</span>
            <button class="button primary small" @click="openAnnotation()">
              <Icon name="Plus" :size="15" />
              添加标注
            </button>
            <button class="icon-button" aria-label="取消选区" @click="selectedText = null">
              <Icon name="X" :size="15" />
            </button>
          </div>
          <div class="paper-footnote">
            {{
              draft.id.startsWith('D00')
                ? '本页为虚构教学文书，不代表真实案件。'
                : '用户导入文书 · 原文按字符位置记录标注'
            }}
          </div>
        </div>
        <div class="reading-footer">
          <button class="text-button" :disabled="index <= 0" @click="nextDocument(-1)">
            <Icon name="ChevronLeft" :size="16" />
            上一篇
          </button>
          <span>{{ index + 1 }} / {{ workspace.documents.length }}</span>
          <button
            class="text-button"
            :disabled="index >= workspace.documents.length - 1"
            @click="nextDocument(1)"
          >
            下一篇
            <Icon name="ChevronRight" :size="16" />
          </button>
        </div>
      </section>
      <aside class="panel annotation-panel">
        <div class="annotation-tabs">
          <button
            :class="{ active: activeTab === 'annotations' }"
            @click="activeTab = 'annotations'"
          >
            命题
            <span>{{ draft.annotations.length }}</span>
          </button>
          <button :class="{ active: activeTab === 'relations' }" @click="activeTab = 'relations'">
            关系
            <span>{{ draft.relations.length }}</span>
          </button>
          <button :class="{ active: activeTab === 'graph' }" @click="activeTab = 'graph'">
            图示
          </button>
        </div>
        <div class="label-legend">
          <span v-for="label in labels" :key="label.code">
            <i :style="{ background: label.color }"></i>
            {{ label.code }} {{ label.name.slice(0, 4) }}
          </span>
        </div>
        <div v-if="showChecks" class="check-panel">
          <div>
            <strong>标注检查</strong>
            <button class="icon-button" aria-label="关闭检查" @click="showChecks = false">
              <Icon name="X" :size="14" />
            </button>
          </div>
          <p v-if="!issues.length" class="success-text">
            <Icon name="CircleCheck" :size="16" />
            检查通过，可以提交。
          </p>
          <button
            v-for="(issue, i) in issues"
            :key="i"
            class="check-issue"
            @click="issue.id && focusAnnotation(issue.id)"
          >
            <Icon name="AlertCircle" :size="14" />
            {{ issue.message }}
          </button>
        </div>
        <div class="annotation-content">
          <template v-if="activeTab === 'annotations'">
            <p class="panel-hint">点击命题编号定位原文，点击编辑修改标签。</p>
            <article
              v-for="item in draft.annotations"
              :key="item.id"
              class="annotation-card"
              :class="{ selected: selectedId === item.id }"
            >
              <div class="annotation-card-head">
                <button class="text-button proposition-id" @click="focusAnnotation(item.id)">
                  {{ item.id }}
                  <Icon name="ArrowUpRight" :size="12" />
                </button>
                <span class="label-chip" :class="`label-${item.label}`">
                  {{ item.label }} · {{ labels.find((label) => label.code === item.label)?.name }}
                </span>
                <button
                  class="icon-button"
                  :aria-label="`${readonly ? '查看' : '编辑'}命题${item.id}`"
                  @click="openAnnotation(item)"
                >
                  <Icon :name="readonly ? 'Eye' : 'Pencil'" :size="14" />
                </button>
              </div>
              <p>{{ item.text }}</p>
              <footer>
                <span>位置 {{ item.start }}–{{ item.end }}</span>
                <span v-if="item.note" title="有备注">
                  <Icon name="FileText" :size="12" />
                  备注
                </span>
              </footer>
            </article>
            <EmptyState
              v-if="!draft.annotations.length"
              title="开始你的第一个标注"
              description="在左侧原文中选中一段文字，为它赋予命题标签。"
              icon="Highlighter"
            />
          </template>
          <template v-else-if="activeTab === 'relations'">
            <div class="panel-hint row-between">
              <span>连接命题，梳理论证</span>
              <button
                class="text-button action-link"
                :disabled="readonly || draft.annotations.length < 2"
                @click="openRelation"
              >
                <Icon name="Plus" :size="14" />
                添加关系
              </button>
            </div>
            <article v-for="item in draft.relations" :key="item.id" class="relation-card">
              <div>
                <span class="relation-type">{{ item.type }}</span>
                <strong>{{ relationTypes.find((type) => type.code === item.type)?.name }}</strong>
                <small>{{ item.id }}</small>
                <button
                  class="icon-button push-right"
                  :disabled="readonly"
                  :aria-label="`删除关系${item.id}`"
                  @click="deleteRelation(item.id)"
                >
                  <Icon name="Trash2" :size="14" />
                </button>
              </div>
              <p>
                {{ item.sources.join(' + ') }}
                <Icon name="ArrowRight" :size="16" />
                {{ item.target }}
              </p>
            </article>
            <EmptyState
              v-if="!draft.relations.length"
              title="命题之间，建立联系"
              description="至少标注两个命题后，即可创建支持、反对等论证关系。"
              icon="GitBranch"
            />
          </template>
          <template v-else>
            <p class="panel-hint">箭头从理由指向结论，点击节点定位原文。</p>
            <ArgumentGraph
              v-if="draft.annotations.length"
              :annotations="draft.annotations"
              :relations="draft.relations"
              @select="focusAnnotation"
            />
            <EmptyState
              v-else
              title="暂无论证图示"
              description="添加命题和关系后，图示将自动生成。"
              icon="Network"
            />
            <p class="graph-legend">S 支持 · A 反对 · J 组合 · M 匹配 · I 同一</p>
          </template>
        </div>
        <div class="annotation-bottom">
          <Icon name="ShieldCheck" :size="15" />
          标注指南 v1.0
          <RouterLink to="/guide">
            查看指南
            <Icon name="ArrowUpRight" :size="13" />
          </RouterLink>
        </div>
      </aside>
    </div>
  </template>
  <EmptyState v-else title="未找到文书" description="请先导入文书，或从文书列表重新选择。">
    <RouterLink to="/documents" class="button primary">前往文书管理</RouterLink>
  </EmptyState>
  <Modal
    v-if="editing"
    :title="`${editing.id ? `${readonly ? '查看' : '编辑'}命题 ${editing.id}` : '添加命题标注'}`"
    @close="editing = null"
  >
    <blockquote class="selected-quote">{{ editing.text }}</blockquote>
    <form id="annotation-form" class="form-stack" @submit.prevent="saveAnnotation">
      <fieldset :disabled="readonly">
        <legend>命题标签</legend>
        <div class="label-options">
          <label
            v-for="label in labels"
            :key="label.code"
            :class="{ active: annotationForm.label === label.code }"
          >
            <input
              v-model="annotationForm.label"
              type="radio"
              :value="label.code"
              name="annotation-label"
            />
            <span :style="{ color: label.color }">{{ label.code }}</span>
            {{ label.name }}
          </label>
        </div>
      </fieldset>
      <label v-if="annotationForm.label === 'GM'">
        规范子类型
        <select v-model="annotationForm.subtype" :disabled="readonly">
          <option v-for="type in subtypes" :key="type">{{ type }}</option>
        </select>
      </label>
      <label>
        备注（选填）
        <textarea
          v-model="annotationForm.note"
          rows="3"
          maxlength="500"
          :readonly="readonly"
          placeholder="记录判断依据或待讨论的问题"
        ></textarea>
      </label>
    </form>
    <template #footer>
      <button
        v-if="editing.id && !readonly"
        class="button danger push-left"
        @click="
          deleting = editing;
          editing = null;
        "
      >
        <Icon name="Trash2" :size="16" />
        删除
      </button>
      <button class="button" @click="editing = null">{{ readonly ? '关闭' : '取消' }}</button>
      <button v-if="!readonly" class="button primary" form="annotation-form" type="submit">
        确认标注
      </button>
    </template>
  </Modal>
  <Modal v-if="showRelation" title="建立论证关系" @close="showRelation = false">
    <form id="relation-form" class="form-stack" @submit.prevent="addRelation">
      <label>
        关系类型
        <select v-model="relationForm.type">
          <option v-for="type in relationTypes" :key="type.code" :value="type.code">
            {{ type.code }} · {{ type.name }}
          </option>
        </select>
      </label>
      <p class="muted">
        {{ relationTypes.find((type) => type.code === relationForm.type)?.description }}
      </p>
      <fieldset>
        <legend>
          起点命题{{ relationForm.type === 'J' ? '（至少选择两个）' : '（选择一个）' }}
        </legend>
        <div class="relation-choices">
          <label v-for="item in draft.annotations" :key="item.id" class="check-label">
            <input v-model="relationForm.sources" type="checkbox" :value="item.id" />
            <strong>{{ item.id }}</strong>
            <span>{{ item.text }}</span>
          </label>
        </div>
      </fieldset>
      <label>
        终点命题
        <select v-model="relationForm.target" required>
          <option value="" disabled>请选择终点</option>
          <option v-for="item in draft.annotations" :key="item.id" :value="item.id">
            {{ item.id }} · {{ item.text.slice(0, 30) }}
          </option>
        </select>
      </label>
    </form>
    <template #footer>
      <button class="button" @click="showRelation = false">取消</button>
      <button class="button primary" form="relation-form" type="submit">建立关系</button>
    </template>
  </Modal>
  <Modal v-if="submitting" title="提交标注" @close="submitting = false">
    <div class="notice">
      <Icon name="ListChecks" />
      <p>
        将提交 {{ draft.annotations.length }} 个命题、{{ draft.relations.length }}
        条关系。提交后文书转为只读，进入人工裁定阶段。
      </p>
    </div>
    <p class="muted">当前版本仅模拟提交。多人独立标注与分歧计算待后端接入。</p>
    <template #footer>
      <button class="button" @click="submitting = false">再检查一下</button>
      <button class="button primary" :disabled="busy" @click="save(true)">确认提交</button>
    </template>
  </Modal>
  <Modal v-if="deleting" title="删除命题" @close="deleting = null">
    <p>确定删除 {{ deleting.id }}？引用该命题的论证关系也会一并删除。可在保存前使用撤销恢复。</p>
    <template #footer>
      <button class="button" @click="deleting = null">取消</button>
      <button class="button danger" @click="removeAnnotation">确认删除</button>
    </template>
  </Modal>
</template>
