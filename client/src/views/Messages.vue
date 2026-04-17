<template>
  <div class="wrap">
    <div class="card">
      <div class="title">私信</div>

      <div v-if="loading" class="muted">加载中...</div>
      <div v-else-if="error" class="err">{{ error }}</div>

      <div v-else-if="threads.length === 0" class="muted">暂无私信会话</div>

      <div v-else class="list">
        <div v-for="t in threads" :key="t.peer.id" class="item" @click="$router.push(`/messages/${t.peer.id}`)">
          <img v-if="t.peer.avatar_url" class="avatar" :src="t.peer.avatar_url" alt="avatar" />
          <div v-else class="avatar placeholder"></div>

          <div class="info">
            <div class="top">
              <div class="name">{{ t.peer.username }}</div>
              <div class="time">{{ formatTime(t.last.created_at) }}</div>
            </div>
            <div class="preview">
              <span class="me" v-if="t.last.sender_id === myId">我：</span>{{ t.last.content }}
            </div>
          </div>
        </div>
      </div>

      <div class="muted small">点击联系人进入对话</div>
    </div>
  </div>
</template>

<script>
    import { apiFetch } from '../api/http'

    function getStoredUser() {
        const raw = localStorage.getItem('af_user')
        if (!raw) return null
        try { return JSON.parse(raw) } catch { return null }
    }

    export default {
        name: 'Messages',
        data() {
            return { 
                loading: false, 
                error: '', 
                threads: [], 
                myId: getStoredUser()?.id || 0 
            }
        },
        mounted() { this.load() },
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
                    const data = await apiFetch('/api/dm/threads?limit=80')
                    this.threads = data.threads || []
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
    margin-bottom: 12px;
    background: linear-gradient(45deg, #ff9a9e, #fad0c4, #fbc2eb);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    }
    .list{ display:flex; flex-direction: column; gap: 10px; }
    .item{
    display:flex;
    gap: 10px;
    align-items: center;
    padding: 10px 12px;
    border-radius: 14px;
    background: rgba(0,0,0,0.16);
    border: 1px solid rgba(255,255,255,0.10);
    cursor: pointer;
    }
    .item:hover{ background: rgba(255,154,158,0.12); }
    .avatar{ width: 46px; height: 46px; border-radius: 999px; object-fit: cover; border: 2px solid rgba(255,255,255,0.30); }
    .avatar.placeholder{ background: rgba(255,255,255,0.12); border: 2px solid rgba(255,255,255,0.16); }
    .info{ flex: 1; min-width: 0; }
    .top{ display:flex; justify-content: space-between; gap: 10px; }
    .name{ font-weight: 900; }
    .time{ font-size: 12px; opacity: .7; }
    .preview{
    margin-top: 6px;
    font-size: 13px;
    opacity: .85;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    }
    .me{ opacity: .85; font-weight: 800; margin-right: 3px; }
    .muted{ opacity: .75; }
    .small{ margin-top: 10px; font-size: 12px; }
    .err{ color: #ff7878; }
</style>