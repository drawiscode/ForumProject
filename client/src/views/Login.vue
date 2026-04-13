<template>
  <div class="page">
    <div class="bg"></div>

    <div class="card wrap">
      <div class="welcome">欢迎您,请先登录邮箱</div>

      <form class="form" @submit.prevent="onSubmit">
        <input class="input" v-model.trim="form.account" placeholder="用户名或邮箱" autocomplete="account" />
        <input class="input" v-model="form.password" type="password" placeholder="你的密码" autocomplete="current-password" />

        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="okMsg" class="ok">{{ okMsg }}</p>

        <div class="actions">
          <button class="btn" type="submit" :disabled="loading">
            {{ loading ? '登录中...' : '登录' }}
          </button>
          <RouterLink class="link" to="/register">没有账号？去注册</RouterLink>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { apiFetch } from '../api/http'

export default {
  name: 'Login',
  data() {
    return {
      form: { account: '', password: '' },
      loading: false,
      error: '',
      okMsg: ''
    }
  },
  methods: {
    validate() {
      if (!this.form.account) return '请输入用户名或邮箱'
      if (!this.form.password) return '请输入密码'
      if (this.form.password.length < 6) return '密码至少 6 位'
      return ''
    },
    async onSubmit() {
      this.error = ''
      this.okMsg = ''
      const msg = this.validate()
      if (msg) {
        this.error = msg
        return
      }

      this.loading = true
      try {
          const datauser = await apiFetch('/api/user/login', {
          method: 'POST',
          body: this.form
        })

        // 保存登录态（最小版：仅保存 user;后续加 token 再扩展）
        localStorage.setItem('af_user', JSON.stringify(datauser.user))
        window.dispatchEvent(new Event('af-auth-changed')) // 关键：通知别的组件刷新登录态

        this.okMsg = '登录成功，正在跳转...'
        setTimeout(() => this.$router.push('/'), 500)
      } catch (e) {
        this.error = e.message || '登录失败'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>

  .page{
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    min-height: 60vh;
    padding: 20px 12px;
    position: relative;
    overflow: hidden;
  }

  .bg{
    position: fixed;
    inset: 0;
    z-index: -2;
    background-image: url("../assets/bg1.jpg");
    background-size: cover;
    background-position: center;

  }

  .welcome{
    font-size: 28px;
    font-weight: 700;
    font-style: italic;

    color: rgb(221, 218, 218);
    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  }

  .input{
    width: 80%;
    padding: 10px 14px;
    border: none;
    border-radius: 8px;
    background: rgba(137, 73, 73, 0.1);
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
    font-size: 20px;
    margin-top: 12px;
    margin-bottom: 6px;

    font-style: italic;
  }

  .actions{
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin-top: 20px;
  }

  .btn{
    padding: 10px 16px;
    border: none;
    border-radius: 8px;

    background-color: rgb(118, 118, 118);
    color: rgb(36, 33, 33);

    font-size: 16px;
    font-weight: 500;
    font-style: italic;

    cursor: pointer;
    transition: background-color 0.3s ease;
  }

  .link{
    font-size: 16px;
    font-weight: 500;
    font-style: italic;

    color: rgb(36, 33, 33);
    text-decoration: none;
  }

  .card{
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 80%;
    max-width: 420px;
    padding: 24px;
    background: rgba(144, 144, 144, 0.8);
    border-radius: 40px;

    backdrop-filter: blur(1px);
  }

  .label{
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .error{
    color: #b00020;
    margin-top: 8px;
  }

  .ok{
    color: #064e3b;
    margin-top: 8px;
  }

</style>