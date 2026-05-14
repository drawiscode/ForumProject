<template>
  <div>
    <h2 class="first-title">内容审核</h2>

    <div class="toolbar">
      <button class="btn" type="button" @click="type='post'; load()">帖子</button>
      <button class="btn" type="button" @click="type='comment'; load()">评论</button>
    </div>

    <div v-if="loading" class="muted">加载中...</div>
    <div v-else-if="error" class="err">{{ error }}</div>

    <table v-else class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>作者</th>
          <th v-if="type==='post'">标题</th>
          <th v-else>内容</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id">
          <td>{{ item.id }}</td>
          <td>{{ item.author }}</td>
          <td v-if="type==='post'">{{ item.title }}</td>
          <td v-else class="truncate">{{ item.content }}</td>
          <td class="actions">
            <button class="btn ghost" type="button" @click="audit(item, 'approved')">通过</button>
            <button class="btn ghost" type="button" @click="audit(item, 'rejected')">驳回</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
  import { apiFetch } from '../../api/http'

  export default {
    name: 'AdminReview',
    props: { admin: Object },
    data() {
      return { type: 'post', items: [], loading: false, error: '' }
    },
    mounted() {
      this.load()
    },
    methods: {
      async load() {
        this.loading = true
        this.error = ''
        try {
          const data = await apiFetch(`/api/admin/review?type=${this.type}`)
          this.items = data.items || []
        } catch (e) {
          this.error = e.message || '加载失败'
        } finally {
          this.loading = false
        }
      },
      async audit(item, status) {
        const reason = status === 'rejected' ? (window.prompt('驳回原因（可选）') || '') : ''
        const url = this.type === 'post'
          ? `/api/admin/posts/${item.id}/audit`
          : `/api/admin/comments/${item.id}/audit`
        await apiFetch(url, { method: 'POST', body: { status, reason } })
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
  .table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 8px; border-bottom: 1px solid rgba(255,79,136,.12); }
  .actions { display: flex; gap: 6px; }
  .btn { 
    padding: 6px 10px; 
    border-radius: 999px; 
    border: none; 
    cursor: pointer; 
    color: #71293e;
    background: rgba(255,79,136,.12); 
    margin-right: 20px;
    font-size: 15px;
  }
  .btn.ghost { background: rgba(255,255,255,.9); border: 1px solid rgba(255,79,136,.2); }
  .truncate { max-width: 320px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .muted { color: rgba(123,106,120,.7); }
  .err { color: #e45882; font-weight: 800; }
</style>
