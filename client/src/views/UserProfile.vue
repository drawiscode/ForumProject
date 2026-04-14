<!-- 该页面为查看别人的主页时显示的个人信息页面 -->
<template>
  <div class="wrap">
    <div v-if="loading">加载中...</div>
    <div v-else-if="error" class="err">{{ error }}</div>

    <div v-else-if="user" class="card">
      <div class="head">
        <img v-if="user.avatar_url" class="avatar" :src="user.avatar_url" alt="avatar" />
        <div v-else class="avatar placeholder"></div>

        <div>
          <div class="name">{{ user.username }}</div>
          <div class="meta">发帖数：{{ user.posts_count }}</div>
        </div>
      </div>

      <div class="row"><b>性别：</b>{{ genderText(user.gender) }}</div>
      <div class="row"><b>简介：</b>{{ user.bio || '暂无简介' }}</div>
      <div class="row"><b>注册：</b>{{ formatTime(user.created_at) }}</div>
    </div>

    <!-- ✅ 兜底：既不 loading、也没 error 但也没 user -->
    <div v-else class="err">用户不存在或加载失败</div>
  </div>
</template>

<script>
    import { apiFetch } from '../api/http'

    export default {
        name: 'UserProfile',
        data() {
            return { 
                loading: false, 
                error: '', 
                user: null 
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
            genderText(v) {
                if (v === 'male') return '男'
                if (v === 'female') return '女'
                if (v === 'other') return '其他'
                    return '未设置'
            },
            async load() {
                this.loading = true
                this.error = ''
                this.user = null
                try {
                    const data = await apiFetch(`/api/user/${this.id}/public`)
                    this.user = data.user
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
.wrap { width: min(760px, 96%); margin: 18px auto 0; padding: 16px; position: relative; z-index: 1; }
.err { color: #ff7878; }

.card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border-radius: 20px;
  padding: 16px;
  color: rgba(255,255,255,0.9);
}

.head { display:flex; gap: 12px; align-items:center; margin-bottom: 12px; }
.avatar { width: 56px; height: 56px; border-radius: 999px; object-fit: cover; border: 2px solid rgba(255,255,255,0.35); }
.avatar.placeholder { background: rgba(255,255,255,0.14); border: 2px solid rgba(255,255,255,0.18); }
.name { font-size: 18px; font-weight: 800; }
.meta { font-size: 12px; opacity: .75; }
.row { margin-top: 8px; }
</style>