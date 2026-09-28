<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from './components/Icon.vue';
import Modal from './components/Modal.vue';
import { workspace, notices, loadWorkspace, resetWorkspace } from './stores/workspace';
import { api } from './services/api';

const route = useRoute();
const router = useRouter();
const menuOpen = ref(false);
const settings = ref(false);
const resetConfirm = ref(false);
const nav = [
  { path: '/tasks', label: '任务管理', icon: 'LayoutGrid' },
  { path: '/documents', label: '文书管理', icon: 'Files' },
  { path: '/workbench', label: '标注工作台', icon: 'Highlighter' },
  { path: '/review', label: '冲突裁定', icon: 'GitCompareArrows' },
  { path: '/exports', label: '结果导出', icon: 'Download' },
  { path: '/guide', label: '标签指南', icon: 'BookOpen' },
];
const pending = computed(() => workspace.documents.filter((doc) => doc.status === '待裁定').length);
watch(
  () => route.path,
  (path) => {
    menuOpen.value = false;
    if (path !== '/login') loadWorkspace();
  },
  { immediate: true },
);
async function signOut() {
  // 先经过工作台的离开检查，再清除演示会话。
  const result = await router.push('/tasks?signout=1');
  if (result) return;
  api.logout();
  workspace.user = null;
  await router.push('/login');
}
async function resetDemo() {
  const result = await router.push('/tasks?reset=1');
  if (result) return;
  await resetWorkspace();
  settings.value = false;
  resetConfirm.value = false;
}
</script>
<template>
  <div v-if="route.path !== '/login'" class="app-shell">
    <header class="topbar">
      <RouterLink to="/tasks" class="brand">
        <span class="brand-mark">明</span>
        <span>
          <strong>
            明理
            <span class="brand-divider">/</span>
            <span class="brand-title">裁判文书标注</span>
          </strong>
          <small>LEGAL ARGUMENT ANNOTATION</small>
        </span>
      </RouterLink>
      <nav class="main-nav" aria-label="主菜单">
        <RouterLink
          v-for="item in nav"
          :key="item.path"
          :to="item.path"
          :class="{ active: route.path.startsWith(item.path) }"
        >
          <Icon :name="item.icon" :size="17" />
          {{ item.label }}
          <span v-if="item.path === '/review' && pending" class="nav-count">{{ pending }}</span>
        </RouterLink>
      </nav>
      <div class="header-actions">
        <span class="demo-pill">
          <i></i>
          演示空间
        </span>
        <button
          class="icon-button help-button"
          aria-label="操作帮助"
          @click="router.push('/guide?tab=help')"
        >
          <Icon name="CircleHelp" />
        </button>
        <div class="user-menu">
          <button class="user-trigger" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
            <span class="avatar">{{ workspace.user?.name?.slice(0, 1) || '林' }}</span>
            <Icon name="ChevronDown" :size="14" />
          </button>
          <template v-if="menuOpen">
            <button
              class="menu-dismiss"
              tabindex="-1"
              aria-label="关闭账户菜单"
              @click="menuOpen = false"
            ></button>
            <div class="dropdown">
              <strong>{{ workspace.user?.name }}</strong>
              <small>{{ workspace.user?.role }} · 本地演示</small>
              <button
                @click="
                  settings = true;
                  menuOpen = false;
                "
              >
                <Icon name="Settings2" />
                演示设置
              </button>
              <button @click="signOut">
                <Icon name="LogOut" />
                退出登录
              </button>
            </div>
          </template>
        </div>
      </div>
    </header>
    <main class="main-container">
      <div v-if="workspace.error" class="error-banner">
        <Icon name="AlertCircle" />
        {{ workspace.error }}
        <button class="button small" @click="settings = true">演示设置</button>
      </div>
      <RouterView v-else-if="workspace.loaded" />
      <div v-else class="loading-state">正在准备工作空间…</div>
    </main>
    <footer class="site-footer">
      <span>
        <span class="footer-dot"></span>
        明理 · 让每一份裁判逻辑清晰可见
      </span>
      <span>
        前端演示版
        <span class="footer-separator">/</span>
        数据仅保存在当前浏览器
      </span>
    </footer>
  </div>
  <RouterView v-else />
  <div class="toast-stack" aria-live="polite">
    <div v-for="notice in notices" :key="notice.id" class="toast" :class="notice.type">
      <Icon :name="notice.type === 'error' ? 'AlertCircle' : 'CircleCheck'" />
      {{ notice.message }}
    </div>
  </div>
  <Modal
    v-if="settings"
    title="演示空间设置"
    @close="
      settings = false;
      resetConfirm = false;
    "
  >
    <div class="notice">
      <Icon name="Info" />
      <p>任务和标注保存在当前浏览器。登录仅模拟界面流程，不提供真实身份认证或权限隔离。</p>
    </div>
    <div class="settings-reset">
      <h3>重置演示数据</h3>
      <p class="muted">恢复初始任务和文书，清除当前浏览器内的修改。请先导出需要保留的结果。</p>
      <button v-if="!resetConfirm" class="button danger" @click="resetConfirm = true">
        重置演示数据
      </button>
      <div v-else class="button-row">
        <button class="button" @click="resetConfirm = false">取消</button>
        <button class="button danger" @click="resetDemo">确认清除并重置</button>
      </div>
    </div>
  </Modal>
</template>
