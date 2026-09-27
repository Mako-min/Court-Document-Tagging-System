import { createRouter, createWebHashHistory } from 'vue-router';
import { api } from '../services/api';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/login', component: () => import('../views/LoginView.vue'), meta: { title: '登录' } },
    { path: '/', redirect: '/tasks' },
    {
      path: '/tasks',
      component: () => import('../views/TasksView.vue'),
      meta: { title: '任务管理' },
    },
    {
      path: '/documents',
      component: () => import('../views/DocumentsView.vue'),
      meta: { title: '文书管理' },
    },
    {
      path: '/workbench/:id?',
      component: () => import('../views/WorkbenchView.vue'),
      meta: { title: '标注工作台' },
    },
    {
      path: '/review',
      component: () => import('../views/ReviewView.vue'),
      meta: { title: '冲突裁定' },
    },
    {
      path: '/exports',
      component: () => import('../views/ExportView.vue'),
      meta: { title: '结果导出' },
    },
    {
      path: '/guide',
      component: () => import('../views/GuideView.vue'),
      meta: { title: '标签指南' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/tasks' },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach((to) => {
  if (to.path !== '/login' && !api.getSession())
    return { path: '/login', query: { redirect: to.fullPath } };
  if (to.path === '/login' && api.getSession()) return '/tasks';
});
router.afterEach((to) => {
  document.title = `${to.meta.title} · 明理裁判文书标注`;
});
export default router;
