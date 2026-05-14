<template>
  <div class="searchPage">
    <section class="searchBar">
      <div class="searchField" role="search">
        <span class="search-ico" aria-hidden="true">⌕</span>
        <input
          class="search-input"
          type="text"
          v-model.trim="queryInput"
          placeholder="搜索标题/内容"
          @keyup.enter="submitSearch"
        />
        <button class="search-btn" type="button" @click="submitSearch">搜索</button>
      </div>
      <div class="searchHint" v-if="query">当前关键词：<span>{{ query }}</span></div>
    </section>

    <section class="resultCard">
      <div class="resultHead">
        <div class="resultTitle">搜索结果</div>
        <div class="resultMeta" v-if="query && !loading">
          共 {{ posts.length }} 条
        </div>
      </div>

      <div v-if="loading" class="muted">搜索中...</div>
      <div v-else-if="error" class="err">{{ error }}</div>
      <div v-else-if="!query" class="muted">请输入关键词开始搜索</div>
      <div v-else-if="posts.length === 0" class="muted">没有找到相关帖子</div>

      <div v-else class="resultList">
        <article
          v-for="post in posts"
          :key="post.id"
          class="resultItem"
          @click="goPost(post.id)"
          title="点击查看"
        >
          <div class="rTitle">{{ post.title }}</div>
          <div class="rExcerpt">{{ post.excerpt || post.content }}</div>
          <div class="rMeta">
            <span>{{ post.author }}</span>
            <span>·</span>
            <span>{{ formatTime(post.created_at) }}</span>
            <span>·</span>
            <span>{{ post.category }}</span>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script>
  import { apiFetch } from '../../api/http'

  export default {
    name: 'Search',
    data() {
      return {
        query: '',
        queryInput: '',
        posts: [],
        loading: false,
        error: ''
      }
    },
    mounted() {
      this.syncFromRoute()
      this.search()
    },
    watch: {
      '$route.query.q'() {
        this.syncFromRoute()
        this.search()
      }
    },
    methods: {
      syncFromRoute() {
        const q = String(this.$route.query.q || '').trim()
        this.query = q
        this.queryInput = q
      },
      async search() {
        if (!this.query) {
          this.posts = []
          this.error = ''
          return
        }
        this.loading = true
        this.error = ''
        try {
          const data = await apiFetch(`/api/search?q=${encodeURIComponent(this.query)}`)
          this.posts = data.posts || []
        } catch (err) {
          this.error = err.message || '搜索失败'
          this.posts = []
        } finally {
          this.loading = false
        }
      },
      submitSearch() {
        const q = String(this.queryInput || '').trim()
        if (!q) return
        if (q === this.query) return
        this.$router.push({ path: '/search', query: { q } })
      },
      goPost(id) {
        this.$router.push(`/post/${id}`)
      },
      formatTime(v) {
        if (!v) return ''
        const d = new Date(v)
        return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString()
      }
    }
  }
</script>

<style scoped>
  .searchPage{
    width: min(1160px, 96%);
    margin: 12px auto 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .searchBar{
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid rgba(255, 79, 136, 0.22);
    box-shadow: 0 18px 54px rgba(255, 79, 136, 0.12);
    border-radius: 26px;
    padding: 16px;
  }
  .searchField{
    display: flex;
    align-items: center;
    gap: 10px;
    background: #fff;
    border: 1px solid rgba(255, 79, 136, 0.22);
    border-radius: 999px;
    padding: 8px 12px;
  }
  .search-ico{
    width: 24px; height: 24px;
    border-radius: 999px;
    display:flex; align-items:center; justify-content:center;
    background: rgba(255, 107, 158, 0.10);
    color: rgba(255, 79, 136, 0.95);
    border: 1px solid rgba(255, 79, 136, 0.18);
    font-weight: 900;
  }
  .search-input{
    flex: 1;
    border: 0;
    outline: none;
    font-size: 14px;
    font-weight: 700;
    color: rgba(46, 42, 51, 0.92);
    min-width: 0;
  }
  .search-btn{
    border: 0;
    cursor: pointer;
    padding: 7px 16px;
    border-radius: 999px;
    font-weight: 900;
    font-size: 13px;
    color: #fff;
    background: linear-gradient(135deg, rgba(255, 79, 136, 0.95), rgba(255, 107, 158, 0.95));
    box-shadow: 0 10px 20px rgba(255, 79, 136, 0.14);
    transition: transform .18s ease, filter .18s ease;
    white-space: nowrap;
  }
  .search-btn:hover{ transform: translateY(-1px); filter: brightness(1.02); }
  .searchHint{
    margin-top: 8px;
    font-size: 12px;
    color: rgba(123, 106, 120, 0.85);
    font-weight: 800;
  }
  .searchHint span{ color: rgba(255, 79, 136, 0.95); font-weight: 900; }

  .resultCard{
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid rgba(255, 79, 136, 0.22);
    box-shadow: 0 18px 54px rgba(255, 79, 136, 0.12);
    border-radius: 26px;
    padding: 16px;
  }
  .resultHead{
    display:flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 12px;
  }
  .resultTitle{
    font-weight: 950;
    font-size: 16px;
    background: linear-gradient(135deg, #ff4f88, #ff6b9e, #ff9fc0);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .resultMeta{ font-size: 12px; color: rgba(123, 106, 120, 0.85); font-weight: 800; }

  .resultList{ display: flex; flex-direction: column; gap: 12px; }
  .resultItem{
    padding: 16px;
    border-radius: 22px;
    background: #fff;
    border: 1px solid rgba(255, 79, 136, 0.16);
    cursor: pointer;
    transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
  }
  .resultItem:hover{
    background: rgba(255, 107, 158, 0.08);
    transform: translateY(-2px);
    box-shadow: 0 18px 44px rgba(255, 79, 136, 0.14);
  }
  .rTitle{ font-weight: 950; color: rgba(46, 42, 51, 0.92); margin-bottom: 6px; font-size: 16px; }
  .rExcerpt{ color: rgba(46, 42, 51, 0.78); line-height: 1.65; font-size: 14px; }
  .rMeta{ margin-top: 8px; font-size: 12px; color: rgba(255, 79, 136, 0.70); font-weight: 800; display:flex; gap: 8px; flex-wrap: wrap; }

  .muted{ color: rgba(123, 106, 120, 0.85); font-weight: 700; }
  .err{ color: #ff3b77; font-weight: 800; }

  @media (max-width: 520px){
    .search-btn{ display: none; }
  }
</style>
