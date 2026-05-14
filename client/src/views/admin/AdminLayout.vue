<template>
  <div class="admin">
    <aside class="sidebar">
      <div class="brand">管理后台</div>
      <div v-if="loading" class="muted">加载中...</div>
      <div v-else-if="error" class="err">{{ error }}</div>

      <nav v-else class="menu">
        <RouterLink to="/admin/users" class="item">用户管理</RouterLink>
        <RouterLink to="/admin/posts" class="item">帖子管理</RouterLink>
        <RouterLink to="/admin/comments" class="item">评论管理</RouterLink>
        <RouterLink to="/admin/boards" class="item">板块管理</RouterLink>
        <RouterLink to="/admin/review" class="item">内容审核</RouterLink>
        <RouterLink v-if="admin?.is_super" to="/admin/admins" class="item">权限管理</RouterLink>
        <RouterLink to="/admin/logs" class="item">系统日志</RouterLink>
        <RouterLink to="/admin/profile" class="item">个人中心</RouterLink>
      </nav>
    </aside>

    <section class="content">
      <div v-if="$route?.query?.denied === 'super'" class="notice">仅超级管理员可以访问权限管理</div>
      <div v-if="loading" class="muted">加载中...</div>
      <div v-else-if="error" class="err">{{ error }}</div>
      <router-view v-else v-slot="{ Component }">
        <component :is="Component" :admin="admin" />
      </router-view>
    </section>
  </div>
</template>

<script>
  import { apiFetch } from '../../api/http'

  export default {
    name: 'AdminLayout',
    data() {
      return {
        loading: true,
        error: '',
        admin: null
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
          const data = await apiFetch('/api/admin/me')
          this.admin = data?.admin || null
        } catch (e) {
          this.error = e.message || '无权限'
          this.$router.replace('/login')
        } finally {
          this.loading = false
        }
      }
    }
  }
</script>

<style scoped>
  .admin {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 16px;
    padding: 16px;
  }

  .sidebar {
    background: rgba(255, 247, 247, 0.96);
    border: 1px solid rgba(255, 79, 136, 0.18);
    border-radius: 18px;
    padding: 16px;
    box-shadow: 0 12px 32px rgba(255, 79, 136, 0.1);
  }

  .brand {
    font-weight: 900;
    font-size: 18px;
    color: rgba(255, 79, 136, 0.95);
    margin-bottom: 12px;
  }

  .menu {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .item {
    text-decoration: none;
    color: rgba(46, 42, 51, 0.9);
    font-weight: 800;
    padding: 8px 10px;
    border-radius: 10px;
    background: #fff;
    border: 1px solid rgba(255, 79, 136, 0.12);
  }

  .item.router-link-active {
    background: linear-gradient(135deg, rgba(255, 79, 136, 0.95), rgba(255, 107, 158, 0.95));
    color: #fff;
    border-color: transparent;
  }

  .content {
    background: rgba(255, 247, 247, 0.96);
    border: 1px solid rgba(255, 79, 136, 0.18);
    border-radius: 18px;
    padding: 16px;
    box-shadow: 0 12px 32px rgba(255, 79, 136, 0.1);
  }

  .muted { color: rgba(123, 106, 120, 0.7); }
  .err { color: #e45882; font-weight: 800; }
  .notice {
    margin-bottom: 10px;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(255, 79, 136, 0.12);
    border: 1px solid rgba(255, 79, 136, 0.2);
    color: rgba(80, 40, 60, 0.9);
    font-weight: 800;
  }

  @media (max-width: 900px) {
    .admin { grid-template-columns: 1fr; }
  }
</style>
