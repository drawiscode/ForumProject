<template>
  <div class="userbox" ref="root">
    <button class="avatar-btn" type="button" @click="onAvatarClick">
      <img class="avatar-img" :src="avatarSrc" alt="avatar">
    </button>

    <div v-if="open" class="pop">
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

    border: 2px solid rgba(255,255,255,0.70);
    box-shadow: 0 14px 28px rgba(255, 79, 136, 0.18);
    background: #fff;
  }

  .pop{
    position: absolute;
    right: 0;
    top: calc(100% + 12px);
    width: 270px;
    padding: 14px;
    border-radius: 20px;

    /* ✅ 白底粉边卡片 */
    background: rgba(255, 255, 255, 0.98);
    border: 1px solid rgba(255, 79, 136, 0.30);
    box-shadow: 0 22px 54px rgba(255, 79, 136, 0.18);

    z-index: 9999;
  }

  .who{ margin-bottom: 10px; }
  .name{ font-weight: 950; color: #2e2a33; }
  .sub{ font-size: 12px; color: rgba(123, 106, 120, 0.95); margin-top: 2px; }

  .upload{ display:block; margin: 10px 0 12px; }
  .file{ display:none; }
  .upload-btn{
    display: inline-block;
    padding: 9px 12px;
    border-radius: 14px;
    background: rgba(255, 107, 158, 0.10);
    border: 1px solid rgba(255, 79, 136, 0.25);
    color: rgba(255, 79, 136, 0.95);
    font-size: 14px;
    font-weight: 850;
    cursor: pointer;
    user-select: none;
    transition: transform .18s ease, background .18s ease;
  }
  .upload-btn:hover{
    background: rgba(255, 107, 158, 0.16);
    transform: translateY(-1px);
  }

  .menu{ display:flex; flex-direction: column; gap: 8px; }
  .row{
    padding: 10px 12px;
    border-radius: 14px;
    background: #fff;
    border: 1px solid rgba(255, 79, 136, 0.18);
    cursor: pointer;
    color: rgba(46, 42, 51, 0.92);
    font-weight: 800;
    transition: transform .18s ease, background .18s ease, box-shadow .18s ease;
  }
  .row:hover{
    background: rgba(255, 107, 158, 0.10);
    transform: translateY(-1px);
    box-shadow: 0 14px 28px rgba(255, 79, 136, 0.12);
  }

  .logout,
  .login-btn{
    width: 100%;
    margin-top: 12px;
    border: 0;
    padding: 10px 12px;
    border-radius: 999px;
    cursor: pointer;
    color: #fff;
    font-weight: 950;
    letter-spacing: .3px;

    background: linear-gradient(135deg, rgba(255, 79, 136, 0.95), rgba(255, 107, 158, 0.95));
    box-shadow: 0 16px 34px rgba(255, 79, 136, 0.18);
    transition: transform .18s ease, filter .18s ease;
  }
  .logout{
    background: linear-gradient(135deg, rgba(255, 79, 136, 0.95), rgba(255, 56, 120, 0.95));
  }
  .logout:hover,
  .login-btn:hover{
    transform: translateY(-1px);
    filter: brightness(1.02);
  }

  .guests{
    font-weight: 950;
    margin-bottom: 8px;
    color: rgba(46, 42, 51, 0.92);
  }
</style>