<template>
  <div class="wrap">
    <div class="card">
      <div class="bar">
        <button type="button" class="link" @click="$router.push('/messages')">返回</button>
        <div class="title">与 {{ peerName || ('用户 ' + peerId) }} 的对话</div>
        <div class="spacer"></div>
      </div>

      <div v-if="loading" class="muted">加载中...</div>
      <div v-else-if="error" class="err">{{ error }}</div>

      <div ref="listEl" class="chat" v-else>
        <div v-for="m in messages" :key="m.id" class="msg" :class="{ me: m.sender_id === myId }">
          <!-- 头像 -->
          <div class="avatarBox">
            <img v-if="getMsgAvatar(m)" class="avatar" :src="getMsgAvatar(m)" alt="avatar" />
            <div v-else class="avatar placeholder">
              {{ getMsgName(m).slice(0, 1).toUpperCase() }}
            </div>
          </div>

          <!-- 名字 + 气泡 -->
          <div class="body">
            <div class="nameLine">{{ getMsgName(m) }}</div>
            <div class="bubble">
              <div class="text">{{ m.content }}</div>
              <div class="time">{{ formatTime(m.created_at) }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="composer">
        <div class="emojiWrap">
          <button ref="emojiBtn" type="button" class="emojiBtn" @click="toggleEmoji" title="表情">🙂</button>
          <div v-if="showEmoji" ref="emojiPanel" class="emojiPanel">
            <button
              v-for="e in emojis"
              :key="e"
              type="button"
              class="emoji"
              @click="insertEmoji(e)"
            >{{ e }}</button>
          </div>
        </div>

        <textarea
          ref="ta"
          class="ta"
          v-model.trim="text"
          placeholder="输入消息..."
          @keydown.enter.exact.prevent="send"
          @keydown.enter.shift.exact.stop
        ></textarea>

        <button class="btn" type="button" :disabled="sending || !text" @click="send">
          {{ sending ? '发送中...' : '发送' }}
        </button>
      </div>

      <div class="muted small">Enter 发送,Shift+Enter 换行</div>
    </div>
  </div>
</template>

<script>
    import { apiFetch } from '../api/http'

    export default {
        name: 'MessagesChat',
        data() {
            return {
            loading: false,
            error: '',

            messages: [],
            text: '',
            sending: false,

            myId: 0,
            meName: '',
            meAvatarUrl: '',

            peerName: '',
            peerAvatarUrl: '',

            pollTimer: null,
            showEmoji: false,

            emojis: ['😀','😄','🤣','😊','😍','😎','🥺','😭','😡','👍','🙏','🎉','❤️','🌸']
            }
        },
        computed: {
            peerId() {
            return Number(this.$route.params.uid)
            },
            lastId() {
            return this.messages.length ? this.messages[this.messages.length - 1].id : 0
            }
        },
        mounted() {
            this.init()
            window.addEventListener('click', this.onGlobalClick)
        },
        beforeUnmount() {
            this.stopPolling()
            window.removeEventListener('click', this.onGlobalClick)
        },
        watch: {
            peerId() {
            this.init()
            }
        },
        methods: {
            async init() {
            this.stopPolling()
            this.loading = true
            this.error = ''
            this.messages = []

            try {
                await this.loadMe()
                await this.loadPeer()
                await this.loadMessages()
                this.startPolling()
            } catch (e) {
                this.error = e?.message || '加载失败'
            } finally {
                this.loading = false
                this.$nextTick(() => this.scrollToBottom())
            }
            },

            async loadMe() {
            const meData = await apiFetch('/api/user/me')
            const me = meData?.user
            this.myId = Number(me?.id) || 0
            this.meName = me?.username || ''
            this.meAvatarUrl = me?.avatar_url || me?.avatarUrl || ''
            },

            async loadPeer() {
            const pub = await apiFetch(`/api/user/${this.peerId}/public`)
            this.peerName = pub?.user?.username || ''
            this.peerAvatarUrl = pub?.user?.avatar_url || pub?.user?.avatarUrl || ''
            },

            async loadMessages() {
            const data = await apiFetch(`/api/dm/with/${this.peerId}?limit=80`)
            this.messages = data?.messages || []
            },

            async fetchNew() {
            if (!this.peerId) return
            try {
                const afterId = this.lastId
                const data = await apiFetch(`/api/dm/with/${this.peerId}?after_id=${afterId}&limit=200`)
                const incoming = data?.messages || []
                if (!incoming.length) return

                const existing = new Set(this.messages.map(m => m.id))
                for (const m of incoming) {
                if (!existing.has(m.id)) this.messages.push(m)
                }
                this.$nextTick(() => this.scrollToBottom())
            } catch {
                // 轮询失败不打断聊天页
            }
            },

            startPolling() {
            this.stopPolling()
            this.pollTimer = window.setInterval(() => {
                if (!this.loading) this.fetchNew()
            }, 1500)
            },

            stopPolling() {
            if (this.pollTimer) {
                clearInterval(this.pollTimer)
                this.pollTimer = null
            }
            },

            scrollToBottom() {
            const el = this.$refs.listEl
            if (!el) return
            el.scrollTop = el.scrollHeight
            },

            formatTime(v) {
            if (!v) return ''
            const d = new Date(v)
            return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString()
            },

            getMsgName(m) {
            return m.sender_id === this.myId
                ? (this.meName || '我')
                : (this.peerName || ('用户 ' + this.peerId))
            },

            getMsgAvatar(m) {
            return m.sender_id === this.myId
                ? (this.meAvatarUrl || '')
                : (this.peerAvatarUrl || '')
            },

            async send() {
            const content = String(this.text || '').trim()
            if (!content || this.sending || !this.peerId) return

            this.sending = true
            this.error = ''

            const tempId = -Date.now()
            const optimistic = {
                id: tempId,
                sender_id: this.myId,
                receiver_id: this.peerId,
                content,
                created_at: new Date().toISOString(),
                _optimistic: true
            }

            this.messages.push(optimistic)
            this.text = ''
            this.$nextTick(() => this.scrollToBottom())

            try {
                const r = await apiFetch('/api/dm/send', {
                method: 'POST',
                body: { to_user_id: this.peerId, content }
                })
                const idx = this.messages.findIndex(m => m.id === tempId)
                if (idx !== -1) this.messages[idx] = { ...optimistic, id: r.id, _optimistic: false }
            } catch (e) {
                const idx = this.messages.findIndex(m => m.id === tempId)
                if (idx !== -1) this.messages.splice(idx, 1)
                this.error = e?.message || '发送失败'
            } finally {
                this.sending = false
            }
            },

            // ========== 表情 ==========
            onGlobalClick(e) {
            const panel = this.$refs.emojiPanel
            const btn = this.$refs.emojiBtn
            if (!panel || !btn) return
            if (panel.contains(e.target) || btn.contains(e.target)) return
            this.showEmoji = false
            },

            toggleEmoji() {
            this.showEmoji = !this.showEmoji
            },

            insertEmoji(emoji) {
            const ta = this.$refs.ta
            if (!ta) {
                this.text += emoji
                return
            }
            const start = ta.selectionStart ?? this.text.length
            const end = ta.selectionEnd ?? this.text.length
            this.text = this.text.slice(0, start) + emoji + this.text.slice(end)
            this.$nextTick(() => {
                ta.focus()
                const pos = start + emoji.length
                ta.setSelectionRange(pos, pos)
            })
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
    padding: 14px;
    color: rgba(255,255,255,0.9);
    }

    .bar{ display:flex; align-items:center; gap: 10px; margin-bottom: 10px; }
    .title{
    font-weight: 900;
    background: linear-gradient(45deg, #ff9a9e, #fad0c4, #fbc2eb);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    }
    .spacer{ flex:1; }

    .link{
    border:0; background:transparent; cursor:pointer; padding: 6px 8px;
    color: rgba(255, 196, 214, 0.95);
    font-weight: 800;
    border-radius: 999px;
    }
    .link:hover{ background: rgba(255,255,255,0.10); }

    .chat{
    height: min(62vh, 520px);
    overflow: auto;
    padding: 10px;
    border-radius: 16px;
    background: rgba(0,0,0,0.12);
    border: 1px solid rgba(255,255,255,0.10);
    }

    .msg{
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin: 12px 0;
    }
    .msg.me{
    flex-direction: row-reverse;
    }

    .avatarBox{ flex: 0 0 auto; }
    .avatar{
    width: 36px;
    height: 36px;
    border-radius: 999px;
    object-fit: cover;
    border: 2px solid rgba(255,255,255,0.25);
    }
    .avatar.placeholder{
    width: 36px;
    height: 36px;
    border-radius: 999px;
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight: 900;
    font-size: 12px;
    background: rgba(255,255,255,0.10);
    border: 2px solid rgba(255,255,255,0.16);
    color: rgba(255,255,255,0.9);
    }

    .body{
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    max-width: min(72%, 560px);
    }
    .msg.me .body{ align-items: flex-end; }

    .nameLine{
    font-size: 12px;
    opacity: .75;
    margin: 2px 0 6px;
    }

    .bubble{
    width: fit-content;
    max-width: 100%;
    padding: 10px 12px;
    border-radius: 16px;
    background: rgba(255,255,255,0.10);
    border: 1px solid rgba(255,255,255,0.14);
    }
    .msg.me .bubble{
    background: rgba(255,154,158,0.18);
    border-color: rgba(255,154,158,0.25);
    }

    .text{ white-space: pre-wrap; line-height: 1.5; }
    .time{ margin-top: 6px; font-size: 12px; opacity: .7; }

    .composer{
    margin-top: 12px;
    display:flex;
    gap: 10px;
    align-items: flex-end;
    }

    .ta{
    flex: 1;
    min-height: 44px;
    max-height: 140px;
    resize: vertical;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(0,0,0,0.18);
    color: rgba(255,255,255,0.92);
    padding: 10px 12px;
    outline: none;
    }
    .ta:focus{
    border-color: rgba(255,154,158,0.55);
    box-shadow: 0 0 0 3px rgba(255,154,158,0.18);
    }

    .btn{
    border: 0;
    padding: 10px 16px;
    border-radius: 999px;
    cursor: pointer;
    color: #fff;
    background: linear-gradient(45deg, #ff9a9e, #fad0c4);
    box-shadow: 0 10px 24px rgba(255,154,158,0.18);
    }
    .btn:disabled{ opacity: .6; cursor: not-allowed; }

    .muted{ opacity: .75; }
    .small{ margin-top: 8px; font-size: 12px; }
    .err{ color: #ff7878; }

    .emojiWrap{ position: relative; }
    .emojiBtn{
    width: 42px;
    height: 42px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(0,0,0,0.18);
    color: rgba(255,255,255,0.92);
    cursor: pointer;
    }
    .emojiBtn:hover{ background: rgba(255,154,158,0.14); }

    .emojiPanel{
    position: absolute;
    bottom: 52px;
    left: 0;
    width: 240px;
    padding: 10px;
    border-radius: 14px;
    background: rgba(20, 22, 36, 0.92);
    border: 1px solid rgba(255,255,255,0.15);
    box-shadow: 0 18px 40px rgba(0,0,0,0.45);
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    z-index: 10;
    }
    .emoji{
    width: 34px;
    height: 34px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.06);
    cursor: pointer;
    }
    .emoji:hover{ background: rgba(255,154,158,0.18); }
</style>