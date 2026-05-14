<template>
  <div>
    <h2 class="first-title">评论管理</h2>

    <div class="toolbar">
      <input class="input" v-model.trim="q" placeholder="搜索评论内容" />
      <button class="btn" type="button" @click="load">搜索</button>
    </div>

    <div v-if="loading" class="muted">加载中...</div>
    <div v-else-if="error" class="err">{{ error }}</div>

    <table v-else class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>作者</th>
          <th>内容</th>
          <th>审核</th>
          <th>屏蔽</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in comments" :key="c.id">
          <td>{{ c.id }}</td>
          <td>{{ c.author }}</td>
          <td class="truncate">{{ c.content }}</td>
          <td>{{ c.audit_status }}</td>
          <td>{{ Number(c.is_hidden) === 1 ? '是' : '否' }}</td>
          <td class="actions">
            <button class="btn ghost" type="button" @click="toggleHide(c)">屏蔽</button>
            <button class="btn ghost" type="button" @click="audit(c, 'approved')">通过</button>
            <button class="btn ghost" type="button" @click="audit(c, 'rejected')">驳回</button>
            <button class="btn danger" type="button" @click="remove(c)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
  import { apiFetch } from '../../api/http'

  export default {
    name: 'AdminComments',
    props: { admin: Object },
    data() {
      return { q: '', comments: [], loading: false, error: '' }
    },
    mounted() {
      this.load()
    },
    methods: {
      async load() {
        this.loading = true
        this.error = ''
        try {
          const data = await apiFetch(`/api/admin/comments?q=${encodeURIComponent(this.q)}`)
          this.comments = data.comments || []
        } catch (e) {
          this.error = e.message || '加载失败'
        } finally {
          this.loading = false
        }
      },
      async toggleHide(c) {
        const reason = window.prompt('屏蔽原因（可选）') || ''
        await apiFetch(`/api/admin/comments/${c.id}/hide`, { method: 'POST', body: { is_hidden: Number(c.is_hidden) ? 0 : 1, reason } })
        this.load()
      },
      async audit(c, status) {
        const reason = status === 'rejected' ? (window.prompt('驳回原因（可选）') || '') : ''
        await apiFetch(`/api/admin/comments/${c.id}/audit`, { method: 'POST', body: { status, reason } })
        this.load()
      },
      async remove(c) {
        const reason = window.prompt('删除原因（可选）') || ''
        await apiFetch(`/api/admin/comments/${c.id}`, { method: 'DELETE', body: { reason } })
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
  .truncate { max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .muted { color: rgba(123,106,120,.7); }
  .err { color: #e45882; font-weight: 800; }
</style>
