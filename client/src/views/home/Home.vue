<template>
  <div class="content">
    <section class="left">
      <div class="block block1">
        <div class="title">板块导航</div>
        <div class="cats">
          <button class="cat" type="button" @click="onCatClick('全部')">全部</button>
          <button class="cat" type="button" @click="onCatClick('综合讨论')">综合讨论</button>
          <button class="cat" type="button" @click="onCatClick('学习交流')">学习交流</button>
          <button class="cat" type="button" @click="onCatClick('作品分享')">作品分享</button>
          <button class="cat" type="button" @click="onCatClick('求助问答')">求助问答</button>

          <button class="cat" type="button" @click="onCatClick('情感天地')">情感天地</button>
          <button class="cat" type="button" @click="onCatClick('娱乐八卦')">娱乐八卦</button>
          <button class="cat" type="button" @click="onCatClick('网络科技')">网络科技</button>
        </div>
      </div>
      
      <!-- 仅登录显示-->
      <div v-if="isAuthed" class="block block2">
        <div class="title"> 收藏的帖子</div>

        <div v-if="favLoading">加载中...</div>
        <div v-else-if="favError" class="err">{{ favError }}</div>
        <div v-else-if="favPosts.length === 0" class="muted">暂无收藏</div>

        <div v-else class="favlist">
          <div class="favitem" v-for="p in favPosts" :key="p.id" @click="goPost(p.id)">
            <div class="favtitle">{{ p.title }}</div>
            <div class="favmeta">浏览量 {{ p.views_count }} · 点赞数 {{ p.likes_count }} · 回复数 {{ p.replies_count }}</div>
          </div>
        </div>
      </div>

    </section>

    <section class="center">
      <div class="block block-with-bg1">
        <div class="title">欢迎来到Vue.js社区!</div>
        <p>这是一个专为Vue.js开发者打造的社区,在这里你可以分享你的作品,交流学习经验,寻求帮助,参与综合讨论.无论你是初学者还是资深开发者,都能在这里找到属于自己的位置.加入我们,一起探索Vue.js的无限可能!</p>
      </div>

      <div class="block block-with-bg2">
        <article v-for="p in posts" :key="p.id" class="card" @click="goPost(p.id)">
          <div class="title">{{ p.title }}</div>
          <p>{{p.excerpt}}</p>
          <div class="favmeta">浏览量 {{ p.views_count }} · 点赞数 {{ p.likes_count }} · 回复数 {{ p.replies_count }}</div>
        </article>
      </div>
    </section>

    <section class="right">
      <div class="block">
        <div class="title">热门帖子</div>

        <div v-if="hotPostsLoading">加载中...</div>
        <div v-else-if="hotPostsError" class="err">{{ hotPostsError }}</div>
        
        <div v-else>
          <div v-for="p in hotPosts" :key="p.id" class="hotitem card" @click="goPost(p.id)">
            <div class="hottitle">{{ p.title }}</div>
            <div class="hotmeta">👍 {{ p.likes_count }} · 💬 {{ p.replies_count }}</div>
          </div>
        </div>
      </div>

      <div class="block">
        <div class="title">活跃用户</div>

        <div v-if="activeUsersLoading">加载中...</div>
        <div v-else-if="activeUsersError" class="err">{{activeUsersError}}</div>
        <div v-else>

          <div v-for="u in activeUsers" :key="u.id" class="hotuser" @click="goUser(u.id)">
            <img v-if="u.avatar_url" class="avatar" :src="u.avatar_url" alt="avatar" />
            <div v-else class="avatar-placeholder"></div>

            <div class="uinfo">
              <div class="uname">{{ u.username }}</div>
              <div class="umeta">发帖数:{{u.posts_count}}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
  import {apiFetch} from '../../api/http'

  function getStoredUser() {
    const raw = localStorage.getItem('af_user')
    if (!raw) return null
    try { return JSON.parse(raw) } catch { return null }
  }

  export default {
    name: 'Home',
    data(){
      return {
        posts: [],
        postsLoading: false,

        hotPosts: [],
        hotPostsLoading: false,
        hotPostsError: '',

        activeUsers: [],
        activeUsersLoading: false,
        activeUsersError: '',

        favPosts: [],
        favLoading: false,
        favError: '',

        me: getStoredUser()
      }
    },
    computed:{
      isAuthed(){ 
        return Boolean(this.me && this.me.id)
      }
    },
    mounted(){
      this.fetchPosts()
      this.fetchHotPosts()
      this.fetchActiveUsers()
      if(this.isAuthed) this.fetchFavPosts()
    },

    methods:{
      async fetchPosts(){
        this.postsLoading = true
        try{
          const posts_data = await apiFetch('/api/post')
          this.posts = posts_data.posts || []
        }catch(err){
          console.error('加载帖子失败', err)
          this.posts = []  
        }finally{
          this.postsLoading = false
        }
      },
      async fetchHotPosts(){
        this.hotPostsLoading = true
        this.hotPostsError = ''
        try{
          const data = await apiFetch('/api/post/hot?limit=5')
          this.hotPosts = data.posts || []
        }catch(err){
          this.hotPostsError = err.message || '加载热门帖子失败'
          this.hotPosts = []
          console.error('加载热门帖子失败', err)
        }finally{
          this.hotPostsLoading = false
        }
      },
      async fetchActiveUsers(){
        this.activeUsersLoading = true
        this.activeUsersError = ''
        try{
          const data = await apiFetch('/api/user/active?limit=5')
          this.activeUsers = data.users || []
        }catch(err){
          this.activeUsersError = err.message || '加载活跃用户失败'
          this.activeUsers = []
          console.error('加载活跃用户失败', err)
        }finally{
          this.activeUsersLoading = false
        }
      },
      async fetchFavPosts(){
        this.favLoading = true
        this.favError = ''
        this.favPosts = []
        try{
          const data = await apiFetch('/api/post/favorites?limit=5')  
          this.favPosts = data.posts || []
        }catch(err){
          this.favError = err.message || '加载收藏帖子失败'
          this.favPosts = []
          console.error('加载收藏帖子失败', err)
        }finally{
          this.favLoading = false
        }
      },
      onCatClick(name){
        if(name === '全部') return this.$router.push('/')
        this.$router.push(`/board/${encodeURIComponent(name)}`)
      },
      goPost(id){
        this.$router.push(`/post/${id}`)
      },
      goUser(id){
        this.$router.push(`/user/${id}`)  
      }
    }
  }
