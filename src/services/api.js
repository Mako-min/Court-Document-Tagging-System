import { createSeed } from '../data/seed';

const DATA_KEY = 'mingli-demo-v1';
const SESSION_KEY = 'mingli-session-v1';
const clone = (value) => JSON.parse(JSON.stringify(value));

// TODO(后端): 用 HTTP 请求替换此适配层；页面无需直接访问存储或数据库。
// 约定：GET /api/workspace, PUT /api/documents/:id/annotations,
// POST /api/tasks, POST /api/documents, POST /api/conflicts/:id/resolve。
export const api = {
  async getWorkspace() {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return createSeed();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('本地演示数据损坏，请在设置中重置演示数据。');
    }
    if (
      !parsed ||
      !['documents', 'tasks', 'conflicts', 'exports'].every((key) => Array.isArray(parsed[key]))
    )
      throw new Error('本地演示数据版本不兼容，请重置演示数据。');
    return parsed;
  },
  async saveWorkspace(data) {
    // TODO(后端): 按资源保存，并校验身份、任务权限和版本冲突。
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
    return clone(data);
  },
  async login({ username, password, role }) {
    // 仅演示登录；不保存密码。TODO(后端): POST /api/auth/login + 服务端会话。
    if (!username.trim() || password.length < 6) throw new Error('请输入姓名和至少 6 位密码。');
    const session = { name: username.trim(), role };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },
  getSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || null;
    } catch {
      return null;
    }
  },
  logout() {
    sessionStorage.removeItem(SESSION_KEY);
  },
  async reset() {
    localStorage.removeItem(DATA_KEY);
    return createSeed();
  },
};
