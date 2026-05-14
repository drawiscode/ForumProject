<template>
  <header class="nav">
    <!-- 顶部导航栏 1：通栏渐变预留条（公告/热搜占位） -->
    <div class="topbar1">
      <div class="topbar1-inner">
        <!-- TODO: 后续替换为“热门话题/公告”动态内容 -->
        <div class="topbar1-text">公告位（占位）：欢迎来到樱花粉二次元论坛项目</div>
      </div>
    </div>

    <!-- 顶部导航栏 2：通栏白色功能栏（Logo + 搜索 + 快捷图标） -->
    <div class="topbar2">
      <div class="topbar2-inner">
        <RouterLink to="/" class="brand2" aria-label="回到首页">
          <span class="logoBox" aria-hidden="true">🌸</span>
          <div class="brand2-text">
            <div class="brand2-title">二次元论坛项目</div>
            <div class="brand2-sub">Sakura Pink Forum</div>
          </div>
        </RouterLink>

        <!-- 搜索：先接前端路由，后端接口后续接入 -->
        <div class="search2" role="search">
          <span class="search-ico" aria-hidden="true">⌕</span>
          <input
            class="search-input2"
            type="text"
            v-model.trim="searchQuery"
            placeholder="搜索标题/内容"
            @keyup.enter="submitSearch"
          />
          <button class="search-btn2" type="button" @click="submitSearch">搜索</button>
        </div>

        <div class="quickIcons">
          <!-- 个人中心：已实现 -->
          <RouterLink class="qbtn" to="/profile" title="个人中心">
            <span class="qico" aria-hidden="true">👤</span>
            <span class="qlabel">个人中心</span>
          </RouterLink>

          <!-- 我的收藏：未实现，先占位到 / （后续替换路由） -->
          <!-- TODO: 替换为你的收藏页路由，例如 /favorites -->
          <RouterLink class="qbtn" to="/" title="我的收藏（占位）">
            <span class="qico" aria-hidden="true">★</span>
            <span class="qlabel">我的收藏</span>
          </RouterLink>

          <!-- 客服中心：未实现，先占位到 / （后续替换路由） -->
          <!-- TODO: 替换为你的客服/帮助页路由，例如 /support 或 /help -->
          <RouterLink class="qbtn" to="/" title="客服中心（占位）">
            <span class="qico" aria-hidden="true">☎</span>
            <span class="qlabel">客服中心</span>
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- 顶部导航栏 3：粉色主导航条（通栏） -->
    <div class="topbar3">
      <div class="topbar3-inner">
        <div class="leftAuth">
          <!-- 未登录：显示 登录/注册 -->
          <div v-if="!user" class="authBtns">
            <RouterLink class="authBtn ghost" to="/login">登录</RouterLink>
            <RouterLink class="authBtn" to="/register">注册</RouterLink>
          </div>

          <!-- 已登录：显示头像（点击打开 UserPanel，由 UserPanel 内部处理） -->
          <div v-else class="userPanelSlot">
            <UserPanel />
            <RouterLink v-if="user && !isAuthPage" to="/messages" class="msgBtn" title="私信">
              ✉
            </RouterLink>
          </div>
        </div>

        <!-- 登录/注册页：简化版第三栏 -->
        <div v-if="isAuthPage" class="simpleText">
          <span v-if="isLoginPage">欢迎回来，登录后开启樱花之旅</span>
          <span v-else>欢迎注册，加入我们的樱花粉社区</span>
        </div>

        <!-- 其他页面：完整导航项 -->
        <nav v-else class="navItems" aria-label="主导航">
          <RouterLink to="/" class="nitem" active-class="active" exact-active-class="active">首页</RouterLink>
          <RouterLink to="/publish" class="nitem" active-class="active">发帖</RouterLink>
          <RouterLink v-if="user && user.is_super" to="/admin" class="nitem" active-class="active">管理后台</RouterLink>

          <!-- 未实现：先占位到 /，便于后续接入 -->
          <!-- TODO: 帖子排序页路由，例如 /posts?sort=hot -->
          <RouterLink to="/" class="nitem" active-class="active">帖子排序</RouterLink>
          <!-- TODO: 用户排行页路由，例如 /rank/users -->
          <RouterLink to="/" class="nitem" active-class="active">用户排行</RouterLink>
          <!-- TODO: 留言建议页路由，例如 /feedback -->
          <RouterLink to="/" class="nitem" active-class="active">留言建议</RouterLink>
          <!-- TODO: 关于我们页路由，例如 /about -->
          <RouterLink to="/" class="nitem" active-class="active">关于我们</RouterLink>
        </nav>

        <div v-if="user && !isAuthPage" class="rightZone">
          <button class="checkinBtn" type="button" @click="doCheckIn">签到</button>
        </div>
      </div>
    </div>
    
  </header>
</template>