</script>


<style scoped>
  /*收藏帖子框的样式*/
  .favlist{ display:flex; flex-direction: column; gap: 10px; }
  .favitem{
    padding: 10px 12px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    cursor: pointer;
    transition: all 0.25s ease;
  }
  .favitem:hover{ background: rgba(255, 154, 158, 0.15); transform: translateY(-2px); }
  .favtitle{ font-weight: 700; color: rgba(255,255,255,0.92); }
  .favmeta{ font-size: 12px; opacity: 0.75; margin-top: 4px; color: rgba(255,255,255,0.75); }
  .muted{ color: rgba(255, 255, 255, 0.5); }

  .card { 
    cursor: pointer; 

    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.12);
    transition: all 0.25s ease;

    font-size: 16px;
    font-weight: 500;
    margin-bottom: 10px;
    padding: 15px 15px 10px 20px;
  
    border-radius: 38px;
    cursor: pointer;
  }

  /* 页面布局容器：透明，让 App 的渐变星空透出来 */
  .content {
    width: 100%;
    min-height: calc(100vh - 120px);
    padding: 16px;
    display: grid;
    grid-template-columns: 1fr 2fr 1fr;
    gap: 18px;
    position: relative;
    z-index: 1;
    background: transparent; /* ✅ 不要盖住 app 背景 */
    border-radius: 0;
  }

  /* 统一毛玻璃块 */
  .block {
    display: flex;
    flex-direction: column;
    border-radius: 20px;
    padding: 18px 16px;
    margin: 0 0 38px 0;

    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .title {
    font-size: 1.2em;
    font-weight: 700;
    margin-bottom: 12px;
    background: linear-gradient(45deg, #ff9a9e, #fad0c4, #fbc2eb);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  /* left */
  .cats { 
    display: flex; 
    flex-direction: 
    column; 
  }
  .cat {
    display: flex;
    align-items: center;
    font-size: 16px;
    font-weight: 500;
    margin-bottom: 10px;
    padding: 10px 12px;

    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 18px;
    cursor: pointer;

    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.92);

    transition: all 0.25s ease;
  }
  .cat:hover {
    background: rgba(255, 154, 158, 0.15);
    transform: translateX(4px);
  }

  /* right */
  .hotitem,
  .hotuser {
    padding: 10px 12px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    margin-bottom: 10px;
    cursor: pointer;
    transition: all 0.25s ease;
  }
  .hotitem:hover,
  .hotuser:hover {
    background: rgba(255, 154, 158, 0.15);
    transform: translateY(-2px);
  }

  .hottitle { font-weight: 700; color: rgba(255,255,255,0.92); }
  .hotmeta { font-size: 12px; opacity: 0.75; margin-top: 4px; color: rgba(255,255,255,0.75); }

  .hotuser { display: flex; gap: 10px; align-items: center; }

  .avatar,
  .avatar-placeholder {
    width: 38px;
    height: 38px;
    border-radius: 999px;
  }
  .avatar { object-fit: cover; border: 2px solid rgba(255,255,255,0.35); }
  .avatar-placeholder { background: rgba(255,255,255,0.14); border: 2px solid rgba(255,255,255,0.18); }

  .uname { font-weight: 700; color: rgba(255,255,255,0.92); }
  .umeta { font-size: 12px; opacity: 0.75; color: rgba(255,255,255,0.75); }

  .err { color: #ff7878; }

  .left, .center, .right { min-width: 0; }

  @media (max-width: 900px) {
    .content { grid-template-columns: 1fr; }
  }
</style>