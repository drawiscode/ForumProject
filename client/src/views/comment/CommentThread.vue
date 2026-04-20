<template>
  <div class="card">
    <button type="button" class="link" @click="$router.back()">返回</button>

    <div v-if="loading">加载中...</div>
    <div v-else-if="error" class="err">{{ error }}</div>
    <div v-else-if="!root" class="err">评论不存在或加载失败</div>

    <template v-else>
      <h2>评论详情</h2>

      <div class="comment root">
        <div class="meta">
          <b>{{ root.author }}</b>
          <span class="time">{{ formatTime(root.created_at) }}</span>
        </div>
        <div class="content">{{ root.content }}</div>
      </div>

      <h3>回复（按时间）</h3>
      <div v-if="replies.length === 0" class="muted">暂无回复</div>

      <div v-for="c in replies" :key="c.id" class="comment">
        <div class="meta">
          <b>{{ c.author }}</b>
          <span class="time">{{ formatTime(c.created_at) }}</span>
        </div>
        <div class="content">{{ c.content }}</div>

        <div class="actions">
          <button type="button" class="link" @click="startReply(c)">回复</button>

          <!-- C 类：可以查看对话（它一定属于某个 B 对话） -->
          <button
            v-if="isC(c)"
            type="button"
            class="link"
            @click="openDialog(c.dialog_comment_id)"
          >
            查看对话
          </button>

          <!-- B 类：如果下面有 C 回复，显示对话入口 -->
          <button
            v-if="isB(c) && Number(c.dialog_reply_count) > 0"
            type="button"
            class="link"
            @click="openDialog(c.id)"
          >
            查看对话({{ c.dialog_reply_count }})
          </button>
        </div>
      </div>

      <div class="composer">
        <div v-if="replyTarget" class="muted">
          正在回复：{{ replyTarget.author }}
          <button type="button" class="link" @click="cancelReply">取消</button>
        </div>
        <textarea v-model="content" class="textarea" placeholder="写回复..."></textarea>
        <button type="button" class="btn" :disabled="submitting" @click="submit">
          {{ submitting ? '发送中...' : '发送' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script>
    import { apiFetch } from '../../api/http'

    export default {
    name: 'CommentThread',
    data() {
        return {
        loading: false,
        error: '',
        root: null,
        replies: [],
        replyTarget: null,
        content: '',
        submitting: false
        }
    },
    computed: {
        id() {
        return this.$route.params.id
        }
    },
    mounted() {
        this.load()
    },
    watch: {
        id() {
        this.load()
        }
    },
    methods: {
        formatTime(v) {
        if (!v) return ''
        const d = new Date(v)
        return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString()
        },
        isB(c) {
        // B：parent 是 A(root)，且 dialog_comment_id === 自己
        return c && c.dialog_comment_id === c.id
        },
        isC(c) {
        // C：属于某 dialog，但自身不是 dialog 根
        return c && c.dialog_comment_id && c.dialog_comment_id !== c.id
        },
        startReply(c) {
        this.replyTarget = { id: c.id, author: c.author }
        this.content = `@${c.author} `
        },
        cancelReply() {
        this.replyTarget = null
        },
        openDialog(bId) {
        this.$router.push(`/comment/dialog/${bId}`)
        },
        async load() {
        this.loading = true
        this.error = ''
        try {
            const data = await apiFetch(`/api/comment/thread/${this.id}`)
            this.root = data.comment
            this.replies = data.replies || []
        } catch (e) {
            this.error = e.message || '加载失败'
        } finally {
            this.loading = false
        }
        },
        async submit() {
        const text = String(this.content || '').trim()
        if (!text) return alert('内容不能为空')
        this.submitting = true
        try {
            const body = { content: text }
            // 回复根 A 或回复某条 B/C
            body.parent_comment_id = this.replyTarget?.id || this.root.id

            await apiFetch(`/api/comment/${this.root.post_id}`, { method: 'POST', body })
            this.content = ''
            this.replyTarget = null
            await this.load()
        } catch (e) {
            alert(e.message || '发送失败')
        } finally {
            this.submitting = false
        }
        }
    }
    }
</script>

<style scoped>
.card{
  width: min(900px, 96%);
  margin: 18px auto 0;
  padding: 16px;
  border-radius: 20px;

  background: rgba(255, 255, 255, 0.08);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

  color: rgba(255,255,255,0.9);
  position: relative;
  z-index: 1;
}

h2, h3{
  margin: 10px 0 10px;
  background: linear-gradient(45deg, #ff9a9e, #fad0c4, #fbc2eb);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.comment{
  padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,.12);
}

.comment.root{
  padding-top: 8px;
}

.meta{
  display:flex;
  gap:10px;
  align-items:center;
  justify-content: space-between;
}

.meta b{ color: rgba(255,255,255,0.92); }
.time{ font-size: 12px; opacity:.7; }

.content{ margin-top: 6px; white-space: pre-wrap; }

.actions{
  display:flex;
  gap:12px;
  margin-top:8px;
  flex-wrap: wrap;
}

.link{
  border: 0;
  background: transparent;
  cursor: pointer;
  padding: 0;
  color: rgba(255, 196, 214, 0.95);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 4px;
}
.link:hover{ color: rgba(255, 154, 158, 1); }

.composer{ margin-top: 12px; }
.textarea{
  width: 100%;
  min-height: 100px;
  resize: vertical;

  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(0,0,0,0.18);
  color: rgba(255,255,255,0.92);
  padding: 10px 12px;
  outline: none;
}
.textarea:focus{
  border-color: rgba(255,154,158,0.55);
  box-shadow: 0 0 0 3px rgba(255,154,158,0.18);
}

.btn{
  margin-top: 10px;
  border: 0;
  padding: 10px 14px;
  border-radius: 999px;
  cursor: pointer;
  color: #fff;
  background: linear-gradient(45deg, #ff9a9e, #fad0c4);
  box-shadow: 0 10px 24px rgba(255,154,158,0.18);
}
.btn:disabled{ opacity: .6; cursor: not-allowed; }

.err{ color: #ff7878; }
.muted{ opacity: .75; }
</style>