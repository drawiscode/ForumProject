<template>
  <div class="userbox" ref="root">
    <button class="avatar-btn" type="button" @click="onAvatarClick">
      <img class="avatar-img" :src="avatarSrc" alt="avatar">
    </button>

    <div v-if="open" class="pop card">
      <template v-if="user">
        <div class="who">
          <div class="name">{{ user.username }}</div>
          <div class="sub">{{ user.email }}</div>
        </div>

        <label class="upload">
          <input class="file" type="file" accept="image/*" @change="onPick" />
          <span class="upload-btn">上传头像</span>
        </label>

        <div class="menu">
          <div class="row" @click="go('/my-posts')">我的发帖</div>
          <div class="row" @click="go('/profile')">我的个人信息</div>
          <div class="row" @click="go('/settings')">设置</div>
        </div>

        <button class="logout" type="button" @click="logout">退出登录</button>
      </template>

      <template v-else>
        <div class="guests">未登录</div>
        <div class="menu">
          <div class="row" @click="go('/login')">去登录</div>
          <div class="row" @click="go('/register')">去注册</div>
        </div>
        <button class="login-btn" type="button" @click="go('/login')">去登录</button>
      </template>
    </div>
  </div>
</template>

<script>
  const AVATAR_KEY = 'af_avatar'
  import { apiFetch } from '../api/http'

  function getStoredUser() {
    const raw = localStorage.getItem('af_user')
    if (!raw) return null
    try { return JSON.parse(raw) } catch { return null }
  }

  export default {
    name: 'UserPanel',
    data() {
      return {
        open:false,
        user: getStoredUser(),
        avatarDataUrl: localStorage.getItem(AVATAR_KEY) || ''
      }
    },
    computed: {
      avatarSrc() {
        return this.avatarDataUrl || new URL('../assets/nologin.webp', import.meta.url).href
      }
    },
    mounted() {
      window.addEventListener('af-auth-changed', this.onAuthChanged)
      window.addEventListener('click', this.onGlobalClick,true)
      window.addEventListener("keydown", this.onEsc)
      this.onAuthChanged()
    },
    beforeUnmount() {
      window.removeEventListener('af-auth-changed', this.onAuthChanged)
      window.removeEventListener('click', this.onGlobalClick,true)
      window.removeEventListener("keydown", this.onEsc)
    },
    methods: {
      async onAuthChanged() 
      {
        this.user = getStoredUser() // ✅ 同步 user 否则退出/登录后仍是旧状态
        const raw = localStorage.getItem('af_user')
        if (!raw) 
        {
          this.avatarDataUrl = ''
          localStorage.removeItem(AVATAR_KEY)
          return
        }
        try {
          const data = await apiFetch('/api/user/me')
          const url = data?.user?.avatar_url || ''
          if (url) {
            this.avatarDataUrl = url
            localStorage.setItem(AVATAR_KEY, url)
          }
        } catch {
          console.warn('无法获取用户信息')
        }
      },

      onAvatarClick(e) {
        if(!this.user) return this.$router.push('/login')
        this.open = !this.open
      },
      onGlobalClick(e) {
        const root = this.$refs.root
        if(!root) return
        if(this.open && !root.contains(e.target)) this.open = false
      },
      onEsc(e){
        if(e.key === 'Escape') this.open = false
      },
      go(path) {
        this.open = false
        this.$router.push(path)
      },

      async onPick(e) 
      {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        if (!file.type.startsWith('image/')) return alert('请选择图片文件')

        const form = new FormData()
        form.append('avatar', file) // ✅ 必须与后端 upload.single('avatar') 一致

        try {
          // 注意:apiFetch 需要支持 body 为 FormData(不要手动设置 Content-Type)
          const data = await apiFetch('/api/user/me/avatar', {
            method: 'POST',
            body: form
          })

          const url = data?.avatar_url || ''
          if (url) {
            this.avatarDataUrl = url
            localStorage.setItem(AVATAR_KEY, url)
          }
        } catch (err) {
          alert(err.message || '头像上传失败')
        }
      },

      logout() {
        localStorage.removeItem('af_user')
        localStorage.removeItem(AVATAR_KEY)
        
        this.avatarDataUrl = ''
        this.open = false
        window.dispatchEvent(new Event('af-auth-changed'))
        this.$router.push('/')
      }
    }
  }
</script>

<style scoped>
  .userbox{
    position: relative;
    display: flex;
    align-items: center;

    /* ✅ 让弹层层级高于 nav 本体 */
    z-index: 70;
  }

  .avatar-btn{
    border: 0;
    background: transparent;
    padding: 0;
    cursor: pointer;
  }

  .avatar-img{
    width: 42px;
    height: 42px;
    border-radius: 999px;
    object-fit: cover;
    display: block;
    border: 2px solid rgba(255,255,255,0.45);
    box-shadow: 0 10px 24px rgba(0,0,0,0.35);
  }

  .pop{
    position: absolute;
    right: 0;
    top: calc(100% + 12px);
    width: 260px;
    padding: 12px;
    border-radius: 18px;

    /* ✅ 深色毛玻璃 */
    background: rgba(12, 14, 28, 0.72);
    -webkit-backdrop-filter: blur(16px);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.18);
    box-shadow: 0 18px 44px rgba(0,0,0,0.55);

    /* ✅ 关键：弹层要压过页面其它卡片/模糊层 */
    z-index: 9999;
  }

  .who{ margin-bottom: 10px; }
  .name{ font-weight: 900; color: rgba(255,255,255,0.92); }
  .sub{ font-size: 12px; opacity: .75; color: rgba(255,255,255,0.75); }

  .upload{ display:block; margin: 8px 0 10px; }
  .file{ display:none; }
  .upload-btn{
    display: inline-block;
    padding: 8px 12px;
    border-radius: 12px;
    background: rgba(255,255,255,0.10);
    border: 1px solid rgba(255,255,255,0.16);
    color: rgba(255,255,255,0.90);
    font-size: 14px;
    cursor: pointer;
    user-select: none;
  }
  .upload-btn:hover{
    background: rgba(255,154,158,0.15);
    border-color: rgba(255,154,158,0.35);
  }

  .menu{ display:flex; flex-direction: column; gap: 8px; }
  .row{
    padding: 10px 12px;
    border-radius: 14px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.12);
    cursor: pointer;
    color: rgba(255,255,255,0.88);
  }
  .row:hover{
    background: rgba(255,154,158,0.15);
    border-color: rgba(255,154,158,0.25);
  }

  .logout,
  .login-btn{
    width: 100%;
    margin-top: 10px;
    border: 0;
    padding: 10px 12px;
    border-radius: 999px;
    cursor: pointer;
    color: #fff;
    background: linear-gradient(45deg, rgba(255,154,158,0.95), rgba(250,208,196,0.95));
    box-shadow: 0 10px 24px rgba(255,154,158,0.18);
  }

  .logout{
    background: linear-gradient(45deg, rgba(255,120,150,0.9), rgba(255,90,120,0.9));
  }

  .guests{
    font-weight: 800;
    margin-bottom: 8px;
    color: rgba(255,255,255,0.92);
  }
</style>