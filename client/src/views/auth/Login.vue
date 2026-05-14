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

        <div v-if="banInfo.show" class="banCard">
          <div class="banTitle">账号已被禁用</div>
          <div class="banReason">原因：{{ banInfo.reason }}</div>
          <textarea
            class="appealInput"
            v-model.trim="appealMessage"
            placeholder="可填写你的说明，申请管理员解除禁用"
          ></textarea>
          <button class="btn" type="button" :disabled="appealLoading" @click="submitAppeal">
            {{ appealLoading ? '提交中...' : '提交解除禁用申请' }}
          </button>
          <p v-if="appealMsg" class="ok">{{ appealMsg }}</p>
        </div>

        <div class="actions">
          <button class="btn" type="submit" :disabled="loading">
            {{ loading ? '登录中...' : '登录' }}
          </button>

          <div class="links">
            <RouterLink class="link" to="/register">没有账号？去注册</RouterLink>
            <RouterLink class="link" to="/forgot">忘记密码？</RouterLink>
          </div>

        </div>
      </form>
    </div>
  </div>
</template>

<script>
  import { apiFetch } from '../../api/http'

  export default {
    name: 'Login',
    data() {
      return {
        form: { account: '', password: '' },
        loading: false,
        error: '',
        okMsg: '',
        banInfo: { show: false, reason: '' },
        appealLoading: false,
        appealMessage: '',
        appealMsg: ''
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
        this.banInfo = { show: false, reason: '' }
        this.appealMsg = ''
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
          if (e?.status === 403 && e?.data?.code === 'ACCOUNT_BANNED') {
            this.banInfo = {
              show: true,
              reason: e?.data?.banned_reason || '账号因违反社区规范已被禁用，如有疑问可提交解除禁用申请。'
            }
          }
        } finally {
          this.loading = false
        }
      },
      async submitAppeal() {
        this.appealMsg = ''
        this.error = ''
        if (!this.form.account) {
          this.error = '请先输入用户名或邮箱'
          return
        }

        this.appealLoading = true
        try {
          const data = await apiFetch('/api/user/ban-appeal', {
            method: 'POST',
            body: { account: this.form.account, message: this.appealMessage }
          })
          this.appealMsg = data?.message || '申诉已提交，请等待管理员处理'
        } catch (e) {
          this.error = e.message || '提交失败'
        } finally {
          this.appealLoading = false
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
    min-height: 70vh;
    padding: 20px 12px;
    position: relative;
    z-index: 1;
  }

  /* ✅ 关闭自带背景图，否则会挡住 App 樱花背景 */
  .bg{ display: none; }

  .welcome{
    font-size: 26px;
    font-weight: 800;
    font-style: italic;
    background: linear-gradient(45deg, #ff9a9e, #fbc2eb);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: none;
  }

  .input{
    width: 90%;
    padding: 10px 14px;
    border: 1px solid rgba(255,255,255,0.18);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.68);
    color: rgba(141, 64, 132, 0.92);
    font-size: 18px;
    margin-top: 12px;
    margin-bottom: 6px;
    font-style: italic;
    outline: none;
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
    border-radius: 999px;
    background: linear-gradient(45deg,rgb(240, 184, 236),rgb(255, 199, 236));
    color: #fff;
    font-size: 16px;
    font-weight: 600;
    font-style: italic;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(255, 154, 158, 0.35);
  }

  .links{
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .link{
    font-size: 14px;
    font-weight: 600;
    font-style: italic;
    color: rgba(124, 28, 106, 0.85);
    text-decoration: none;
   
    transition: transform 160ms ease, color 160ms ease; /* 平滑过渡 */
    margin-left: 12px;
    margin-top: 6px;
  }
  .link:hover{ 
    color: rgba(202, 165, 165, 0.95); 
    transform: translateY(-4px);
  }
  .card{
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: min(420px, 92%);
    padding: 22px 18px;

    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 24px;
    box-shadow: 0 10px 32px rgba(0,0,0,0.35);
  }

  .error{ color: #ff9dbf; margin-top: 8px; }
  .ok{ color:rgb(111, 25, 86); margin-top: 8px; }
  .banCard{
    margin-top: 12px;
    padding: 12px;
    border-radius: 14px;
    background: rgba(255, 79, 136, 0.12);
    border: 1px solid rgba(255, 79, 136, 0.24);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .banTitle{
    font-weight: 900;
    color: rgba(116, 31, 84, 0.96);
  }
  .banReason{
    color: rgba(83, 35, 66, 0.9);
    font-size: 14px;
    line-height: 1.6;
  }
  .appealInput{
    min-height: 86px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.24);
    background: rgba(255, 255, 255, 0.72);
    padding: 8px 10px;
    resize: vertical;
    color: rgba(83, 35, 66, 0.92);
  }
</style>