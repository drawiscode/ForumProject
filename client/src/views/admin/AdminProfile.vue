<template>
  <div>
    <h2 class="first-title">个人中心</h2>

    <form class="panel" @submit.prevent="changePassword">
      <div class="row">
        <label class="label">旧密码</label>
        <input class="input" v-model.trim="oldPassword" type="password" />
      </div>
      <div class="row">
        <label class="label">新密码</label>
        <input class="input" v-model.trim="newPassword" type="password" />
      </div>
      <button class="btn" type="submit">修改密码</button>
    </form>

    <h3>我的操作记录</h3>
    <div v-if="loading" class="muted">加载中...</div>
    <div v-else-if="error" class="err">{{ error }}</div>
    <table v-else class="table">
      <thead>
        <tr><th>ID</th><th>动作</th><th>对象</th><th>详情</th><th>时间</th></tr>
      </thead>
      <tbody>
        <tr v-for="l in logs" :key="l.id">
          <td>{{ l.id }}</td>
          <td>{{ l.action }}</td>
          <td>{{ l.target_type }}#{{ l.target_id }}</td>
          <td class="truncate">{{ l.detail }}</td>
          <td>{{ l.created_at }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
  import { apiFetch } from '../../api/http'

  export default {
    name: 'AdminProfile',
    props: { admin: Object },
    data() {
      return {
        oldPassword: '',
        newPassword: '',
        logs: [],
        loading: false,
        error: ''
      }
    },
    mounted() {
      this.loadLogs()
    },
    methods: {
      async changePassword() {
        await apiFetch('/api/admin/me/password', {
          method: 'POST',
          body: { old_password: this.oldPassword, new_password: this.newPassword }
        })
        this.oldPassword = ''
        this.newPassword = ''
        alert('已修改')
      },
      async loadLogs() {
        this.loading = true
        this.error = ''
        try {
          const data = await apiFetch('/api/admin/me/logs')
          this.logs = data.logs || []
        } catch (e) {
          this.error = e.message || '加载失败'
        } finally {
          this.loading = false
        }
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
  .panel { 
    display: grid;
    gap: 10px; 
    margin-bottom: 16px;
    margin-top: 20px;
  }
  .label{
    color: rgba(65, 34, 59, 0.9);
    font-style: italic;
  }
  .row { display: grid; gap: 6px; }
  .input { padding: 8px 10px; border-radius: 10px; border: 1px solid rgba(255,79,136,.2); }
  .btn {
    padding: 6px 10px;
    margin-top: 10px;
    margin-bottom: 10px;
    border-radius: 999px; 
    border: none; cursor: pointer; 
    background: rgba(255,79,136,.12); 
    width: 120px; 
  }
  .table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 8px; border-bottom: 1px solid rgba(255,79,136,.12); }
  .truncate { max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .muted { color: rgba(123,106,120,.7); }
  .err { color: #e45882; font-weight: 800; }
</style>
