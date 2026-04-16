<template>
  <div class="nav card">
    <div class="brand floaty">Forum</div>

    <div class="links">
      <RouterLink to="/" class="link-home">首页</RouterLink>
      <RouterLink to="/publish" class="link-publish">发帖</RouterLink>

      <RouterLink v-if="!user" to="/login" class="link-login">登录</RouterLink>
      <RouterLink v-if="!user" to="/register" class="link-register">注册</RouterLink>
    </div>
    <div class="right">
      <RouterLink v-if="user" to="/messages" class="mailbtn" title="私信">
        ✉
      </RouterLink>
      <UserPanel />
    </div>
  </div>
</template>

<script>
  import UserPanel from './UserPanel.vue'

  function getStoredUser() {
    const raw = localStorage.getItem('af_user')
    if (!raw) return null
    try { return JSON.parse(raw) } catch { return null }
  }

  export default { 
    name: 'Navbar' ,
    components: { UserPanel },
    data() {
      return {
        user: getStoredUser()
      }
    },

    mounted() {
      // 让登录/退出能实时更新(UserPanel 会触发这个事件)
      window.addEventListener('af-auth-changed', this.refresh)
    },

    beforeUnmount() {
      // 卸载事件监听器，避免内存泄漏
      window.removeEventListener('af-auth-changed', this.refresh)
    },

    methods: {
      refresh() {
        this.user = getStoredUser()
      }
    }
  }
</script>

<style scoped>

  .mailbtn{
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    margin-right: 8px;
    border-radius: 999px;
    text-decoration: none;

    color: rgba(255,255,255,0.9);
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.16);
    transition: all .2s ease;
  }
  .mailbtn:hover{
    background: rgba(255,154,158,0.15);
    border-color: rgba(255,154,158,0.28);
    transform: translateY(-1px);
  }

  .nav{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap: 12px;
    margin: 14px auto 0;
    width: min(920px, 92%);
    padding: 12px 16px;

    /* ✅ 深色毛玻璃，适配星空 */
    background: rgba(10, 12, 24, 0.55);
    -webkit-backdrop-filter: blur(14px);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 999px;
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);

    /* ✅ 关键：让 UserPanel 弹层不被裁剪 & 保证在 canvas 之上 */
    position: relative;
    z-index: 50;
    overflow: visible;
  }

  .links{ display:flex; gap: 14px; flex-wrap: wrap; align-items: center; }

  .brand{
    font-weight: 900;
    letter-spacing: .8px;
    font-size: 20px;
    background: linear-gradient(45deg, #ff9a9e, #fad0c4, #fbc2eb);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .link-home,
  .link-publish,
  .link-login,
  .link-register{
    color: rgba(255, 255, 255, 0.88);
    font-weight: 650;
    font-size: 16px;
    text-decoration: none;
    padding: 8px 10px;
    border-radius: 999px;
    border: 1px solid transparent;
    transition: all .2s ease;
  }
  .link-home:hover,
  .link-publish:hover,
  .link-login:hover,
  .link-register:hover{
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255,255,255,0.14);
  }

  .right{
    display: flex;
    align-items: center;
    position: relative;
    z-index: 60;
  }
</style>