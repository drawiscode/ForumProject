<template>
  <div class="board-view">
    <h2>板块：{{ boardName }}</h2>

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
  import { apiFetch } from '../api/http'

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

  .title {
    margin: 0 0 8px;
    font-size: 18px;
    color: rgb(142, 53, 145);
  }

  .excerpt {
    margin: 0 0 10px;
    color: rgba(0, 0, 0, 0.75);
  }

  .meta {
    display: flex;
    gap: 8px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.55);
  }

  .err {
    color: #b00020;
  }
  .muted {
    color: rgba(0, 0, 0, 0.55);
  }
</style>