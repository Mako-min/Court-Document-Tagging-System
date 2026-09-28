import { reactive } from 'vue';
import { api } from '../services/api';

export const workspace = reactive({
  documents: [],
  tasks: [],
  conflicts: [],
  exports: [],
  loaded: false,
  error: '',
  user: api.getSession(),
});
export const notices = reactive([]);
export function notify(message, type = 'success') {
  const id = Date.now() + Math.random();
  notices.push({ id, message, type });
  setTimeout(() => {
    const index = notices.findIndex((item) => item.id === id);
    if (index >= 0) notices.splice(index, 1);
  }, 4200);
}
export async function loadWorkspace() {
  if (workspace.loaded) return;
  try {
    Object.assign(workspace, await api.getWorkspace(), { loaded: true, error: '' });
  } catch (error) {
    workspace.error = error.message;
  }
}
export function snapshot() {
  return JSON.parse(
    JSON.stringify({
      documents: workspace.documents,
      tasks: workspace.tasks,
      conflicts: workspace.conflicts,
      exports: workspace.exports,
    }),
  );
}
export async function commit(change) {
  const data = snapshot();
  change(data);
  try {
    Object.assign(workspace, await api.saveWorkspace(data));
    return true;
  } catch {
    notify('保存失败：浏览器存储不可用或空间不足，请导出数据后重试。', 'error');
    return false;
  }
}
export function syncTaskStatus(data) {
  for (const task of data.tasks) {
    const docs = data.documents.filter((doc) => task.documentIds.includes(doc.id));
    task.status =
      docs.length && docs.every((doc) => doc.status === '已完成')
        ? '已完成'
        : docs.some((doc) => doc.status === '待裁定')
          ? '待裁定'
          : docs.some((doc) => doc.status !== '未开始')
            ? '标注中'
            : '未开始';
  }
}
export async function resetWorkspace() {
  try {
    Object.assign(workspace, await api.reset(), { loaded: true, error: '' });
    notify('演示数据已重置');
  } catch {
    notify('无法重置本地存储，请检查浏览器设置。', 'error');
  }
}
