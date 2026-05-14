<template>
  <div class="card">
    <button type="button" class="link" @click="$router.back()">返回</button>

    <div v-if="loading">加载中...</div>
    <div v-else-if="error" class="err">{{ error }}</div>
    <div v-else-if="!root" class="err">评论不存在或加载失败</div>

    <template v-else>
      <h2>对话</h2>

      <div class="comment root">
        <div class="meta">
          <b>{{ root.author }}</b>
          <span class="time">{{ formatTime(root.created_at) }}</span>
        </div>
        <div class="content" v-html="formatContent(root.content)" @click="onContentClick"></div>
      </div>

      <h3>回复（按时间）</h3>
      <div v-if="replies.length === 0" class="muted">暂无回复</div>

      <div v-for="c in replies" :key="c.id" class="comment">
        <div class="meta">
          <b>{{ c.author }}</b>
          <span class="time">{{ formatTime(c.created_at) }}</span>
        </div>
        <div class="content" v-html="formatContent(c.content)" @click="onContentClick"></div>
        <div class="actions">
          <button type="button" class="link" @click="startReply(c)">回复</button>
        </div>
      </div>

      <div class="composer">
        <div v-if="replyTarget" class="muted">
          正在回复：{{ replyTarget.author }}
          <button type="button" class="link" @click="cancelReply">取消</button>
        </div>
        <textarea
          v-model="content"
          class="textarea"
          placeholder="写回复..."
          @paste="onPaste"
          @drop.prevent="onDrop"
          @dragover.prevent
        ></textarea>
        <div class="composerActions">
          <button type="button" class="btn ghost" @click="triggerUpload">插图</button>
          <button type="button" class="btn" :disabled="submitting" @click="submit">
            {{ submitting ? '发送中...' : '发送' }}
          </button>
        </div>
        <input ref="fileInput" class="hiddenInput" type="file" accept="image/*" @change="onFilePick" />
      </div>
    </template>
  </div>

  <div v-if="previewSrc" class="imgPreview" @click="closePreview">
    <img :src="previewSrc" alt="preview" />
  </div>
</template>

<script>
import DOMPurify from 'dompurify'
import { apiFetch } from '../../api/http'
export default {
  name: 'CommentDialog',
  data() {
    return {
      loading: false,
      error: '',
      root: null,
      replies: [],
      replyTarget: null,
      content: '',
      submitting: false,
      previewSrc: ''
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
    formatContent(text) {
      const raw = String(text || '')
      const escaped = raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>')

      const images = []
      const PLACEHOLDER = '__AF_IMG__'

      let tmp = escaped.replace(
        /!\[[^\]]*\]\((https?:\/\/[^\s)]+|\/uploads\/[^\s)]+)\)/g,
        (m, url) => {
          const idx = images.length
          images.push(url)
          return `${PLACEHOLDER}${idx}__`
        }
      )

      tmp = tmp.replace(/(https?:\/\/[^\s<]+|\/uploads\/[^\s<]+)/g, (m) => {
        return `<a href="${m}" target="_blank" rel="noopener noreferrer">${m}</a>`
      })

      const withImages = tmp.replace(new RegExp(`${PLACEHOLDER}(\\d+)__`, 'g'), (m, n) => {
        const url = images[Number(n)]
        return url ? `<img src="${url}" alt="image" />` : m
      })

      return DOMPurify.sanitize(withImages, { ALLOWED_TAGS: ['br', 'img', 'a'], ALLOWED_ATTR: ['href', 'src', 'target', 'rel', 'alt'] })
    },
    onContentClick(e) {
      const target = e?.target
      if (target && target.tagName === 'IMG' && target.src) {
        this.previewSrc = target.src
      }
    },
    closePreview() {
      this.previewSrc = ''
    },
    startReply(c) {
      this.replyTarget = { id: c.id, author: c.author }
      this.content = `@${c.author} `
    },
    cancelReply() {
      this.replyTarget = null
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        const data = await apiFetch(`/api/comment/dialog/${this.id}`)
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
        // 回复 B 或回复某条 C（都属于同一个 dialog）
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
      ,
      triggerUpload() {
        this.$refs.fileInput?.click()
      },
      onFilePick(e) {
        const file = e.target.files?.[0]
        if (file) this.uploadImage(file)
        e.target.value = ''
      },
      onPaste(e) {
        const items = Array.from(e.clipboardData?.items || [])
        const file = items.find((i) => i.kind === 'file' && i.type.startsWith('image/'))?.getAsFile()
        if (file) {
          e.preventDefault()
          this.uploadImage(file)
        }
      },
      onDrop(e) {
        const file = e.dataTransfer?.files?.[0]
        if (file && file.type?.startsWith('image/')) {
          this.uploadImage(file)
        }
      },
      async uploadImage(file) {
        try {
          const compressed = await this.compressImage(file)
          const form = new FormData()
          form.append('images', compressed)
          const data = await apiFetch('/api/upload/images', { method: 'POST', body: form })
          const url = data?.urls?.[0]
          if (url) {
            this.content = `${this.content || ''}![](${url})\n`
          }
        } catch (e) {
          alert(e.message || '图片上传失败')
        }
      },
      async compressImage(file) {
        const maxSizeMB = 1.2
        const maxSide = 1600
        const img = await this.loadImage(file)
        const ratio = Math.min(maxSide / img.width, maxSide / img.height, 1)
        const w = Math.round(img.width * ratio)
        const h = Math.round(img.height * ratio)

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)

        let quality = 0.85
        let blob = await this.canvasToBlob(canvas, quality)
        while (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.5) {
          quality -= 0.1
          blob = await this.canvasToBlob(canvas, quality)
        }

        return new File([blob], file.name.replace(/\.(png|jpg|jpeg|webp|gif)$/i, '.jpg'), {
          type: blob.type
        })
      },
      loadImage(file) {
        return new Promise((resolve, reject) => {
          const url = URL.createObjectURL(file)
          const img = new Image()
          img.onload = () => {
            URL.revokeObjectURL(url)
            resolve(img)
          }
          img.onerror = (e) => {
            URL.revokeObjectURL(url)
            reject(e)
          }
          img.src = url
        })
      },
      canvasToBlob(canvas, quality) {
        return new Promise((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
        })
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

  .meta{
    display:flex;
    gap:10px;
    align-items:center;
    justify-content: space-between;
  }

  .meta b{ color: rgba(255,255,255,0.92); }
  .time{ font-size: 12px; opacity:.7; }
  .content{ margin-top: 6px; white-space: pre-wrap; }
  .content :deep(img){ max-width: 100%; border-radius: 12px; display: block; margin: 8px 0; cursor: zoom-in; }
  .content :deep(a){ color: rgba(255, 196, 214, 0.95); text-decoration: underline; }

  .actions{ margin-top:8px; }

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

  .composerActions{ display:flex; gap: 10px; margin-top: 10px; }
  .btn{
    border: 0;
    padding: 10px 14px;
    border-radius: 999px;
    cursor: pointer;
    color: #fff;
    background: linear-gradient(45deg, #ff9a9e, #fad0c4);
    box-shadow: 0 10px 24px rgba(255,154,158,0.18);
  }
  .btn.ghost{ background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.16); box-shadow: none; }
  .btn:disabled{ opacity: .6; cursor: not-allowed; }

  .err{ color: #ff7878; }
  .muted{ opacity: .75; }
  .hiddenInput{ display: none; }
  .imgPreview{
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }
  .imgPreview img{
    max-width: 90vw;
    max-height: 90vh;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.45);
    cursor: zoom-out;
  }
</style>