<script>
  import UserPanel from './UserPanel.vue'
  import { apiFetch } from '../api/http'

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
        user: getStoredUser(),
        searchQuery: ''
      }
    },
    computed: {
      // ✅ 仅用于样式/布局切换：不改业务逻辑
      isAuthPage() {
        const p = this.$route?.path || ''
        return p === '/login' || p === '/register'
      },
      isLoginPage() {
        const p = this.$route?.path || ''
        return p === '/login'
      }
    },
    mounted() {
      window.addEventListener('af-auth-changed', this.refresh)
    },
    beforeUnmount() {
      window.removeEventListener('af-auth-changed', this.refresh)
    },
    methods: {
      refresh() {
        this.user = getStoredUser()
      },
      submitSearch() {
        const q = String(this.searchQuery || '').trim()
        if (!q) return
        this.$router.push({ path: '/search', query: { q } })
      },
      async doCheckIn() {
        try {
          const data = await apiFetch('/api/user/checkin', { method: 'POST' })
          if (data?.checked) {
            alert(`签到成功，积分 +2，当前 Lv${data.level} / ${data.points} 分`)
          } else {
            alert('今天已签到')
          }
        } catch (err) {
          alert(err.message || '签到失败')
        }
      }
    }
  }
</script>

<style scoped>
  .nav{
    position: relative;
    z-index: 90;
  }

  /* ===== Topbar 1 ===== */
  .topbar1{
    width: 100%;
    height: 44px; /* 40-60px */
    background: linear-gradient(90deg, rgba(232, 107, 147, 0.95), rgba(225, 134, 166, 0.92));
    border-bottom: 1px solid rgba(255,255,255,0.22);
  }
  .topbar1-inner{
    width: 100%;
    height: 100%;
    margin: 0 auto;
    display:flex;
    align-items:center;
  }
  .topbar1-text{
    color: rgba(255,255,255,0.96);
    font-weight: 900;
    font-size: 13px;
    letter-spacing: .2px;
    text-shadow: 0 10px 26px rgba(0,0,0,0.18);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ===== Topbar 2 ===== */
  .topbar2{
    width: 100%;
    background: rgba(255,255,255,0.92);
    border-bottom: 1px solid rgba(255, 79, 136, 0.18);
    box-shadow: 0 14px 34px rgba(255, 79, 136, 0.10);
    backdrop-filter: blur(10px);
  }
  .topbar2-inner{
    width: min(1160px, 96%);
    margin: 0 auto;
    height: 74px; /* 60-80px */
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .brand2{
    display:flex;
    align-items:center;
    gap: 12px;
    text-decoration: none;
    min-width: 0;
  }
  .logoBox{
    width: 46px;
    height: 46px;
    border-radius: 16px;
    display:flex;
    align-items:center;
    justify-content:center;

    color: rgba(255, 79, 136, 0.92);
    font-weight: 950;
    background: linear-gradient(135deg, rgba(255, 107, 158, 0.16), rgba(255, 255, 255, 0.90));
 
    box-shadow: 0 14px 30px rgba(255, 79, 136, 0.10);
  }
  .brand2-text{ min-width: 0; }
  .brand2-title{
    font-size: 18px;
    font-weight: 950;
    letter-spacing: .2px;
    background: linear-gradient(135deg, #ff4f88, #ff6b9e, #ff9fc0);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .brand2-sub{
    margin-top: 2px;
    font-size: 12px;
    color: rgba(123, 106, 120, 0.9);
    font-weight: 800;
  }

  .search2{
    display: flex;
    width: 320px;
    align-items: center;
    gap: 10px;

    border-radius: 999px;
    padding: 6px 12px 6px 8px;
    background: #fff;
    border: 1px solid rgba(255, 79, 136, 0.22);
    box-shadow: 0 14px 34px rgba(255, 79, 136, 0.10);
  }
  .search-ico{
    width: 24px; height: 24px;
    flex-shrink: 0;
    border-radius: 999px;
    display:flex; align-items:center; justify-content:center;
    background: rgba(255, 107, 158, 0.10);
    color: rgba(255, 79, 136, 0.95);
    border: 1px solid rgba(255, 79, 136, 0.18);
    font-weight: 900;
  }
  .search-input2{
    border: 0;
    outline: none;
    flex: 1;
    min-width: 0;
    font-size: 13px;
    font-weight: 700;
    color: rgba(46, 42, 51, 0.92);
  }
  .search-input2::placeholder{ color: rgba(123, 106, 120, 0.85); }
  .search-btn2{
    border: 0;
    cursor: pointer;
    padding: 6px 14px;
    border-radius: 999px;
    font-weight: 900;
    font-size: 13px;
    color: #fff;
    background: linear-gradient(135deg, rgba(255, 79, 136, 0.95), rgba(255, 107, 158, 0.95));
    box-shadow: 0 10px 20px rgba(255, 79, 136, 0.14);
    transition: transform .18s ease, filter .18s ease;
    white-space: nowrap;
  }
  .search-btn2:hover{ transform: translateY(-1px); filter: brightness(1.02); }

  .quickIcons{
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
  }
  .qbtn{
    display: inline-flex;
    align-items: center;
    gap: 8px;

    text-decoration: none;
    padding: 9px 10px;
    border-radius: 16px;
    background: rgba(255, 107, 158, 0.08);
    border: 1px solid rgba(255, 79, 136, 0.16);
    color: rgba(46, 42, 51, 0.90);
    font-weight: 900;
    transition: transform .18s ease, background .18s ease, box-shadow .18s ease;
  }
  .qbtn:hover{
    background: rgba(255, 107, 158, 0.14);
    transform: translateY(-1px);
    box-shadow: 0 14px 30px rgba(255, 79, 136, 0.10);
  }
  .qico{ color: rgba(255, 79, 136, 0.95); }
  .qlabel{ font-size: 13px; }

  /* ===== Topbar 3 ===== */
  .topbar3{
    width: 100%;
    background: linear-gradient(90deg, rgba(255, 79, 136, 0.95), rgba(255, 107, 158, 0.95));
    border-bottom: 1px solid rgba(255,255,255,0.24);
    box-shadow: 0 18px 44px rgba(255, 79, 136, 0.18);
  }
  .topbar3-inner{
    width: min(1160px, 96%);
    margin: 0 auto;
    height: 56px; /* 50-60px */
    display: grid;
    grid-template-columns: 220px 1fr 140px;
    align-items: center;
    gap: 12px;
  }

  .leftAuth{ display:flex; align-items:center; }
  .authBtns{ display:flex; align-items:center; gap: 8px; }
  .authBtn{
    text-decoration: none;
    padding: 8px 12px;
    border-radius: 999px;
    font-weight: 950;
    color: rgba(255,255,255,0.98);
    background: rgba(205, 205, 205, 0.14);
    border: 1px solid rgba(221, 221, 221, 0.26);
    transition: transform .18s ease, background .18s ease;
  }
  .authBtn:hover{ transform: translateY(-1px); background: rgba(255,255,255,0.20); }
  .authBtn.ghost{ background: rgba(255,255,255,0.10); }
  .sep{ color: rgba(255,255,255,0.92); font-weight: 900; }

  .userPanelSlot{
    /* UserPanel 自己渲染头像按钮 + 弹层，这里只负责位置 */
    display:flex;
    align-items:center;
  }

  .simpleText{
    color: rgba(255,255,255,0.96);
    font-weight: 950;
    letter-spacing: .2px;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .navItems{
    display: flex;
    justify-content: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .nitem{
    text-decoration: none;
    color: rgba(255,255,255,0.96);
    font-weight: 950;
    padding: 9px 12px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.22);
    background: rgba(255,255,255,0.10);
    transition: transform .18s ease, background .18s ease, box-shadow .18s ease;
  }
  .nitem:hover{
    transform: translateY(-1px);
    background: rgba(255,255,255,0.18);
    box-shadow: 0 12px 22px rgba(0,0,0,0.10);
  }
  .nitem.active{
    background: rgba(255,255,255,0.24);
    border-color: rgba(255,255,255,0.34);
  }

  .rightZone{ display:flex; justify-content:flex-end; align-items:center; }

  .checkinBtn{
    border: 1px solid rgba(255,255,255,0.26);
    background: rgba(255,255,255,0.16);
    color: rgba(255,255,255,0.96);
    padding: 8px 14px;
    border-radius: 999px;
    font-weight: 950;
    cursor: pointer;
    transition: transform .18s ease, background .18s ease;
  }
  .checkinBtn:hover{ transform: translateY(-1px); background: rgba(255,255,255,0.22); }

  .msgBtn{
    width: 38px;
    height: 38px;
    border-radius: 999px;
    display:flex;
    align-items:center;
    justify-content:center;
    text-decoration: none;
    margin-left:30px;

    color: rgba(255,255,255,0.96);
    background: rgba(255,255,255,0.14);
    border: 1px solid rgba(255,255,255,0.26);
    transition: transform .18s ease, background .18s ease;
  }
  .msgBtn:hover{ transform: translateY(-1px); background: rgba(255,255,255,0.20); }

  /* ===== 响应式：移动端折叠/隐藏部分元素 ===== */
  @media (max-width: 980px){
    .topbar2-inner{
      grid-template-columns: 1fr;
      height: auto;
      padding: 12px 0;
    }
    .quickIcons{ justify-content: flex-start; }
    .topbar3-inner{
      grid-template-columns: 1fr;
      height: auto;
      padding: 10px 0;
    }
    .rightZone{ display:none; }
  }

  @media (max-width: 520px){
    .qlabel{ display:none; } /* 小屏只显示图标 */
    .search-btn2{ display:none; } /* 小屏隐藏按钮，仅保留输入框外观 */
    .topbar1{ height: 40px; }
  }
</style>