<template>
  <div class="settings">
    <aside class="left">
      <div class="title">设置</div>

      <nav class="menu">
        <button
          class="item"
          :class="{ active: active === 'security' }"
          type="button"
          @click="active = 'security'"
        >
          账号安全
        </button>

        <button
          class="item"
          :class="{ active: active === 'privacy' }"
          type="button"
          @click="active = 'privacy'"
        >
          隐私
        </button>

        <button
          class="item"
          :class="{ active: active === 'profile' }"
          type="button"
          @click="active = 'profile'"
        >
          编辑个人主页
        </button>
      </nav>
    </aside>

    <section class="right">
      <div class="panel card">
        <template v-if="active === 'security'">
          <h2>账号安全</h2>
          <div v-if="loading" class="muted">加载中...</div>
          <div v-else-if="error" class="err">{{ error }}</div>


          <form v-else class="form"  @submit.prevent="saveSecurity">
            <div class="row">
              <label class="label">修改密码</label>
              <input class="input" v-model="security.oldPassword" type="password" placeholder="旧密码" />
            </div>
            <div class="row">
              <label class="label"></label>
              <input class="input" v-model="security.newPassword" type="password" placeholder="新密码" />
            </div>
            <div class="actions">
              <button class="btn" type="submit" :disabled="savingSecurity">
                {{savingSecurity?'保存中...':'保存'}}
              </button>
              <div v-if="savedSecurity" class="ok">已保存</div>
            </div>
          </form>

        </template>

        <template v-else-if="active === 'privacy'">
          <h2>隐私</h2>
          <div v-if="loading" class="muted">加载中...</div>
          <div v-else-if="error" class="err">{{ error }}</div>
          
          <form v=else class="form" @submit.prevent="savePrivacy">
            <div class="row switch">
              <label class="label">公开个人主页</label>
              <input type="checkbox" v-model="privacy.publicProfile" />
            </div>
            <div class="row switch">
              <label class="label">允许陌生人私信</label>
              <input type="checkbox" v-model="privacy.allowDM" />
            </div>
            <div class="actions">
              <button class="btn" type="submit" :disabled="savingPrivacy">
                {{saving?'保存中...':'保存'}}
              </button>
              <div v-if="savedPrivacy" class="ok">已保存</div>
            </div>
          </form>
        </template>

        <template v-else>
          <h2>编辑个人主页</h2>

          <div v-if="loading" class="muted">加载中...</div>
          <div v-else-if="error" class="err">{{ error }}</div>

          <form v-else class="form" @submit.prevent="saveProfile">
            <div class="row">
              <label class="label">用户名</label>
              <input class="input" v-model.trim="profile.username" maxlength="50" placeholder="请输入用户名" />
            </div>

            <div class="row">
              <label class="label">性别</label>
              <select class="input" v-model="profile.gender">
                <option value="">未设置</option>
                <option value="male">男</option>
                <option value="female">女</option>
                <option value="other">其他</option>
              </select>
            </div>

            <div class="row">
              <label class="label">简介</label>
              <textarea class="textarea" v-model.trim="profile.bio" maxlength="200" placeholder="写点介绍..."></textarea>
            </div>

            <div class="actions">
              <button class="btn" type="submit" :disabled="savingProfile">
                {{ savingProfile ? '保存中...' : '保存' }}
              </button>
              <div v-if="savedProfile" class="ok">已保存</div>
            </div>

          </form>
        </template>
      </div>
    </section>
  </div>
</template>

