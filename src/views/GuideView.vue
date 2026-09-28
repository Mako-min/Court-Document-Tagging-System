<script setup>
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import Icon from '../components/Icon.vue';
import { labels, relationTypes } from '../data/seed';
const route = useRoute();
const tab = ref(route.query.tab === 'help' ? 'help' : 'labels');
watch(
  () => route.query.tab,
  (value) => {
    tab.value = value === 'help' ? 'help' : 'labels';
  },
);
const steps = [
  {
    title: '准备文书与任务',
    text: '在文书管理中上传 UTF-8 TXT 或粘贴原文，再在任务管理中新建任务、选择文书和成员。',
    icon: 'Files',
  },
  {
    title: '标记命题',
    text: '进入工作台，在原文中拖选一个完整命题，点击“添加标注”，选择标签并记录必要备注。',
    icon: 'Highlighter',
  },
  {
    title: '建立论证关系',
    text: '在关系标签页中选择起点、终点和关系类型。组合关系支持多个起点，图示会同步更新。',
    icon: 'GitBranch',
  },
  {
    title: '检查并提交',
    text: '保存草稿后检查原文位置、标签和关系端点。提交后进入只读状态，等待人工复核。',
    icon: 'ListChecks',
  },
  {
    title: '裁定并导出',
    text: '在冲突裁定页核对分歧并完成复核，随后导出 JSON 数据或 SVG 论证图示。',
    icon: 'Download',
  },
];
</script>
<template>
  <div class="page-heading">
    <div>
      <span class="eyebrow">WORKSPACE / GUIDELINES</span>
      <h1>
        标签指南
        <span class="heading-dot">.</span>
      </h1>
      <p>共同的标注语言，是高质量协作的起点。</p>
    </div>
    <span class="guide-version">
      <Icon name="LockKeyhole" :size="15" />
      v1.0 · 本版固定
    </span>
  </div>
  <section class="guide-hero">
    <div>
      <span class="eyebrow">A SHARED LANGUAGE FOR REASONING</span>
      <h2>先识别命题，再连接理由。</h2>
      <p>区分事实与规范、个别与一般，让每一次判断都有清晰的依据。</p>
    </div>
    <div class="guide-motif" aria-hidden="true">
      <span>SF</span>
      <i>+</i>
      <span>GM</span>
      <Icon name="ArrowRight" :size="27" />
      <b>SM</b>
    </div>
  </section>
  <div class="guide-tabs tabs">
    <button :class="{ active: tab === 'labels' }" @click="tab = 'labels'">
      <Icon name="BookOpen" :size="17" />
      标签体系
    </button>
    <button :class="{ active: tab === 'relations' }" @click="tab = 'relations'">
      <Icon name="GitBranch" :size="17" />
      论证关系
    </button>
    <button :class="{ active: tab === 'help' }" @click="tab = 'help'">
      <Icon name="CircleHelp" :size="17" />
      操作说明
    </button>
  </div>
  <template v-if="tab === 'labels'">
    <div class="label-guide-grid">
      <article v-for="label in labels" :key="label.code" class="panel label-guide-card">
        <div class="row-between">
          <span class="large-label" :class="`label-${label.code}`">{{ label.code }}</span>
          <span class="muted small-text">
            {{ label.code[0] === 'S' ? '针对具体案件' : '具有一般适用性' }}
          </span>
        </div>
        <h2>{{ label.name }}</h2>
        <p>{{ label.description }}</p>
        <div class="guide-example">
          <span>标注示例</span>
          <p>“{{ label.example }}”</p>
        </div>
      </article>
    </div>
    <div class="panel guide-principles">
      <h2>
        <Icon name="Info" :size="19" />
        标注约定
      </h2>
      <p>
        以具有完整判断意义的命题为单位，尽量保留必要的主语、条件与结论。标签依据句子在论证中的作用确定，而不是仅凭关键词判断。
      </p>
      <p>
        <strong>GM 子类型：</strong>
        法律条文、法律解释、合同及合同解释、习惯与行业惯例、道德与价值观念、其他规范判断。
      </p>
      <p class="muted">
        本版不允许重叠选区。原文位置采用 UTF-16 字符偏移，起点包含、终点不包含；导入时统一换行符。
      </p>
    </div>
  </template>
  <section v-else-if="tab === 'relations'" class="panel">
    <div class="panel-toolbar">
      <h2>五类论证关系</h2>
      <span class="muted">方向：理由 → 被论证命题</span>
    </div>
    <div v-for="type in relationTypes" :key="type.code" class="relation-guide-row">
      <span class="relation-type">{{ type.code }}</span>
      <div>
        <h3>{{ type.name }}</h3>
        <p>{{ type.description }}</p>
      </div>
      <span class="relation-example">
        {{ type.code === 'J' ? 'P1 + P2' : 'P1' }}
        <Icon name="ArrowRight" :size="18" />
        P3
      </span>
    </div>
    <div class="notice guide-relation-note">
      <Icon name="Info" />
      <p>
        组合关系需要至少两个起点命题，其余关系使用一个起点。复杂嵌套关系、拖拽布局和图谱缩放属于后续扩展。
      </p>
    </div>
  </section>
  <div v-else class="help-layout">
    <section class="panel help-steps">
      <h2>五步完成一次标注</h2>
      <div v-for="(step, i) in steps" :key="step.title" class="help-step">
        <span>{{ String(i + 1).padStart(2, '0') }}</span>
        <div>
          <h3>{{ step.title }}</h3>
          <p>{{ step.text }}</p>
        </div>
        <Icon :name="step.icon" :size="22" />
      </div>
    </section>
    <aside>
      <section class="panel help-card">
        <Icon name="Save" :size="24" />
        <h3>记得保存你的思考</h3>
        <p>
          标注草稿需要手动保存。使用
          <kbd>Ctrl</kbd>
          +
          <kbd>S</kbd>
          快速保存，macOS 可使用
          <kbd>⌘</kbd>
          +
          <kbd>S</kbd>
          。
        </p>
        <p>切换文书或离开工作台时，系统会提醒未保存的修改。</p>
      </section>
      <section class="panel help-card">
        <Icon name="ShieldCheck" :size="24" />
        <h3>关于当前演示</h3>
        <p>数据仅保存在当前浏览器，清理浏览器数据会清除演示内容。重要结果请及时导出。</p>
        <p>演示身份没有权限隔离。真实登录、多人同步及文件解析由后端接入。</p>
      </section>
    </aside>
  </div>
</template>
