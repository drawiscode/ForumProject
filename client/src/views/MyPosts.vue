<template>
  <div class="wrap">
    <div class="card">
      <button type="button" class="link" @click="$router.back()">返回</button>
      <div class="title">我的发帖</div>

      <div v-if="loading" class="muted">加载中...</div>
      <div v-else-if="error" class="err">{{ error }}</div>
      <div v-else-if="posts.length === 0" class="muted">暂无发帖</div>

      <div v-else class="list">
        <div v-for="p in posts" :key="p.id" class="item" @click="$router.push(`/post/${p.id}`)">
          <div class="p-title">{{ p.title }}</div>
          <div class="sub">{{ p.category }} · {{ formatTime(p.created_at) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import { apiFetch } from '../api/http'
  export default {
    name: 'MyPosts',
    data() { 
      return { 
        loading: false, 
        error: '', 
        posts: [] 
        } 
    },
    mounted() { 
      this.load() 
    },
    methods: {
      formatTime(v) {
        if (!v) return ''
        const d = new Date(v)
        return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString()
      },
      async load() {
        this.loading = true
        this.error = ''
        try {
          const data = await apiFetch('/api/post/me')
          this.posts = data.posts || []
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
  .wrap{ width: min(900px, 96%); margin: 18px auto 0; padding: 16px; position: relative; z-index: 1; }
  .card{
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    border-radius: 20px;
    padding: 16px;
    color: rgba(255,255,255,0.9);
  }
  .title{
    font-size: 20px;
    font-weight: 900;
    margin: 8px 0 12px;
    background: linear-gradient(45deg, #ff9a9e, #fad0c4, #fbc2eb);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .link{
    border:0; background:transparent; cursor:pointer; padding:0;
    color: rgba(255, 196, 214, 0.95);
    font-weight: 800;
    text-decoration: underline;
    text-underline-offset: 4px;
  }
  .list{ display:flex; flex-direction:column; gap: 10px; }
  .item{
    padding: 10px 12px;
    border-radius: 14px;
    background: rgba(0,0,0,0.16);
    border: 1px solid rgba(255,255,255,0.10);
    cursor: pointer;
  }
  .item:hover{ background: rgba(255,154,158,0.12); }
  .p-title{ font-weight: 900; }
  .sub{ margin-top: 6px; font-size: 12px; opacity: .75; }
  .muted{ opacity: .75; }
  .err{ color: #ff7878; }
</style>