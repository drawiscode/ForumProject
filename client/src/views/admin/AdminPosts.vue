<template>
  <div>
    <h2 class="first-title">帖子管理</h2>

    <div class="toolbar">
      <input class="input" v-model.trim="q" placeholder="搜索标题/分类" />
      <button class="btn" type="button" @click="load">搜索</button>
    </div>

    <div v-if="loading" class="muted">加载中...</div>
    <div v-else-if="error" class="err">{{ error }}</div>

    <table v-else class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>标题</th>
          <th>分类</th>
          <th>作者</th>
          <th>审核</th>
          <th>置顶</th>
          <th>加精</th>
          <th>屏蔽</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in posts" :key="p.id">
          <td>{{ p.id }}</td>
          <td>{{ p.title }}</td>
          <td>{{ p.category }}</td>
          <td>{{ p.author }}</td>
          <td>{{ p.audit_status }}</td>
          <td>{{ Number(p.is_pinned) === 1 ? '是' : '否' }}</td>
          <td>{{ Number(p.is_featured) === 1 ? '是' : '否' }}</td>
          <td>{{ Number(p.is_hidden) === 1 ? '是' : '否' }}</td>
          <td class="actions">
            <button class="btn ghost" type="button" @click="togglePin(p)">置顶</button>
            <button class="btn ghost" type="button" @click="toggleFeature(p)">加精</button>
            <button class="btn ghost" type="button" @click="toggleHide(p)">屏蔽</button>
            <button class="btn ghost" type="button" @click="audit(p, 'approved')">通过</button>
            <button class="btn ghost" type="button" @click="audit(p, 'rejected')">驳回</button>
            <button class="btn danger" type="button" @click="remove(p)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
  import { apiFetch } from '../../api/http'

  export default {
    name: 'AdminPosts',
    props: { admin: Object },
    data() {
      return { q: '', posts: [], loading: false, error: '' }
    },
    mounted() {
      this.load()
    },
    methods: {
      async load() {
        this.loading = true
        this.error = ''
        try {
          const data = await apiFetch(`/api/admin/posts?q=${encodeURIComponent(this.q)}`)
          this.posts = data.posts || []
        } catch (e) {
          this.error = e.message || '加载失败'
        } finally {
          this.loading = false
        }
      },
      async togglePin(p) {
        await apiFetch(`/api/admin/posts/${p.id}/pin`, { method: 'POST', body: { is_pinned: Number(p.is_pinned) ? 0 : 1 } })
        this.load()
      },
      async toggleFeature(p) {
        await apiFetch(`/api/admin/posts/${p.id}/feature`, { method: 'POST', body: { is_featured: Number(p.is_featured) ? 0 : 1 } })
        this.load()
      },
      async toggleHide(p) {
        const reason = window.prompt('屏蔽原因（可选）') || ''
        await apiFetch(`/api/admin/posts/${p.id}/hide`, { method: 'POST', body: { is_hidden: Number(p.is_hidden) ? 0 : 1, reason } })
        this.load()
      },
      async audit(p, status) {
        const reason = status === 'rejected' ? (window.prompt('驳回原因（可选）') || '') : ''
        await apiFetch(`/api/admin/posts/${p.id}/audit`, { method: 'POST', body: { status, reason } })
        this.load()
      },
      async remove(p) {
        const reason = window.prompt('删除原因（可选）') || ''
        await apiFetch(`/api/admin/posts/${p.id}`, { method: 'DELETE', body: { reason } })
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
</style>
