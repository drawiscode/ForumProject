<template>
  <div>
    <h2 class="first-title">板块管理</h2>

    <div class="toolbar">
      <input class="input" v-model.trim="form.name" placeholder="板块名称" />
      <input class="input" v-model.trim="form.description" placeholder="描述" />
      <input class="input" v-model.number="form.sort_order" type="number" placeholder="排序" />
      <button class="btn" type="button" @click="create">新增</button>
    </div>

    <div v-if="loading" class="muted">加载中...</div>
    <div v-else-if="error" class="err">{{ error }}</div>

    <table v-else class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>名称</th>
          <th>描述</th>
          <th>排序</th>
          <th>发帖</th>
          <th>回复</th>
          <th>最小角色</th>
          <th>隐藏</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="b in boards" :key="b.id">
          <td>{{ b.id }}</td>
          <td><input class="cell" v-model.trim="b.name" /></td>
          <td><input class="cell" v-model.trim="b.description" /></td>
          <td><input class="cell" v-model.number="b.sort_order" type="number" /></td>
          <td><input type="checkbox" v-model="b.allow_post" /></td>
          <td><input type="checkbox" v-model="b.allow_reply" /></td>
          <td>
            <select v-model="b.min_role">
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </td>
          <td><input type="checkbox" v-model="b.is_hidden" /></td>
          <td class="actions">
            <button class="btn ghost" type="button" @click="update(b)">保存</button>
            <button class="btn danger" type="button" @click="remove(b)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
  import { apiFetch } from '../../api/http'

  export default {
    name: 'AdminBoards',
    props: { admin: Object },
    data() {
      return {
        boards: [],
        loading: false,
        error: '',
        form: { name: '', description: '', sort_order: 0 }
      }
    },
    mounted() {
      this.load()
    },
    methods: {
      async load() {
        this.loading = true
        this.error = ''
        try {
          const data = await apiFetch('/api/admin/boards')
          this.boards = data.boards || []
        } catch (e) {
          this.error = e.message || '加载失败'
        } finally {
          this.loading = false
        }
      },
      async create() {
        await apiFetch('/api/admin/boards', { method: 'POST', body: this.form })
        this.form = { name: '', description: '', sort_order: 0 }
        this.load()
      },
      async update(b) {
        await apiFetch(`/api/admin/boards/${b.id}`, { method: 'PUT', body: b })
        this.load()
      },
      async remove(b) {
        await apiFetch(`/api/admin/boards/${b.id}`, { method: 'DELETE' })
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
  .actions { display: flex; gap: 6px; }
  .btn { padding: 6px 10px; border-radius: 999px; border: none; cursor: pointer; background: rgba(255,79,136,.12); }
  .btn.ghost { background: rgba(255,255,255,.9); border: 1px solid rgba(255,79,136,.2); }
  .btn.danger { background: rgba(255,59,119,.15); color: #d9426d; }
  .cell { width: 120px; padding: 6px; border-radius: 8px; border: 1px solid rgba(255,79,136,.2); }
  .muted { color: rgba(123,106,120,.7); }
  .err { color: #e45882; font-weight: 800; }
</style>
