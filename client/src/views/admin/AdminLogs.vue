<template>
  <div>
    <h2 class="first-title">系统日志</h2>

    <div class="toolbar">
      <button class="btn" type="button" @click="type='actions'; load()">操作日志</button>
      <button class="btn" type="button" @click="type='violations'; load()">违规记录</button>
      <button class="btn" type="button" @click="type='logins'; load()">登录日志</button>
    </div>

    <div v-if="loading" class="muted">加载中...</div>
    <div v-else-if="error" class="err">{{ error }}</div>

    <table v-else class="table">
      <thead>
        <tr v-if="type==='actions'">
          <th>ID</th><th>管理员</th><th>动作</th><th>对象</th><th>详情</th><th>时间</th>
        </tr>
        <tr v-else-if="type==='violations'">
          <th>ID</th><th>用户</th><th>管理员</th><th>动作</th><th>原因</th><th>时间</th>
        </tr>
        <tr v-else>
          <th>ID</th><th>用户</th><th>IP</th><th>UA</th><th>成功</th><th>时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="l in logs" :key="l.id">
          <template v-if="type==='actions'">
            <td>{{ l.id }}</td>
            <td>{{ l.username }}</td>
            <td>{{ l.action }}</td>
            <td>{{ l.target_type }}#{{ l.target_id }}</td>
            <td class="truncate">{{ l.detail }}</td>
            <td>{{ l.created_at }}</td>
          </template>
          <template v-else-if="type==='violations'">
            <td>{{ l.id }}</td>
            <td>{{ l.user_name }}</td>
            <td>{{ l.admin_name }}</td>
            <td>{{ l.action }}</td>
            <td class="truncate">{{ l.reason }}</td>
            <td>{{ l.created_at }}</td>
          </template>
          <template v-else>
            <td>{{ l.id }}</td>
            <td>{{ l.username || '-' }}</td>
            <td>{{ l.ip }}</td>
            <td class="truncate">{{ l.user_agent }}</td>
            <td>{{ Number(l.success) === 1 ? '是' : '否' }}</td>
            <td>{{ l.created_at }}</td>
          </template>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
  import { apiFetch } from '../../api/http'

  export default {
    name: 'AdminLogs',
    props: { admin: Object },
    data() {
      return { type: 'actions', logs: [], loading: false, error: '' }
    },
    mounted() {
      this.load()
    },
    methods: {
      async load() {
        this.loading = true
        this.error = ''
        try {
          const map = {
            actions: '/api/admin/logs/actions',
            violations: '/api/admin/logs/violations',
            logins: '/api/admin/logs/logins'
          }
          const data = await apiFetch(map[this.type])
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
  .toolbar { 
    display: flex; 
    gap: 8px; 
    margin-bottom: 30px; 
    margin-top: 25px;
  }
  .table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 8px; border-bottom: 1px solid rgba(255,79,136,.12); }
  .truncate { max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .btn { 
    padding: 6px 10px; 
    border-radius: 999px; 
    border: none; 
    cursor: pointer; 
    background: rgba(255,79,136,.12); 
    margin-right: 20px;
    font-size: 14px;
  }
  .muted { color: rgba(123,106,120,.7); }
  .err { color: #e45882; font-weight: 800; }
</style>
