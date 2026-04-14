<template>
  <div class="page">
    <div class="bg"></div>

    <div class="card wrap">
      <div class ="welcome">欢迎您,请先注册邮箱</div>

      <form class="form" @submit.prevent="onSubmit">

        <input class="input" v-model.trim="form.email" placeholder="你的邮箱" autocomplete="email" />
        <input class="input" v-model.trim="form.username" placeholder="你的用户名" autocomplete="username" />
        <input class="input" v-model="form.password" type="password" placeholder="你的密码" autocomplete="new-password" />
        <input class="input" v-model="form.password2" type="password" placeholder="确认密码" autocomplete="new-password" />
       
        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="okMsg" class="ok">{{ okMsg }}</p>

        <div class="actions">
          <button class="btn" type="submit" :disabled="loading">
            {{ loading ? '注册中...' : '注册' }}
          </button>
          <RouterLink class="link" to="/login">有账号了?那么登录</RouterLink>
        </div>

      </form>
    </div>
  </div>
</template>

<script>
import { apiFetch } from '../api/http'

export default 
{
  name: 'Register',
  data() 
  {
    return {
      form: { email: '', username: '', password: '', password2: '' },
      loading: false,
      error: '',
      okMsg: ''
    }
  },
  methods: 
  {
    validate() 
    {
      if (!this.form.email) return '请输入邮箱'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email)) return '邮箱格式不正确'

      if (!this.form.username) return '请输入用户名'
      if (this.form.username.length < 3 || this.form.username.length > 50) return '用户名长度需 3-50'
      if (!this.form.password) return '请输入密码'
      if (this.form.password.length < 6) return '密码至少 6 位'
      if (this.form.password !== this.form.password2) return '两次密码不一致'
      return ''
    },
    async onSubmit() 
    {
      this.error = ''
      this.okMsg = ''
      const msg = this.validate()
      if (msg) 
      {
        this.error = msg
        return
      }

      this.loading = true
      try 
      {
        await apiFetch('/api/user/register', 
        {
          method: 'POST',
          body: { 
            email: this.form.email,
            username: this.form.username, 
            password: this.form.password 
          }
        })
        this.okMsg = '注册成功，正在跳转到登录...'
        setTimeout(() => this.$router.push('/login'), 600)
      } 
      catch (e) 
      {
        this.error = e.message || '注册失败'
      } 
      finally 
      {
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
  min-height: 70vh;
  padding: 20px 12px;
  position: relative;
  z-index: 1;
}

/* ✅ 关闭自带背景图 */
.bg{ display: none; }

.welcome{
  font-size: 26px;
  font-weight: 800;
  font-style: italic;
  background: linear-gradient(45deg, #ff9a9e, #fbc2eb);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.input{
  width: 90%;
  padding: 10px 14px;
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 14px;
  background: rgba(0,0,0,0.18);
  color: rgba(255,255,255,0.92);
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
  background: linear-gradient(45deg, #ff9a9e, #fad0c4);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  font-style: italic;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(255, 154, 158, 0.35);
}

.link{
  font-size: 14px;
  font-weight: 600;
  font-style: italic;
  color: rgba(255,255,255,0.85);
  text-decoration: none;
}

.card{
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: min(460px, 92%);
  padding: 22px 18px;

  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 24px;
  box-shadow: 0 10px 32px rgba(0,0,0,0.35);
}

.label{ display:flex; flex-direction:column; gap: 10px; }
.error{ color: #ff9dbf; }
.ok{ color: #b8ffcf; }
</style>