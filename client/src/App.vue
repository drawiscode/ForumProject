<template>
  <div class="app-shell">
    <Navbar />
    <main class="main">
      <div class="content">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script>
  import Navbar from './components/Navbar.vue'

  export default {
    name: 'App',
    components: { Navbar }
  }
</script>

<style scoped>
  .app-shell{ 
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
  }
  .main{
    display: flex;
    flex:1;
    padding: 18px 14px 40px;
  }

  
  /* 中间内容区，占剩余空间并水平居中路由内容 */
  .content{
    flex: 1;
    display: flex;
    box-sizing: border-box;
  }

</style>

