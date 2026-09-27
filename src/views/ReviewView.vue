<script setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from '../components/Icon.vue';
import Modal from '../components/Modal.vue';
import EmptyState from '../components/EmptyState.vue';
import StatusBadge from '../components/StatusBadge.vue';
import { workspace, commit, notify, syncTaskStatus } from '../stores/workspace';
import { labels } from '../data/seed';
const route = useRoute();
const router = useRouter();
const selected = ref(String(route.query.document || ''));
const includeCompleted = ref(false);
const decision = ref('');
const note = ref('');
const resolving = ref(null);
const finishing = ref(false);
const documents = computed(() =>
  workspace.documents.filter(
    (doc) => doc.status === '待裁定' || (includeCompleted.value && doc.status === '已完成'),
  ),
);
const current = computed(
  () => documents.value.find((doc) => doc.id === selected.value) || documents.value[0],
);
const conflicts = computed(() =>
  workspace.conflicts.filter((item) => item.documentId === current.value?.id),
);
const pending = computed(() => conflicts.value.filter((item) => item.status === '待处理'));
function openResolve(conflict, label) {
  resolving.value = conflict;
  decision.value = label;
  note.value = '';
}
async function resolveConflict() {
  const ok = await commit((data) => {
    const conflict = data.conflicts.find((item) => item.id === resolving.value.id);
    Object.assign(conflict, {
      status: '已裁定',
      decision: decision.value,
      note: note.value,
      adjudicator: workspace.user.name,
    });
    const annotation = data.documents
      .find((doc) => doc.id === conflict.documentId)
      ?.annotations.find((item) => item.id === conflict.annotationId);
    if (annotation) {
      annotation.label = decision.value;
      annotation.subtype = decision.value === 'GM' ? '其他规范判断' : '';
    }
  });
  if (ok) {
    resolving.value = null;
    notify('裁定已保存，文书标注已同步更新');
  }
}
async function finishReview() {
  if (pending.value.length) return notify('请先处理所有待裁定分歧。', 'error');
  const id = current.value.id;
  const ok = await commit((data) => {
    data.documents.find((doc) => doc.id === id).status = '已完成';
    syncTaskStatus(data);
  });
  if (ok) {
    finishing.value = false;
    includeCompleted.value = true;
    selected.value = id;
    notify('文书复核已完成，可以导出结果');
  }
}
</script>
<template>
  <div class="page-heading">
    <div>
      <span class="eyebrow">WORKSPACE / REVIEW</span>
      <h1>
        冲突裁定
        <span class="heading-dot">.</span>
      </h1>
      <p>保留不同理解，在原文与规范之间形成共识。</p>
    </div>
    <label class="check-label">
      <input v-model="includeCompleted" type="checkbox" />
      显示已完成文书
    </label>
  </div>
  <div class="notice document-notice">
    <Icon name="Info" />
    <p>
      此页面演示人工复核流程。分歧示例为预置数据；新提交文书可直接人工复核，多人结果比对待后端接入。
    </p>
  </div>
  <div v-if="documents.length" class="review-layout">
    <aside class="panel review-sidebar">
      <div class="sidebar-title">
        <h3>待复核文书</h3>
        <span>{{ documents.length }}</span>
      </div>
      <button
        v-for="doc in documents"
        :key="doc.id"
        class="review-nav"
        :class="{ active: current.id === doc.id }"
        @click="selected = doc.id"
      >
        <Icon name="FileText" />
        <div>
          <strong>{{ doc.title }}</strong>
          <StatusBadge :status="doc.status" />
        </div>
      </button>
    </aside>
    <section class="panel review-main">
      <div class="panel-toolbar">
        <div>
          <h2>{{ current.title }}</h2>
          <p class="muted">{{ current.number }} · {{ pending.length }} 处待处理分歧</p>
        </div>
        <button class="button small" @click="router.push(`/workbench/${current.id}`)">
          <Icon name="Eye" :size="16" />
          查看原文
        </button>
      </div>
      <div class="review-body">
        <article v-for="conflict in conflicts" :key="conflict.id" class="conflict-block">
          <div class="row-between">
            <span class="eyebrow">{{ conflict.id }} / {{ conflict.type }}</span>
            <StatusBadge :status="conflict.status" />
          </div>
          <blockquote class="selected-quote">{{ conflict.quote }}</blockquote>
          <div class="comparison-grid">
            <div
              v-for="(option, side) in [conflict.left, conflict.right]"
              :key="side"
              class="comparison-card"
              :class="{ chosen: conflict.decision === option.label }"
            >
              <div class="row-between">
                <span class="member-name">
                  <span class="avatar small-avatar" :class="`avatar-${side}`">
                    {{ option.author[0] }}
                  </span>
                  {{ option.author }}
                </span>
                <small class="muted">独立标注 {{ side === 0 ? 'A' : 'B' }}</small>
              </div>
              <span class="label-chip" :class="`label-${option.label}`">
                {{ option.label }} · {{ labels.find((label) => label.code === option.label)?.name }}
              </span>
              <p>{{ option.reason }}</p>
              <button
                v-if="conflict.status === '待处理'"
                class="button small"
                @click="openResolve(conflict, option.label)"
              >
                <Icon name="Check" :size="15" />
                采用此标注
              </button>
            </div>
          </div>
          <button
            v-if="conflict.status === '待处理'"
            class="text-button custom-decision"
            @click="openResolve(conflict, 'SM')"
          >
            <Icon name="Pencil" :size="15" />
            自定义裁定标签
          </button>
          <div v-else class="resolved-note">
            <Icon name="CircleCheck" :size="18" />
            <div>
              <strong>
                裁定为 {{ conflict.decision }} · {{ conflict.adjudicator || '林同学' }}
              </strong>
              <p>{{ conflict.note || '未填写裁定备注' }}</p>
            </div>
          </div>
        </article>
        <div v-if="!conflicts.length" class="notice">
          <Icon name="ListChecks" />
          <p>该文书没有预置分歧。请检查下方命题与关系，再确认完成复核。</p>
        </div>
        <h3 class="section-subtitle">当前标注概览</h3>
        <div
          v-for="annotation in current.annotations"
          :key="annotation.id"
          class="review-annotation"
        >
          <strong>{{ annotation.id }}</strong>
          <span class="label-chip" :class="`label-${annotation.label}`">
            {{ annotation.label }}
          </span>
          <p>{{ annotation.text }}</p>
        </div>
        <div class="review-relations">
          <strong>论证关系</strong>
          <span v-if="!current.relations.length" class="muted">暂无关系</span>
          <span v-for="relation in current.relations" :key="relation.id" class="relation-summary">
            {{ relation.sources.join(' + ') }} → {{ relation.target }}
            <b>{{ relation.type }}</b>
          </span>
        </div>
      </div>
      <div class="panel-bottom row-between">
        <p class="muted">
          {{
            current.status === '已完成'
              ? '复核已完成，最终结果可供导出。'
              : '处理分歧并核对标注后，确认完成本篇复核。'
          }}
        </p>
        <button
          v-if="current.status !== '已完成'"
          class="button primary"
          :disabled="!!pending.length"
          @click="finishing = true"
        >
          <Icon name="CheckCheck" />
          完成复核
        </button>
        <button v-else class="button primary" @click="router.push('/exports')">
          <Icon name="Download" />
          导出结果
        </button>
      </div>
    </section>
  </div>
  <section v-else class="panel">
    <EmptyState
      title="所有复核已处理完毕"
      description="提交新的标注文书后，可在这里复核结果。"
      icon="CircleCheck"
    >
      <RouterLink to="/workbench" class="button primary">继续标注</RouterLink>
    </EmptyState>
  </section>
  <Modal v-if="resolving" title="确认裁定意见" @close="resolving = null">
    <form id="resolve-form" class="form-stack" @submit.prevent="resolveConflict">
      <blockquote class="selected-quote">{{ resolving.quote }}</blockquote>
      <label>
        最终标签
        <select v-model="decision">
          <option v-for="label in labels" :key="label.code" :value="label.code">
            {{ label.code }} · {{ label.name }}
          </option>
        </select>
      </label>
      <label>
        裁定说明
        <textarea
          v-model="note"
          rows="3"
          maxlength="500"
          placeholder="简要记录采用该标签的理由（选填）"
        ></textarea>
      </label>
    </form>
    <template #footer>
      <button class="button" @click="resolving = null">取消</button>
      <button class="button primary" form="resolve-form" type="submit">确认裁定</button>
    </template>
  </Modal>
  <Modal v-if="finishing" title="完成文书复核" @close="finishing = false">
    <p>确认“{{ current.title }}”的命题、标签和关系已核对完成？确认后文书将标记为已完成。</p>
    <template #footer>
      <button class="button" @click="finishing = false">取消</button>
      <button class="button primary" @click="finishReview">确认完成</button>
    </template>
  </Modal>
</template>
