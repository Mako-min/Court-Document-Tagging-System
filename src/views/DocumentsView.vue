<script setup>
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from '../components/Icon.vue';
import Modal from '../components/Modal.vue';
import EmptyState from '../components/EmptyState.vue';
import StatusBadge from '../components/StatusBadge.vue';
import { workspace, commit, notify, syncTaskStatus } from '../stores/workspace';
const route = useRoute();
const router = useRouter();
const search = ref('');
const category = ref('全部案由');
const status = ref('全部状态');
const importing = ref(route.query.import === '1');
const preview = ref(null);
const deleting = ref(null);
const busy = ref(false);
const form = reactive({ title: '', category: '买卖合同纠纷', number: '', court: '', text: '' });
const categories = computed(() => [...new Set(workspace.documents.map((doc) => doc.category))]);
const filtered = computed(() =>
  workspace.documents.filter(
    (doc) =>
      `${doc.title}${doc.number}`.includes(search.value) &&
      (category.value === '全部案由' || doc.category === category.value) &&
      (status.value === '全部状态' || doc.status === status.value),
  ),
);
function openImport() {
  Object.assign(form, { title: '', category: '买卖合同纠纷', number: '', court: '', text: '' });
  importing.value = true;
}
async function readFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!/\.txt$/i.test(file.name)) {
    notify('当前支持 UTF-8 TXT；PDF / Word 解析接口待后端接入。', 'error');
    event.target.value = '';
    return;
  }
  if (file.size > 1024 * 1024) {
    notify('演示版请上传 1 MB 以内的 TXT 文书。', 'error');
    event.target.value = '';
    return;
  }
  try {
    form.text = await file.text();
    form.title = file.name.replace(/\.txt$/i, '');
    notify('文本已读取，请核对文书信息');
  } catch {
    notify('文件读取失败，请重新选择文件。', 'error');
  }
  event.target.value = '';
}
async function importDocument() {
  if (form.text.length > 100000)
    return notify('正文不能超过 100,000 字，请缩短文本后重试。', 'error');
  if (!form.title.trim() || !form.category.trim() || !form.text.trim())
    return notify('请填写标题、案由和文书正文。', 'error');
  busy.value = true;
  const ok = await commit((data) => {
    data.documents.unshift({
      ...form,
      title: form.title.trim(),
      category: form.category.trim(),
      id: `D${Date.now()}`,
      text: form.text.replace(/\r\n?/g, '\n').trim(),
      date: new Date().toISOString().slice(0, 10),
      status: '未开始',
      annotations: [],
      relations: [],
      updatedAt: new Date().toISOString(),
    });
  });
  busy.value = false;
  if (ok) {
    importing.value = false;
    search.value = '';
    category.value = '全部案由';
    status.value = '全部状态';
    notify('文书已导入，可以标注或加入新任务');
  }
}
async function deleteDocument() {
  const id = deleting.value.id;
  if (workspace.tasks.some((task) => task.documentIds.includes(id)))
    return notify('请先删除关联任务，再删除文书。', 'error');
  const ok = await commit((data) => {
    data.documents = data.documents.filter((doc) => doc.id !== id);
    data.conflicts = data.conflicts.filter((item) => item.documentId !== id);
    syncTaskStatus(data);
  });
  if (ok) {
    deleting.value = null;
    notify('文书已删除');
  }
}
</script>
<template>
  <div class="page-heading">
    <div>
      <span class="eyebrow">WORKSPACE / DOCUMENTS</span>
      <h1>
        文书管理
        <span class="heading-dot">.</span>
      </h1>
      <p>有序收纳每一份文书，为标注准备可靠的原文。</p>
    </div>
    <button class="button primary" @click="openImport">
      <Icon name="Upload" />
      导入文书
    </button>
  </div>
  <div class="notice document-notice">
    <Icon name="Info" />
    <p>示例文书均为虚构，仅供功能演示。支持 TXT 导入与手动录入；PDF、Word 解析待后端接入。</p>
    <span class="count-chip">{{ workspace.documents.length }} 份文书</span>
  </div>
  <section class="panel">
    <div class="panel-toolbar">
      <label class="search-field">
        <Icon name="Search" />
        <input v-model="search" aria-label="搜索文书" placeholder="搜索文书标题、案号…" />
      </label>
      <div class="toolbar-controls">
        <select v-model="category" aria-label="按案由筛选">
          <option>全部案由</option>
          <option v-for="item in categories" :key="item">{{ item }}</option>
        </select>
        <select v-model="status" aria-label="按状态筛选">
          <option>全部状态</option>
          <option>未开始</option>
          <option>标注中</option>
          <option>待裁定</option>
          <option>已完成</option>
        </select>
      </div>
    </div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>文书名称</th>
            <th>案由</th>
            <th>原文 / 标注</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="doc in filtered" :key="doc.id">
            <td>
              <div class="task-name-cell">
                <span class="document-symbol"><Icon name="FileText" :size="22" /></span>
                <div>
                  <button class="text-button task-title" @click="preview = doc">
                    {{ doc.title }}
                  </button>
                  <div class="task-meta">{{ doc.number || '未填写案号' }}</div>
                </div>
              </div>
            </td>
            <td>{{ doc.category }}</td>
            <td>
              <span>{{ doc.text.length.toLocaleString() }} 字</span>
              <div class="task-meta">
                {{ doc.annotations.length }} 个命题 · {{ doc.relations.length }} 条关系
              </div>
            </td>
            <td><StatusBadge :status="doc.status" /></td>
            <td>
              <div class="row-actions">
                <button
                  class="text-button action-link"
                  @click="router.push(`/workbench/${doc.id}`)"
                >
                  {{ ['待裁定', '已完成'].includes(doc.status) ? '查看标注' : '进入标注' }}
                  <Icon name="ArrowRight" :size="14" />
                </button>
                <button class="icon-button" :aria-label="`预览${doc.title}`" @click="preview = doc">
                  <Icon name="Eye" :size="17" />
                </button>
                <button
                  class="icon-button danger-text"
                  :aria-label="`删除${doc.title}`"
                  @click="deleting = doc"
                >
                  <Icon name="Trash2" :size="16" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <EmptyState
      v-if="!filtered.length"
      title="这里还没有符合条件的文书"
      description="调整筛选条件，或者导入新的文书。"
    />
    <div class="table-footer">
      <span>共 {{ filtered.length }} 份文书</span>
      <span>原文位置按字符偏移记录</span>
    </div>
  </section>
  <Modal v-if="importing" title="导入文书" wide @close="importing = false">
    <form id="import-form" class="form-grid" @submit.prevent="importDocument">
      <label class="upload-zone span-two">
        <Icon name="Upload" :size="28" />
        <strong>选择 TXT 文书</strong>
        <span>UTF-8 编码，最大 1 MB；也可以直接粘贴下方正文</span>
        <input type="file" accept=".txt,text/plain" @change="readFile" />
      </label>
      <label class="span-two">
        文书标题
        <input v-model="form.title" required maxlength="100" placeholder="请输入文书标题" />
      </label>
      <label>
        案由
        <input v-model="form.category" required maxlength="50" list="categories" />
        <datalist id="categories">
          <option v-for="item in categories" :key="item" :value="item" />
        </datalist>
      </label>
      <label>
        案号
        <input v-model="form.number" maxlength="80" placeholder="选填" />
      </label>
      <label class="span-two">
        审理法院
        <input v-model="form.court" maxlength="80" placeholder="选填" />
      </label>
      <label class="span-two">
        文书正文
        <textarea
          v-model="form.text"
          required
          maxlength="100000"
          rows="8"
          placeholder="粘贴文书全文或裁判理由，最多 100,000 字。"
        ></textarea>
        <small class="muted">
          {{ form.text.length.toLocaleString() }} / 100,000 字 · 导入后原文固定，确保标注位置稳定。
        </small>
      </label>
    </form>
    <template #footer>
      <button class="button" @click="importing = false">取消</button>
      <button type="submit" form="import-form" class="button primary" :disabled="busy">
        确认导入
      </button>
    </template>
  </Modal>
  <Modal v-if="preview" :title="preview.title" wide @close="preview = null">
    <div class="document-meta">
      <span>{{ preview.number || '未填写案号' }}</span>
      <span>{{ preview.court || '未填写法院' }}</span>
    </div>
    <div class="preview-text">{{ preview.text }}</div>
    <template #footer>
      <button class="button" @click="preview = null">关闭</button>
      <button class="button primary" @click="router.push(`/workbench/${preview.id}`)">
        进入工作台
        <Icon name="ArrowRight" :size="16" />
      </button>
    </template>
  </Modal>
  <Modal v-if="deleting" title="删除文书" @close="deleting = null">
    <p v-if="workspace.tasks.some((task) => task.documentIds.includes(deleting.id))">
      这份文书已加入任务。请先在任务详情中删除关联任务，再删除文书。
    </p>
    <p v-else>确定删除“{{ deleting.title }}”？此操作会同时清除该文书的标注及关系，无法撤销。</p>
    <template #footer>
      <button class="button" @click="deleting = null">取消</button>
      <button
        class="button danger"
        :disabled="workspace.tasks.some((task) => task.documentIds.includes(deleting.id))"
        @click="deleteDocument"
      >
        确认删除
      </button>
    </template>
  </Modal>
</template>