<script>
  import { apiFetch } from '../api/http'

  export default {
    name: 'Settings',
    data() {
      return {
        active: 'profile',

        loading: false,
        error: '',
        savingProfile: false,
        savedProfile: false,
        savingSecurity: false,
        savedSecurity: false,
        savingPrivacy: false,
        savedPrivacy: false,

        profile: {
          username: '',
          gender: '',
          bio: ''
        },

        security: {
          oldPassword: '',
          newPassword: ''
        },

        privacy: {
          publicProfile: true,
          allowDM: true
        }
      }
    },
    mounted() {
      this.loadMe()
    },
    methods: {
      async loadMe() {
        this.loading = true
        this.error = ''
        try {
          const data = await apiFetch('/api/user/me')
          const u = data?.user || {}

          this.profile.username = u.username || ''
          this.profile.gender = u.gender || ''
          this.profile.bio = u.bio || ''

          this.privacy.publicProfile = u.public_profile !== undefined ? !!u.public_profile : true
          this.privacy.allowDM = u.allow_dm !== undefined ? !!u.allow_dm : true
        } catch (e) {
          this.error = e.message || '加载失败'
        } finally {
          this.loading = false
        }
      },

      async saveProfile() {
        this.savedProfile = false

        const username = String(this.profile.username || '').trim()
        if (!username) {
          alert('用户名不能为空')
          return
        }

        this.savingProfile = true
        this.error = ''
        try {
          await apiFetch('/api/user/me/profile', {
            method: 'POST',
            body: {
              username: this.profile.username,
              gender: this.profile.gender,
              bio: this.profile.bio
            }
          })
          // 同步本地登录用户信息
          try {
            const raw = localStorage.getItem('af_user')
            if (raw) {
              const u = JSON.parse(raw)
              const next = {
                ...u,
                username: this.profile.username
              }
              localStorage.setItem('af_user', JSON.stringify(next))
            }
          } catch {
            // ignore
          }
          window.dispatchEvent(new Event('af-auth-changed'))


          this.savedProfile = true
          setTimeout(() => (this.savedProfile = false), 1500)
        } catch (e) {
          this.error = e.message || '保存失败'
        } finally {
          this.savingProfile = false
        }
      },
      async saveSecurity() {
        this.savedSecurity =false

        const oldPassword = String(this.security.oldPassword || '')
        const newPassword = String(this.security.newPassword || '')
        if(oldPassword === newPassword){
          alert('新密码不能和旧密码相同')
          return
        }
        if(!oldPassword){
          alert('请输入旧密码')
          return
        }
        if (!newPassword) {
          alert('请输入新密码')
          return
        }

        this.savingSecurity = true
        this.error =''
        try{
          await apiFetch('/api/user/me/password',{
            method:'POST',
            body:{
              old_password:oldPassword,
              new_password:newPassword
            }
          })

          this.security.oldPassword = ''
          this.security.newPassword = ''

          this.savedSecurity = true
          setTimeout(() => (this.savedSecurity = false), 1500)
        }catch(e){
          this.error = e.message || '保存失败'
        }finally{
          this.savingSecurity = false
        }
      },
      async savePrivacy(){
        this.savedPrivacy = false
        this.savingPrivacy = true
        this.error = ''
        try {
          await apiFetch('/api/user/me/privacy', {
            method: 'POST',
            body: {
              public_profile: this.privacy.publicProfile,
              allow_dm: this.privacy.allowDM
            }
          })

          // 可选：同步到本地 user
          try {
            const raw = localStorage.getItem('af_user')
            if (raw) {
              const u = JSON.parse(raw)
              localStorage.setItem('af_user', JSON.stringify({
                ...u,
                public_profile: this.privacy.publicProfile ? 1 : 0,
                allow_dm: this.privacy.allowDM ? 1 : 0
              }))
            }
          } catch {}

          window.dispatchEvent(new Event('af-auth-changed'))

          this.savedPrivacy = true
          setTimeout(() => (this.savedPrivacy = false), 1500)
        } catch (e) {
          this.error = e.message || '保存失败'
        } finally {
          this.savingPrivacy = false
        }
      }
    }
  }
</script>
<style scoped>
  .settings {
    display: flex;
    width: 100%;
    gap: 14px;
    position: relative;
    z-index: 1;
  }

  .left {
    width: 260px;
    flex: 0 0 260px;
    border-radius: 20px;
    margin: 0 0 0 100px;
    padding: 14px;
    box-sizing: border-box;

    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .title {
    font-weight: 800;
    font-size: 18px;
    margin: 6px 4px 12px;
    background: linear-gradient(45deg, #ff9a9e, #fbc2eb);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .menu { display:flex; flex-direction: column; gap: 10px; }

  .item {
    border: 0;
    text-align: left;
    padding: 10px 12px;
    border-radius: 14px;
    cursor: pointer;

    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.92);
  }
  .item:hover { background: rgba(255, 154, 158, 0.15); }
  .item.active {
    background: rgba(255, 255, 255, 0.18);
    font-weight: 800;
  }

  .right {
    flex: 1;
    border-radius: 20px;
    margin: 0 100px;
    padding: 14px;
    box-sizing: border-box;

    background: rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  }

  .card {
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.15);
    box-shadow: 0 10px 24px rgba(0,0,0,0.25);
    border-radius: 18px;
    backdrop-filter: blur(12px);
  }

  .panel { padding: 16px; min-height: 360px; }
  h2 {
    margin: 0 0 12px;
    background: linear-gradient(45deg, #ff9a9e, #fbc2eb);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .form { display:flex; flex-direction: column; gap: 12px; }
  .row { display:grid; grid-template-columns: 92px 1fr; gap: 10px; align-items:center; }
  .row.switch { grid-template-columns: 140px 1fr; }

  .label { font-size: 14px; color: rgba(255,255,255,0.85); }

  .input,
  .textarea{
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(0,0,0,0.18);
    color: rgba(255,255,255,0.92);
    outline: none;
  }
  .input { height: 40px; padding: 0 12px; }
  .textarea { min-height: 96px; padding: 10px 12px; resize: vertical; }

  .actions { display:flex; align-items:center; gap: 10px; margin-top: 4px; }
  .btn {
    border: 0;
    padding: 10px 14px;
    border-radius: 999px;
    cursor: pointer;
    color: #fff;
    background: linear-gradient(45deg, #ff9a9e, #fad0c4);
    box-shadow: 0 4px 15px rgba(255,154,158,0.35);
  }
  .btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .muted { color: rgba(255,255,255,0.7); font-size: 13px; }
  .err { color: #ff7878; }
  .ok { color: #b8ffcf; font-weight: 700; }
</style>