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
    display: flex;
    flex-direction: column;
    margin: 0 0 0 0 ;
    padding: 20px;
  }
  
  .post-item {
    padding: 14px 16px;
    margin: 10px 0;
    background: #fff;
    border-radius: 14px;
    cursor: pointer;
  }

  .board_title{
    margin: 0 0 20px;
    font-size: 24px;
    color: rgba(255, 182, 193, 0.95);
  }
  .title {
    margin: 0 0 8px;
    font-size: 18px;
    color: rgba(230, 169, 196, 0.9);
  }

  .excerpt {
    margin: 0 0 10px;
    color: rgba(212, 199, 199, 0.95);
  }

  .meta {
    display: flex;
    gap: 8px;
    font-size: 12px;
    color: rgba(221, 195, 223, 0.55);
  }

  .err {
    color: #b00020;
  }
  .muted {
    color: rgba(0, 0, 0, 0.55);
  }

  .post-item {
    display: flex;
    flex-direction: column;
    border-radius: 20px;
    padding: 18px 16px;

    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
</style>