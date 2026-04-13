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

.nav{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 12px;
  margin: 14px auto 0;
  width:50%;
  padding: 14px 16px;

  background: rgba(140, 135, 135, 0.5); /* 半透明底色 */
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border-radius: 120px;

}


.link-home {
  color:rgb(39, 33, 21); 
  font-weight: 500;
  font-size: 18px;
}
.link-publish {
  color:rgb(22, 57, 47); 
  font-weight: 500;
  font-size: 18px;
}
.link-login {
  color:rgb(61, 26, 26); 
  font-weight: 500;
  font-size: 18px;
}
.link-register {
  color:rgb(36, 19, 56);
  font-weight: 500;
  font-size: 18px;
}

.brand{ 
  color: rgb(41, 37, 39);
  font-weight: 800; 
  letter-spacing: .8px; 
  font-size: 20px;
}

.links{ display:flex; gap: 12px; flex-wrap: wrap; }

.right{
  display: flex;
  align-items: center;
}

</style>