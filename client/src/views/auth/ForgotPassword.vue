<!-- filepath: /e:/study/web/ForumProject/client/src/views/auth/ForgotPassword.vue -->
<template>
  <div class="page">
    <div class="bg"></div>

    <div class="card wrap">
      <div class="welcome">找回密码</div>

      <div class="tabs">
        <button class="tab" :class="{ on: step === 1 }" type="button" @click="step = 1">1. 获取验证码</button>
        <button class="tab" :class="{ on: step === 2 }" type="button" @click="step = 2">2. 重置密码</button>
      </div>

      <!-- Step 1 -->
      <form class="form" v-if="step === 1" @submit.prevent="onForgot">
        <input class="input" v-model.trim="email" placeholder="请输入注册邮箱" autocomplete="email" />

        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="okMsg" class="ok">{{ okMsg }}</p>

        <button class="btn" type="submit" :disabled="loading">
          {{ loading ? '发送中...' : '发送到邮箱' }}
        </button>

        <div v-if="devToken" class="dev">
          <div class="devTitle">开发模式 token（上线请移除后端 dev_token 返回）</div>
          <div class="devToken">{{ devToken }}</div>
          <button class="mini" type="button" @click="copyDevToken">复制 token</button>
          <button class="mini" type="button" @click="useDevToken">填入到下一步</button>
        </div>

        <div class="actions">
          <RouterLink class="link" to="/login">返回登录</RouterLink>
        </div>
      </form>

      <!-- Step 2 -->
      <form class="form" v-else @submit.prevent="onReset">
        <input class="input" v-model.trim="email" placeholder="注册邮箱" autocomplete="email" />
        <input class="input" v-model.trim="token" placeholder="邮箱验证码 / token" autocomplete="one-time-code" />
        <input class="input" v-model="newPassword" type="password" placeholder="新密码（至少6位）" autocomplete="new-password" />

        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="okMsg" class="ok">{{ okMsg }}</p>

        <button class="btn" type="submit" :disabled="loading">
          {{ loading ? '提交中...' : '重置密码' }}
        </button>

        <div class="actions">
          <button class="linkBtn" type="button" @click="step = 1">我还没收到验证码</button>
          <RouterLink class="link" to="/login">去登录</RouterLink>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { apiFetch } from '../../api/http'

export default {
  name: 'ForgotPassword',
  data() {
    return {
      step: 1,
      email: '',
      token: '',
      newPassword: '',
      loading: false,
      error: '',
      okMsg: '',
      devToken: ''
    }
  },
  methods: {
    validateEmail() {
      if (!this.email) return '请输入邮箱'
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)
      if (!ok) return '邮箱格式不正确'
      return ''
    },
    async onForgot() {
      this.error = ''
      this.okMsg = ''
      this.devToken = ''

      const msg = this.validateEmail()
      if (msg) return (this.error = msg)

      this.loading = true
      try {
        const data = await apiFetch('/api/user/password/forgot', {
          method: 'POST',
          body: { email: this.email }
        })
        this.okMsg = '如果该邮箱存在，我们已发送重置邮件（开发模式会返回 token）'
        this.devToken = data?.dev_token || ''
        this.step = 2
      } catch (e) {
        this.error = e.message || '发送失败'
      } finally {
        this.loading = false
      }
    },
    async onReset() {
      this.error = ''
      this.okMsg = ''

      const msg = this.validateEmail()
      if (msg) return (this.error = msg)
      if (!this.token) return (this.error = '请输入验证码/token')
      if (!this.newPassword || this.newPassword.length < 6) return (this.error = '新密码至少 6 位')

      this.loading = true
      try {
        await apiFetch('/api/user/password/reset', {
          method: 'POST',
          body: { email: this.email, token: this.token, new_password: this.newPassword }
        })
        this.okMsg = '密码已重置，请返回登录'
      } catch (e) {
        this.error = e.message || '重置失败'
      } finally {
        this.loading = false
      }
    },
    async copyDevToken() {
      if (!this.devToken) return
      try {
        await navigator.clipboard.writeText(this.devToken)
        this.okMsg = '已复制 token'
      } catch {
        this.error = '复制失败（请手动复制）'
      }
    },
    useDevToken() {
      if (!this.devToken) return
      this.token = this.devToken
      this.step = 2
    }
  }
}
</script>

<style scoped>
    .page{ position: relative; padding: 24px 0; }
    .bg{ position: fixed; inset: 0; background: radial-gradient(circle at 30% 20%, rgba(255,154,158,.22), transparent 45%),
    radial-gradient(circle at 70% 70%, rgba(250,208,196,.18), transparent 45%); pointer-events:none; }
    .wrap{ width: min(520px, 92%); margin: 0 auto; position: relative; z-index: 1; }

    .card{
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.15);
        backdrop-filter: blur(12px);
        border-radius: 20px;
        padding: 18px;
        color: rgba(255,255,255,0.92);
    }
    .welcome{ font-weight: 900; font-size: 20px; margin-bottom: 14px; }

    .tabs{ display:flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
    .tab{
    border: 1px solid rgba(255,255,255,0.16);
    background: rgba(0,0,0,0.12);
    color: rgba(255,255,255,0.85);
    padding: 8px 10px;
    border-radius: 999px;
    cursor: pointer;
    }
    .tab.on{ background: rgba(255,154,158,0.18); border-color: rgba(255,154,158,0.35); }

    .form{ display:flex; flex-direction: column; gap: 12px; }
    .input{
    width: 100%;
    padding: 12px 14px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(0,0,0,0.18);
    color: rgba(255,255,255,0.92);
    outline: none;
    }
    .btn{
    border: 0;
    padding: 12px 16px;
    border-radius: 999px;
    cursor: pointer;
    color: #fff;
    background: linear-gradient(45deg, #ff9a9e, #fad0c4);
    font-weight: 800;
    }
    .btn:disabled{ opacity: .6; cursor: not-allowed; }

    .error{ color: #ff7878; margin: 0; }
    .ok{ color: #8ff0b0; margin: 0; }

    .actions{ display:flex; justify-content: space-between; align-items:center; gap: 10px; }
    .link{ color: rgba(255,196,214,0.95); text-decoration: none; font-weight: 800; }
    .linkBtn{ border:0; background:transparent; padding:0; color: rgba(255,196,214,0.95); font-weight: 800; cursor:pointer; }

    .dev{
    padding: 12px;
    border-radius: 14px;
    border: 1px dashed rgba(255,255,255,0.22);
    background: rgba(0,0,0,0.12);
    }
    .devTitle{ font-weight: 800; margin-bottom: 8px; opacity: .85; }
    .devToken{ font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; word-break: break-all; }
    .mini{
    margin-top: 10px;
    margin-right: 10px;
    border: 1px solid rgba(255,255,255,0.16);
    background: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.9);
    padding: 6px 10px;
    border-radius: 10px;
    cursor: pointer;
    }
</style>