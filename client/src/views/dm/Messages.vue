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
    import { apiFetch } from '../../api/http'

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
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid rgba(255, 79, 136, 0.22);
    box-shadow: 0 18px 54px rgba(255, 79, 136, 0.12);
    border-radius: 26px;
    padding: 16px;
    color: rgba(46, 42, 51, 0.92);
    }
    .title{
    font-size: 20px;
    font-weight: 950;
    margin-bottom: 12px;
    background: linear-gradient(135deg, #ff4f88, #ff6b9e, #ff9fc0);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    }
    .list{ display:flex; flex-direction: column; gap: 10px; }
    .item{
    display:flex;
    gap: 10px;
    align-items: center;
    padding: 12px 14px;
    border-radius: 18px;
    background: #fff;
    border: 1px solid rgba(255, 79, 136, 0.16);
    cursor: pointer;
    transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
    }
    .item:hover{ background: rgba(255, 107, 158, 0.08); transform: translateY(-1px); box-shadow: 0 14px 28px rgba(255, 79, 136, 0.12); }
    .avatar{ width: 46px; height: 46px; border-radius: 999px; object-fit: cover; border: 2px solid rgba(255, 79, 136, 0.18); box-shadow: 0 8px 18px rgba(255, 79, 136, 0.12); }
    .avatar.placeholder{ background: rgba(255, 107, 158, 0.10); border: 2px dashed rgba(255, 79, 136, 0.22); }
    .info{ flex: 1; min-width: 0; }
    .top{ display:flex; justify-content: space-between; gap: 10px; }
    .name{ font-weight: 950; color: rgba(46, 42, 51, 0.92); }
    .time{ font-size: 12px; color: rgba(123, 106, 120, 0.75); font-weight: 700; }
    .preview{
    margin-top: 6px;
    font-size: 13px;
    color: rgba(46, 42, 51, 0.78);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    }
    .me{ color: rgba(255, 79, 136, 0.9); font-weight: 900; margin-right: 3px; }
    .muted{ color: rgba(123, 106, 120, 0.85); font-weight: 700; }
    .small{ margin-top: 10px; font-size: 12px; }
    .err{ color: #ff3b77; font-weight: 800; }
</style>