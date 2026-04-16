<template>
  <div class="wrap">
    <div class="card">
      <div class="title">私信</div>

      <div v-if="loading" class="muted">加载中...</div>
      <div v-else-if="error" class="err">{{ error }}</div>

      <div v-else-if="messages.length === 0" class="muted">暂无私信</div>

      <div v-else class="list">
        <div v-for="m in messages" :key="m.id" class="item">
          <div class="meta">
            <span class="who">
              {{ m.sender_id === myId ? '我 → ' + m.receiver_name : m.sender_name + ' → 我' }}
            </span>
            <span class="time">{{ formatTime(m.created_at) }}</span>
          </div>
          <div class="content">{{ m.content }}</div>
        </div>
      </div>
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
                messages: [], 
                myId: getStoredUser()?.id || 0 
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
                    const data = await apiFetch('/api/dm/inbox?limit=80')
                    this.messages = data.messages || []
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
    .wrap{ 
        width: min(900px, 96%); 
        margin: 18px auto 0; 
        padding: 16px; 
        position: relative; 
        z-index: 1;
     }
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
    .list{ 
        display:flex;
        flex-direction: column; 
        gap: 10px; 
    }
    .item{
        padding: 10px 12px;
        border-radius: 14px;
        background: rgba(0,0,0,0.16);
        border: 1px solid rgba(255,255,255,0.10);
    }
    .meta{ 
        display:flex; 
        justify-content: space-between; 
        gap: 10px; 
        font-size: 12px; 
        opacity: .8; 
    }
    .content{ 
        margin-top: 6px; 
        white-space: pre-wrap;
    }
    .muted{ opacity: .75; }
    .err{ color: #ff7878; }
</style>