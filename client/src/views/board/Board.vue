<template>
  <div class="board-view">
    <h2 class="board_title">板块：{{ boardName }}</h2>

    <div v-if="postsLoading">正在加载帖子...</div>
    <div v-else-if="error" class="err">{{ error }}</div>
    <div v-else-if="posts.length === 0" class="muted">该板块暂无帖子</div>

    <section v-else class="left">
      <article v-for="post in posts" :key="post.id" class="post-item" @click="goPost(post.id)">
        <h3 class="title">{{ post.title }}</h3>
        <p class="excerpt">{{ post.excerpt || post.content }}</p>
        <div class="meta">
          <span>{{ post.author }}</span>
          <span>.</span>
          <span>{{ formatTime(post.created_at) }}</span>
        </div>
      </article>
    </section>
  </div>
</template>

<script>
  import { apiFetch } from '../../api/http'

  export default {
      name: 'Board',
      data() {
        return {
          posts: [],
          postsLoading: false,
          error: ''
        }
      },
      computed: {
        boardName() {
          return this.$route.params.name || '未知板块'
        }
      },
      mounted() {
        this.fetchPosts()
      },
      watch: {
        boardName() {
          this.fetchPosts()
        }
      },
      methods: {
        formatTime(v){
          if(!v) return ''
          const d =new Date(v)
          return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString()
        },
        async fetchPosts() {
          this.postsLoading = true
          this.error = ''
          try {
            const data = await apiFetch(`/api/board/${encodeURIComponent(this.boardName)}/posts`)
            this.posts = data.posts || []
          } catch (err) {
            console.error('加载帖子失败', err)
            this.error = err.message || '加载帖子失败'
            this.posts = []
          }finally{
            this.postsLoading = false
          }
        },
        goPost(postId) {
          this.$router.push(`/post/${postId}`)
        }
      }
  }
</script>

<style scoped>
  .board-view{
    width: min(1160px, 96%);
    margin: 12px auto 0;
    padding: 14px;
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid rgba(255, 79, 136, 0.22);
    box-shadow: 0 18px 54px rgba(255, 79, 136, 0.12);
    border-radius: 26px;
    min-height: 80vh;
  }
  
  .board_title{
    margin: 0 0 20px;
    font-size: 20px;
    font-weight: 950;
    letter-spacing: .2px;
    background: linear-gradient(135deg, #ff4f88, #ff6b9e, #ff9fc0);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .title {
    margin: 0 0 8px;
    font-size: 18px;
    font-weight: 950;
    color: rgba(46, 42, 51, 0.92);
  }

  .excerpt {
    margin: 0 0 10px;
    color: rgba(46, 42, 51, 0.78);
    line-height: 1.65;
    font-size: 14px;
  }

  .meta {
    display: flex;
    gap: 8px;
    font-size: 12px;
    color: rgba(255, 79, 136, 0.70);
    font-weight: 800;
  }

  .err {
    color: #ff3b77;
    font-weight: 800;
  }
  .muted {
    color: rgba(123, 106, 120, 0.85);
    font-weight: 700;
  }

  .post-item {
    display: flex;
    flex-direction: column;
    border-radius: 22px;
    padding: 18px;
    margin-bottom: 12px;
    background: #fff;
    border: 1px solid rgba(255, 79, 136, 0.16);
    cursor: pointer;
    transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
  }
  .post-item:hover {
    background: rgba(255, 107, 158, 0.08);
    transform: translateY(-2px);
    box-shadow: 0 18px 44px rgba(255, 79, 136, 0.14);
  }
</style>