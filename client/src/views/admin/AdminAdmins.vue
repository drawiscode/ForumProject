<template>
  <div>
    <h2 class="first-title">权限管理</h2>

    <div v-if="admin && !admin.is_super" class="notice">仅超级管理员可以访问</div>

    <div class="toolbar">
      <input class="input" v-model.trim="form.username" placeholder="用户名" />
      <input class="input" v-model.trim="form.email" placeholder="邮箱" />
      <input class="input" v-model.trim="form.password" placeholder="密码" type="password" />
      <select class="input" v-model="form.role_key">
        <option value="normal">普通管理员</option>
        <option value="super">超级管理员</option>
      </select>
      <button class="btn" type="button" @click="create">新增管理员</button>
    </div>

    <div v-if="loading" class="muted">加载中...</div>
    <div v-else-if="error" class="err">{{ error }}</div>

    <table v-else class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>用户名</th>
          <th>角色</th>
          <th>启用</th>
          <th>权限配置</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in admins" :key="a.id">
          <td>{{ a.id }}</td>
          <td>{{ a.username }}</td>
          <td>{{ a.role_key }}</td>
          <td>{{ Number(a.is_active) === 1 ? '是' : '否' }}</td>
          <td>
            <button class="btn ghost" type="button" @click="editPerms(a)">配置权限</button>
          </td>
          <td class="actions">
            <button class="btn ghost" type="button" @click="toggleActive(a)">启用/停用</button>
            <button class="btn danger" type="button" @click="remove(a)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="permDialog" class="dialog">
      <div class="dialog-card">
        <h3>配置权限</h3>
        <div class="perm-list">
          <label v-for="p in permissions" :key="p.perm_key" class="perm-item">
            <input type="checkbox" :value="p.perm_key" v-model="permKeys" />
            {{ p.label }} ({{ p.perm_key }})
          </label>
        </div>
        <div class="actions">
          <button class="btn" type="button" @click="savePerms">保存</button>
          <button class="btn ghost" type="button" @click="permDialog = false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import { apiFetch } from '../../api/http'

  export default {
    name: 'AdminAdmins',
    props: { admin: Object },
    data() {
      return {
        admins: [],
        permissions: [],
        permDialog: false,
        permTarget: null,
        permKeys: [],
        loading: false,
        error: '',
        form: { username: '', email: '', password: '', role_key: 'normal' }
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
          const data = await apiFetch('/api/admin/admins')
          this.admins = data.admins || []
        } catch (e) {
          this.error = e.message || '加载失败'
        } finally {
          this.loading = false
        }
      },
      async create() {
        await apiFetch('/api/admin/admins', { method: 'POST', body: this.form })
        this.form = { username: '', email: '', password: '', role_key: 'normal' }
        this.load()
      },
      async toggleActive(a) {
        await apiFetch(`/api/admin/admins/${a.id}`, { method: 'PUT', body: { is_active: Number(a.is_active) ? 0 : 1 } })
        this.load()
      },
      async remove(a) {
        await apiFetch(`/api/admin/admins/${a.id}`, { method: 'DELETE' })
        this.load()
      },
      async editPerms(a) {
        this.permTarget = a
        const data = await apiFetch('/api/admin/permissions')
        this.permissions = data.permissions || []
        const cur = await apiFetch(`/api/admin/admins/${a.id}/permissions`)
        this.permKeys = cur.perm_keys || []
        this.permDialog = true
      },
      async savePerms() {
        if (!this.permTarget) return
        await apiFetch(`/api/admin/admins/${this.permTarget.id}/permissions`, { method: 'POST', body: { perm_keys: this.permKeys } })
        this.permDialog = false
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
    flex-wrap: wrap; 
  }
  .notice {
    margin: 10px 0;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(255, 79, 136, 0.12);
    border: 1px solid rgba(255, 79, 136, 0.2);
    color: rgba(80, 40, 60, 0.9);
    font-weight: 800;
  }
  .input { 
    padding: 8px 10px;
    border-radius: 10px; 
    border: 1px solid rgba(255,79,136,.2); 
    margin-right: 12px;
  }
  .table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 8px; border-bottom: 1px solid rgba(255,79,136,.12); }
  .actions { display: flex; gap: 6px; flex-wrap: wrap; }
  .btn { 
    padding: 6px 10px; 
    border-radius: 999px; 
    border: none; 
    cursor: pointer; 
    background: rgba(255,79,136,.12); 
  }
  .btn.ghost { background: rgba(255,255,255,.9); border: 1px solid rgba(255,79,136,.2); }
  .btn.danger { background: rgba(255,59,119,.15); color: #d9426d; }
  .muted { color: rgba(123,106,120,.7); }
  .err { color: #e45882; font-weight: 800; }

  .dialog { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; }
  .dialog-card { background: #fff; padding: 16px; border-radius: 12px; width: min(720px, 90%); }
  .perm-list { max-height: 300px; overflow: auto; display: grid; gap: 6px; }
  .perm-item { display: flex; gap: 6px; align-items: center; }
</style>
