<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from '../components/Icon.vue';
import { api } from '../services/api';
import { workspace } from '../stores/workspace';
const route = useRoute();
const router = useRouter();
const username = ref('');
const password = ref('');
const role = ref('标注者');
const showPassword = ref(false);
const error = ref('');
const loading = ref(false);
async function login(demo = false) {
  error.value = '';
  loading.value = true;
  try {
    workspace.user = await api.login(
      demo
        ? { username: '林同学', password: 'demo123', role: '标注者' }
        : { username: username.value, password: password.value, role: role.value },
    );
    const target = String(route.query.redirect || '/tasks');
    await router.replace(
      target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/login')
        ? target
        : '/tasks',
    );
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>
<template>
  <main class="login-layout">
    <section class="login-story">
      <a href="#/login" class="brand brand-light">
        <span class="brand-mark">明</span>
        <span>
          <strong>明理 · 裁判文书标注</strong>
          <small>LEGAL ARGUMENT ANNOTATION</small>
        </span>
      </a>
      <div class="story-content">
        <span class="eyebrow light">READ. REASON. CONNECT.</span>
        <h1>
          从文字之间，
          <br />
          看见裁判的逻辑。
        </h1>
        <p>
          连接事实、规范与结论，
          <br />
          让法律论证清晰可见。
        </p>
        <div class="argument-art" aria-label="从个别事实和一般规范到裁判结论的论证示意">
          <div class="art-line line-one"></div>
          <div class="art-line line-two"></div>
          <div class="art-node fact">
            <span>SF</span>
            <div>
              <small>个别事实</small>
              <strong>当事人已履行供货义务</strong>
            </div>
            <Icon name="Check" :size="16" />
          </div>
          <div class="art-node norm">
            <span>GM</span>
            <div>
              <small>一般规范</small>
              <strong>当事人应按约履行义务</strong>
            </div>
            <Icon name="Check" :size="16" />
          </div>
          <div class="art-connector">共同支持</div>
          <div class="art-node conclusion">
            <span>SM</span>
            <div>
              <small>裁判结论</small>
              <strong>被告应当支付剩余货款</strong>
            </div>
            <Icon name="ArrowUpRight" />
          </div>
        </div>
      </div>
      <div class="story-foot">
        <span>为法律研究与协作标注而设计</span>
        <span>01 — 06</span>
      </div>
    </section>
    <section class="login-panel">
      <span class="login-edition">
        COURT DOCUMENT WORKSPACE
        <span>前端演示版</span>
      </span>
      <div class="login-form-wrap">
        <span class="eyebrow">WELCOME BACK</span>
        <h2>欢迎回到明理</h2>
        <p class="muted">登录你的工作空间，继续探索文书中的论证结构。</p>
        <form class="login-form" @submit.prevent="login()">
          <label>
            姓名或账号
            <div class="input-icon">
              <Icon name="UserRound" />
              <input
                v-model="username"
                required
                maxlength="30"
                autocomplete="username"
                placeholder="请输入姓名或账号"
              />
            </div>
          </label>
          <label>
            密码
            <div class="input-icon">
              <Icon name="LockKeyhole" />
              <input
                v-model="password"
                required
                minlength="6"
                maxlength="100"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="请输入至少 6 位密码"
              />
              <button
                type="button"
                class="icon-button"
                :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                :aria-pressed="showPassword"
                @click="showPassword = !showPassword"
              >
                <Icon name="Eye" :size="18" />
              </button>
            </div>
          </label>
          <label>
            演示身份
            <select v-model="role">
              <option>标注者</option>
              <option>任务创建者</option>
              <option>裁定者</option>
            </select>
          </label>
          <p v-if="error" class="form-error" role="alert">{{ error }}</p>
          <button class="button primary login-submit" :disabled="loading" type="submit">
            {{ loading ? '正在登录…' : '进入工作空间' }}
            <Icon name="ArrowRight" />
          </button>
        </form>
        <div class="login-or">
          <span></span>
          或先了解一下
          <span></span>
        </div>
        <button class="button demo-login" :disabled="loading" @click="login(true)">
          <Icon name="Sparkles" />
          一键体验演示空间
        </button>
        <p class="login-note">
          <Icon name="Info" :size="15" />
          <span>
            当前为前端演示，任意姓名和至少 6 位密码即可登录。
            <br />
            请勿使用真实密码；演示身份仅影响界面展示。
          </span>
        </p>
      </div>
      <p class="login-copyright">明理 · 裁判文书论证结构标注系统</p>
    </section>
  </main>
</template>
