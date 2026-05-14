<template>
  <div>
    <h2 class="first-title">用户管理</h2>

    <div class="toolbar">
      <input class="input" v-model.trim="q" placeholder="搜索用户名/邮箱" />
      <button class="btn" type="button" @click="load">搜索</button>
    </div>

    <div v-if="loading" class="muted">加载中...</div>
    <div v-else-if="error" class="err">{{ error }}</div>

    <table v-else class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>用户名</th>
          <th>邮箱</th>
          <th>角色</th>
          <th>禁用</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.id">
          <td>{{ u.id }}</td>
          <td>{{ u.username }}</td>
          <td>{{ u.email }}</td>
          <td>{{ u.role }}</td>
          <td>{{ Number(u.is_banned) === 1 ? '是' : '否' }}</td>
          <td class="actions">
            <button class="btn ghost" type="button" @click="ban(u)">禁用</button>
            <button class="btn ghost" type="button" @click="unban(u)">解禁</button>
            <button class="btn ghost" type="button" @click="setRole(u, 'user')">设为用户</button>
            <button class="btn ghost" type="button" @click="setRole(u, 'admin')">设为管理员</button>
            <button class="btn danger" type="button" @click="remove(u)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="appeals block2">
      <div class="subhd">
        <h3>解除禁用申请</h3>
        <button class="btn" type="button" @click="loadAppeals">刷新</button>
      </div>

      <div v-if="appealsLoading" class="muted">加载中...</div>
      <div v-else-if="appealsError" class="err">{{ appealsError }}</div>
      <div v-else-if="appeals.length === 0" class="muted">暂无申请</div>
      <table v-else class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>用户</th>
            <th>申请内容</th>
            <th>状态</th>
            <th>提交时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in appeals" :key="a.id">
            <td>{{ a.id }}</td>
            <td>{{ a.user_name }}</td>
            <td>{{ a.message }}</td>
            <td>{{ a.status }}</td>
            <td>{{ a.created_at }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
  import { apiFetch } from '../../api/http'

  export default {
    name: 'AdminUsers',
    props: { admin: Object },
    data() {
      return {
        q: '',
        users: [],
        appeals: [],
        loading: false,
        appealsLoading: false,
        error: '',
        appealsError: ''
      }
    },
    mounted() {
      this.load()
      this.loadAppeals()
    },
    methods: {
      async load() {
        this.loading = true
        this.error = ''
        try {
          const data = await apiFetch(`/api/admin/users?q=${encodeURIComponent(this.q)}`)
          this.users = data.users || []
        } catch (e) {
          this.error = e.message || '加载失败'
        } finally {
          this.loading = false
        }
      },
      async loadAppeals() {
        this.appealsLoading = true
        this.appealsError = ''
        try {
          const data = await apiFetch('/api/admin/unban-appeals?status=pending')
          this.appeals = data.appeals || []
        } catch (e) {
          this.appealsError = e.message || '加载失败'
        } finally {
          this.appealsLoading = false
        }
      },
      async ban(u) {
        const reason = window.prompt('禁用原因（可选）') || ''
        const days = Number(window.prompt('禁用天数（0=永久）', '0') || 0)
        await apiFetch(`/api/admin/users/${u.id}/ban`, { method: 'POST', body: { reason, days } })
        this.load()
        this.loadAppeals()
      },
      async unban(u) {
        await apiFetch(`/api/admin/users/${u.id}/unban`, { method: 'POST' })
        this.load()
        this.loadAppeals()
      },
      async setRole(u, role) {
        await apiFetch(`/api/admin/users/${u.id}/role`, { method: 'POST', body: { role } })
        this.load()
      },
      async remove(u) {
        const reason = window.prompt('删除原因（可选）') || ''
        await apiFetch(`/api/admin/users/${u.id}`, { method: 'DELETE', body: { reason } })
        this.load()
      }
    }
  }
</script>

<style scoped>
  .first-title { 
    margin-left: 0; 
    color: #e45882;
    font-style: italic;
  }
  .toolbar { 
    display: flex; 
    gap: 8px; 
    margin-bottom: 30px; 
    margin-top: 25px;
  }
  .input { 
    padding: 8px 10px; 
    border-radius: 10px; 
    width: 450px;
    border: 1px solid rgba(255,79,136,.2); 
  }
  .table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 8px; border-bottom: 1px solid rgba(255,79,136,.12); }
  .actions { display: flex; gap: 6px; flex-wrap: wrap; }
  .btn { padding: 6px 10px; border-radius: 999px; border: none; cursor: pointer; background: rgba(255,79,136,.12); }
  .btn.ghost { background: rgba(255,255,255,.9); border: 1px solid rgba(255,79,136,.2); }
  .btn.danger { background: rgba(255,59,119,.15); color: #d9426d; }
  .muted { color: rgba(123,106,120,.7); }
  .err { color: #e45882; font-weight: 800; }
  .block2 { margin-top: 22px; }
  .subhd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
</style>
