<script setup>
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '../components/Icon.vue';
import Modal from '../components/Modal.vue';
import StatusBadge from '../components/StatusBadge.vue';
import EmptyState from '../components/EmptyState.vue';
import { workspace, commit, notify, syncTaskStatus } from '../stores/workspace';
import { members } from '../data/seed';

const router = useRouter();
const search = ref('');
const status = ref('全部任务');
const mine = ref(false);
const sort = ref('newest');
const page = ref(1);
const creating = ref(false);
const detailId = ref('');
const deleting = ref(null);
const busy = ref(false);
const form = reactive({
  name: '',
  description: '',
  documentIds: [],
  members: ['林同学'],
  adjudicator: '王同学',
  deadline: '2026-10-30',
});
const detail = computed(() => workspace.tasks.find((task) => task.id === detailId.value));
const allMembers = computed(() => [...new Set([workspace.user?.name, ...members].filter(Boolean))]);
const availableDocs = computed(() =>
  workspace.documents.filter(
    (doc) => !workspace.tasks.some((task) => task.documentIds.includes(doc.id)),
  ),
);
const tabs = ['全部任务', '未开始', '标注中', '待裁定', '已完成'];
const counts = computed(() => ({
  全部任务: workspace.tasks.length,
  ...Object.fromEntries(
    tabs.slice(1).map((tab) => [tab, workspace.tasks.filter((task) => task.status === tab).length]),
  ),
}));
const filtered = computed(() =>
  workspace.tasks
    .filter(
      (task) =>
        (status.value === '全部任务' || task.status === status.value) &&
        (!mine.value ||
          task.members.includes(workspace.user?.name) ||
          task.owner === workspace.user?.name ||
          task.adjudicator === workspace.user?.name) &&
        `${task.name}${task.id}${task.owner}${task.category}`
          .toLowerCase()
          .includes(search.value.toLowerCase()),
    )
    .sort((a, b) =>
      sort.value === 'deadline'
        ? a.deadline.localeCompare(b.deadline)
        : b.createdAt.localeCompare(a.createdAt),
    ),
);
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / 6)));
const currentPage = computed(() => Math.min(page.value, totalPages.value));
const rows = computed(() =>
  filtered.value.slice((currentPage.value - 1) * 6, currentPage.value * 6),
);
const taskDocs = (task) => workspace.documents.filter((doc) => task.documentIds.includes(doc.id));
function progress(task) {
  const docs = taskDocs(task);
  return docs.length
    ? Math.round(
        (docs.reduce(
          (sum, doc) =>
            sum +
            (['待裁定', '已完成'].includes(doc.status) ? 1 : doc.annotations.length ? 0.5 : 0),
          0,
        ) /
          docs.length) *
          100,
      )
    : 0;
}
function action(task) {
  if (task.status === '待裁定')
    router.push({ path: '/review', query: { document: task.documentIds[0] } });
  else if (task.status === '已完成') router.push({ path: '/exports', query: { task: task.id } });
  else router.push(`/workbench/${task.documentIds[0]}`);
}
function openCreate() {
  Object.assign(form, {
    name: '',
    description: '',
    documentIds: [],
    members: [workspace.user?.name || '林同学'],
    adjudicator: '王同学',
    deadline: '2026-10-30',
  });
  creating.value = true;
}
async function createTask() {
  if (!form.name.trim() || !form.documentIds.length || !form.members.length)
    return notify('请填写任务名称，选择文书和至少一位标注者。', 'error');
  busy.value = true;
  const ok = await commit((data) => {
    data.tasks.unshift({
      ...JSON.parse(JSON.stringify(form)),
      name: form.name.trim(),
      id: `T${Date.now()}`,
      owner: workspace.user.name,
      category:
        workspace.documents.find((doc) => doc.id === form.documentIds[0])?.category || '自定义任务',
      status: '未开始',
      guideVersion: 'v1.0',
      createdAt: new Date().toISOString().slice(0, 10),
    });
    syncTaskStatus(data);
  });
  busy.value = false;
  if (ok) {
    creating.value = false;
    status.value = '全部任务';
    page.value = 1;
    search.value = '';
    notify('任务已创建，可以开始标注');
  }
}
async function deleteTask() {
  const ok = await commit((data) => {
    data.tasks = data.tasks.filter((task) => task.id !== deleting.value.id);
  });
  if (ok) {
    deleting.value = null;
    detailId.value = '';
    notify('任务已删除，文书及标注仍保留');
  }
}
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">WORKSPACE / TASKS</div>
      <h1>
        任务管理
        <span class="heading-dot">.</span>
      </h1>
      <p>从一份文书开始，让每一步标注井然有序。</p>
    </div>
    <div class="button-row">
      <button class="button" @click="router.push('/documents?import=1')">
        <Icon name="Upload" />
        导入文书
      </button>
      <button class="button primary" @click="openCreate">
        <Icon name="Plus" />
        新建任务
      </button>
    </div>
  </div>
  <section class="welcome-strip">
    <div class="welcome-icon"><Icon name="Sparkles" :size="22" /></div>
    <div>
      <strong>
        你好，{{ workspace.user?.name }}
        <span class="welcome-wave">☀</span>
      </strong>
      <p>
        今天也从梳理一段清晰的论证开始。你有
        <b>
          {{
            workspace.tasks.filter(
              (task) =>
                task.members.includes(workspace.user?.name) &&
                ['未开始', '标注中'].includes(task.status),
            ).length
          }}
          项
        </b>
        标注任务等待推进。
      </p>
    </div>
    <RouterLink to="/guide">
      查看标注指南
      <Icon name="ArrowUpRight" :size="16" />
    </RouterLink>
    <span class="strip-decoration" aria-hidden="true">§</span>
  </section>
  <section class="stats-grid">
    <button class="stat-card" @click="status = '标注中'">
      <div class="stat-top">
        <span>进行中的任务</span>
        <span class="stat-icon teal"><Icon name="Highlighter" /></span>
      </div>
      <div class="stat-number">
        {{ counts['标注中'] }}
        <small>项</small>
      </div>
      <p>
        <span class="tiny-dot teal"></span>
        逐字梳理，连接论证
      </p>
      <span class="stat-decoration"></span>
    </button>
    <button class="stat-card" @click="router.push('/documents')">
      <div class="stat-top">
        <span>文书总量</span>
        <span class="stat-icon blue"><Icon name="Files" /></span>
      </div>
      <div class="stat-number">
        {{ workspace.documents.length }}
        <small>份</small>
      </div>
      <p>覆盖 {{ new Set(workspace.documents.map((doc) => doc.category)).size }} 类案件类型</p>
    </button>
    <button class="stat-card" @click="status = '待裁定'">
      <div class="stat-top">
        <span>待裁定文书</span>
        <span class="stat-icon amber"><Icon name="GitCompareArrows" /></span>
      </div>
      <div class="stat-number">
        {{ workspace.documents.filter((doc) => doc.status === '待裁定').length }}
        <small>份</small>
      </div>
      <p>
        <span class="tiny-dot amber"></span>
        {{ workspace.conflicts.filter((item) => item.status === '待处理').length }} 处标注分歧待处理
      </p>
    </button>
    <button class="stat-card" @click="status = '已完成'">
      <div class="stat-top">
        <span>已完成任务</span>
        <span class="stat-icon purple"><Icon name="CircleCheck" /></span>
      </div>
      <div class="stat-number">
        {{ counts['已完成'] }}
        <small>项</small>
      </div>
      <p>
        沉淀每一次协作成果
        <Icon name="ArrowUpRight" :size="14" />
      </p>
    </button>
  </section>
  <section class="panel task-panel">
    <div class="panel-toolbar">
      <div class="section-title">
        <h2>任务列表</h2>
        <span class="count-chip">{{ workspace.tasks.length }}</span>
      </div>
      <div class="toolbar-controls">
        <label class="search-field">
          <Icon name="Search" :size="17" />
          <input
            v-model="search"
            aria-label="搜索任务"
            placeholder="搜索任务名称、编号、负责人…"
            @input="page = 1"
          />
          <button v-if="search" class="icon-button" aria-label="清空搜索" @click="search = ''">
            <Icon name="X" :size="14" />
          </button>
        </label>
        <select v-model="sort" aria-label="任务排序" class="compact-select">
          <option value="newest">最近创建</option>
          <option value="deadline">截止时间</option>
        </select>
      </div>
    </div>
    <div class="tab-toolbar">
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab"
          :class="{ active: status === tab }"
          @click="
            status = tab;
            page = 1;
          "
        >
          {{ tab }}
          <span>{{ counts[tab] }}</span>
        </button>
      </div>
      <label class="check-label">
        <input v-model="mine" type="checkbox" @change="page = 1" />
        只看我的任务
      </label>
    </div>
    <div class="table-scroll">
      <table class="task-table">
        <thead>
          <tr>
            <th>任务名称 / 编号</th>
            <th>参与成员</th>
            <th>
              标注进度
              <span class="subtle">ⓘ</span>
            </th>
            <th>截止日期</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="task in rows" :key="task.id">
            <td>
              <div class="task-name-cell">
                <span class="document-symbol" :class="{ finished: task.status === '已完成' }">
                  <Icon name="FileText" :size="21" />
                </span>
                <div>
                  <button class="text-button task-title" @click="detailId = task.id">
                    {{ task.name }}
                  </button>
                  <div class="task-meta">
                    {{ task.id }}
                    <span>·</span>
                    {{ task.documentIds.length }} 份文书
                    <span>·</span>
                    {{ task.guideVersion }}
                  </div>
                </div>
              </div>
            </td>
            <td>
              <div class="member-avatars">
                <span
                  v-for="(member, index) in task.members.slice(0, 3)"
                  :key="member"
                  class="avatar small-avatar"
                  :class="`avatar-${index}`"
                  :title="member"
                >
                  {{ member[0] }}
                </span>
                <small>{{ task.members.length }} 人</small>
              </div>
            </td>
            <td>
              <div class="progress-label">
                <span>
                  {{ progress(task) }}
                  <small>%</small>
                </span>
                <small>
                  {{
                    taskDocs(task).filter((doc) => ['待裁定', '已完成'].includes(doc.status))
                      .length
                  }}/{{ task.documentIds.length }} 已提交
                </small>
              </div>
              <div class="progress-track">
                <span
                  :style="{ width: `${progress(task)}%` }"
                  :class="{ complete: progress(task) === 100 }"
                ></span>
              </div>
            </td>
            <td class="date-cell">
              {{ task.deadline }}
              <small>{{ task.category }}</small>
            </td>
            <td><StatusBadge :status="task.status" /></td>
            <td>
              <div class="row-actions">
                <button class="text-button action-link" @click="action(task)">
                  {{
                    task.status === '已完成'
                      ? '导出结果'
                      : task.status === '待裁定'
                        ? '进入裁定'
                        : task.status === '未开始'
                          ? '开始标注'
                          : '继续标注'
                  }}
                  <Icon name="ArrowRight" :size="14" />
                </button>
                <button
                  class="icon-button"
                  :aria-label="`查看${task.name}详情`"
                  @click="detailId = task.id"
                >
                  <Icon name="Ellipsis" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <EmptyState
        v-if="!rows.length"
        title="没有找到符合条件的任务"
        description="试试其他关键词，或创建一个新任务。"
      >
        <button
          class="button small"
          @click="
            search = '';
            status = '全部任务';
            mine = false;
          "
        >
          清除筛选
        </button>
      </EmptyState>
    </div>
    <div class="table-footer">
      <span>
        共 {{ filtered.length }} 项任务
        <span class="footer-separator">/</span>
        每页显示 6 项
      </span>
      <div class="pagination">
        <button
          class="icon-button"
          :disabled="currentPage === 1"
          aria-label="上一页"
          @click="page = currentPage - 1"
        >
          <Icon name="ChevronLeft" :size="16" />
        </button>
        <span>{{ currentPage }}</span>
        <button
          class="icon-button"
          :disabled="currentPage >= totalPages"
          aria-label="下一页"
          @click="page = currentPage + 1"
        >
          <Icon name="ChevronRight" :size="16" />
        </button>
      </div>
    </div>
  </section>
  <div class="bottom-note">
    <Icon name="ShieldCheck" :size="16" />
    <span>统一标签标准，让协作更有共识</span>
    <span class="note-divider"></span>
    <span>当前指南 v1.0</span>
    <RouterLink to="/guide">
      了解更多
      <Icon name="ArrowUpRight" :size="13" />
    </RouterLink>
  </div>
  <Modal v-if="creating" title="创建标注任务" wide @close="creating = false">
    <form id="task-form" class="form-grid" @submit.prevent="createTask">
      <label class="span-two">
        任务名称
        <input
          v-model="form.name"
          required
          maxlength="60"
          placeholder="例如：买卖合同 · 第二轮标注"
        />
      </label>
      <label class="span-two">
        任务说明
        <textarea
          v-model="form.description"
          rows="2"
          maxlength="500"
          placeholder="描述本次标注的重点与要求"
        ></textarea>
      </label>
      <label>
        截止日期
        <input v-model="form.deadline" type="date" required />
      </label>
      <label>
        裁定者
        <select v-model="form.adjudicator">
          <option v-for="member in allMembers" :key="member">{{ member }}</option>
        </select>
      </label>
      <fieldset class="span-two">
        <legend>参与标注的成员</legend>
        <div class="choice-row">
          <label v-for="member in allMembers" :key="member" class="check-label choice">
            <input v-model="form.members" type="checkbox" :value="member" />
            {{ member }}
          </label>
        </div>
      </fieldset>
      <fieldset class="span-two">
        <legend>
          选择文书
          <small>仅显示尚未加入任务的文书</small>
        </legend>
        <div class="document-choices">
          <label v-for="doc in availableDocs" :key="doc.id" class="check-label">
            <input v-model="form.documentIds" type="checkbox" :value="doc.id" />
            <Icon name="FileText" :size="16" />
            {{ doc.title }}
          </label>
          <p v-if="!availableDocs.length" class="muted">
            暂无可分配文书。请先在文书管理中导入或录入文书。
          </p>
        </div>
      </fieldset>
      <div class="notice span-two">
        <Icon name="Info" :size="17" />
        <p>本任务使用标签指南 v1.0；成员分配为本地演示，真实协作由后端接入。</p>
      </div>
    </form>
    <template #footer>
      <button class="button" @click="creating = false">取消</button>
      <button
        class="button primary"
        type="submit"
        form="task-form"
        :disabled="busy || !availableDocs.length"
      >
        创建任务
        <Icon name="ArrowRight" :size="16" />
      </button>
    </template>
  </Modal>
  <Modal v-if="detail" :title="detail.name" wide @close="detailId = ''">
    <div class="detail-top">
      <StatusBadge :status="detail.status" />
      <span class="muted">{{ detail.id }} · 指南 {{ detail.guideVersion }}</span>
    </div>
    <p class="detail-description">{{ detail.description || '暂无任务说明' }}</p>
    <div class="detail-grid">
      <div>
        <small>任务创建者</small>
        <strong>{{ detail.owner }}</strong>
      </div>
      <div>
        <small>标注成员</small>
        <strong>{{ detail.members.join('、') }}</strong>
      </div>
      <div>
        <small>裁定者</small>
        <strong>{{ detail.adjudicator }}</strong>
      </div>
      <div>
        <small>截止日期</small>
        <strong>{{ detail.deadline }}</strong>
      </div>
    </div>
    <h3 class="section-subtitle">任务文书</h3>
    <div v-for="doc in taskDocs(detail)" :key="doc.id" class="detail-doc">
      <Icon name="FileText" />
      <span>{{ doc.title }}</span>
      <StatusBadge :status="doc.status" />
      <button class="text-button action-link" @click="router.push(`/workbench/${doc.id}`)">
        查看
        <Icon name="ArrowUpRight" :size="14" />
      </button>
    </div>
    <p class="muted small-text">
      进度口径：未开始 0%，草稿 50%，已提交 100%；完成裁定后任务标记为已完成。
    </p>
    <template #footer>
      <button
        class="button danger push-left"
        @click="
          deleting = detail;
          detailId = '';
        "
      >
        <Icon name="Trash2" :size="16" />
        删除任务
      </button>
      <button class="button" @click="detailId = ''">关闭</button>
      <button class="button primary" @click="action(detail)">
        进入任务
        <Icon name="ArrowRight" :size="16" />
      </button>
    </template>
  </Modal>
  <Modal v-if="deleting" title="删除任务" @close="deleting = null">
    <p>确定删除“{{ deleting.name }}”？文书及已有标注会保留，可以重新分配。</p>
    <template #footer>
      <button class="button" @click="deleting = null">取消</button>
      <button class="button danger" @click="deleteTask">确认删除</button>
    </template>
  </Modal>
</template>
