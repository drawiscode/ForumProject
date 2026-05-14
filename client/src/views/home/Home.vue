<template>
  <div class="homePage">
    <section class="pinRow">
      <div class="pinHead">
        <div class="pinTitle">置顶帖子</div>
      </div>
      <div v-if="pinnedLoading" class="muted">加载中...</div>
      <div v-else-if="pinnedError" class="err">{{ pinnedError }}</div>
      <div v-else-if="pinnedPosts.length === 0" class="muted">暂无置顶帖子</div>
      <div v-else class="pinList">
        <div class="pinItem" v-for="p in pinnedPosts" :key="`pin-${p.id}`" @click="goPost(p.id)">
          <span class="pinTag">置顶</span>
          <span class="pinItemTitle">{{ p.title }}</span>
          <span class="pinMeta">👍 {{ p.likes_count }} · 💬 {{ p.replies_count }}</span>
        </div>
      </div>
    </section>

    <section class="heroRow">
      <div class="sliderCard">
        <div class="slider">
          <!-- TODO: 替换为你的轮播图片资源（当前用 CSS 占位渐变） -->
          <div class="slides" :style="{ transform: `translateX(-${slideIndex * 100}%)` }">
            <div class="slide s1">
              <div class="slideText">
                <div class="stTitle">二次元电商式论坛首页</div>
                <div class="stSub">轮播图占位 · 2 秒自动切换 · 支持左右按钮</div>
              </div>
            </div>
            <div class="slide s2">
              <div class="slideText">
                <div class="stTitle">樱花粉氛围升级</div>
                <div class="stSub">后续替换为你的 banner 图</div>
              </div>
            </div>
            <div class="slide s3">
              <div class="slideText">
                <div class="stTitle">社区活动 / 公告</div>
                <div class="stSub">支持跳转：你后续接 API</div>
              </div>
            </div>
          </div>

          <button class="arrow left" type="button" @click="prevSlide" aria-label="上一张"><</button>
          <button class="arrow right" type="button" @click="nextSlide" aria-label="下一张">></button>

          <div class="dots" aria-hidden="true">
            <span v-for="n in 3" :key="n" class="dot" :class="{ on: slideIndex === (n-1) }"></span>
          </div>
        </div>
      </div>

      <div class="noticeCard">
        <div class="nhd">
          <div class="ntitle">官方公告</div>
          <div class="nhint">（静态占位，可点击）</div>
        </div>

        <!-- TODO: 后续替换为真实公告路由/详情页 -->
        <div class="noticeList">
          <a class="noticeItem" href="javascript:void(0)">【公告】欢迎体验樱花粉新版布局</a>
          <a class="noticeItem" href="javascript:void(0)">【活动】本周发帖抽奖（占位）</a>
          <a class="noticeItem" href="javascript:void(0)">【更新】头像上传、关注私信功能已上线</a>
          <a class="noticeItem" href="javascript:void(0)">【反馈】留言建议入口（占位）</a>
        </div>
      </div>
    </section>

    <!-- 第五栏：热门分类板块（复用 onCatClick，不改逻辑） -->
    <section class="catsRow">
      <div class="catsHead">
        <div class="catsTitle">热门分类板块</div>
      </div>

      <div class="catGrid">
        <!-- TODO: 后续替换图标为你自己的图片/SVG -->
        <button class="catCard" type="button" @click="onCatClick('综合讨论')">
          <div class="cico">💬</div><div class="ctxt">综合讨论</div>
        </button>
        <button class="catCard" type="button" @click="onCatClick('学习交流')">
          <div class="cico">📚</div><div class="ctxt">学习交流</div>
        </button>
        <button class="catCard" type="button" @click="onCatClick('作品分享')">
          <div class="cico">🖼</div><div class="ctxt">作品分享</div>
        </button>
        <button class="catCard" type="button" @click="onCatClick('求助问答')">
          <div class="cico">🆘</div><div class="ctxt">求助问答</div>
        </button>
        <button class="catCard" type="button" @click="onCatClick('情感天地')">
          <div class="cico">🌸</div><div class="ctxt">情感天地</div>
        </button>
        <button class="catCard" type="button" @click="onCatClick('娱乐八卦')">
          <div class="cico">🎀</div><div class="ctxt">娱乐八卦</div>
        </button>
        <button class="catCard" type="button" @click="onCatClick('网络科技')">
          <div class="cico">🧠</div><div class="ctxt">网络科技</div>
        </button>
      </div>
    </section>

    <!-- 原三栏内容：下移到这里（保持业务逻辑不变） -->
    <div class="home">
      <section class="col left">
        <div class="block">
          <div class="hd">
            <div class="title">板块导航</div>
          </div>

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

        <div v-if="isAuthed" class="block">
          <div class="hd">
            <div class="title">收藏的帖子</div>
          </div>

          <div v-if="favLoading" class="muted">加载中...</div>
          <div v-else-if="favError" class="err">{{ favError }}</div>
          <div v-else-if="favPosts.length === 0" class="muted">暂无收藏</div>

          <div v-else class="favlist">
            <div class="favitem" v-for="p in favPosts" :key="p.id" @click="goPost(p.id)">
              <div class="favtitle">{{ p.title }}</div>
              <div class="favmeta">浏览量 {{ p.views_count }} · 点赞数 {{ p.likes_count }} · 回复数 {{ p.replies_count }}</div>
            </div>
          </div>
        </div>

        <div class="block">
          <div class="hd">
            <div class="title">精华帖子</div>
          </div>

          <div v-if="featuredLoading" class="muted">加载中...</div>
          <div v-else-if="featuredError" class="err">{{ featuredError }}</div>
          <div v-else-if="featuredPosts.length === 0" class="muted">暂无精华帖子</div>
          <div v-else class="favlist">
            <div class="favitem" v-for="p in featuredPosts" :key="`feat-${p.id}`" @click="goPost(p.id)">
              <div class="favtitle">{{ p.title }}</div>
              <div class="favmeta">浏览量 {{ p.views_count }} · 点赞数 {{ p.likes_count }} · 回复数 {{ p.replies_count }}</div>
            </div>
          </div>
        </div>
      </section>

      <section class="col center">
        <div class="block hero">
          <div class="hd">
            <div class="title big">欢迎来到Overflow的论坛!</div>
            <div class="badge">Sakura Pink Forum</div>
          </div>
          <p class="desc">
            这是一个个人开发的课程大作业论坛项目,目前还在开发过程中.如果您找到了此论坛并且有兴趣使用它,我很欢迎您给我提出意见帮助我改善这个项目.如果有什么别的想法,也随时欢迎交流🤗
          </p>
        </div>

        <div class="block">
          <div class="hd">
            <div class="title">最新帖子</div>
            <div class="hint">点击卡片进入详情</div>
          </div>

          <article v-for="p in posts" :key="p.id" class="post" @click="goPost(p.id)">
            <div class="postHead">
              <div class="post-title">{{ p.title }}</div>
              <span v-if="Number(p.is_pinned) === 1" class="pinTag">置顶</span>
            </div>
            <p class="post-excerpt">{{p.excerpt}}</p>
            <div class="meta">浏览量 {{ p.views_count }} · 点赞数 {{ p.likes_count }} · 回复数 {{ p.replies_count }}</div>
          </article>
        </div>
      </section>

      <section class="col right">
        <div class="block">
          <div class="hd">
            <div class="title">热门帖子</div>
          </div>

          <div v-if="hotPostsLoading" class="muted">加载中...</div>
          <div v-else-if="hotPostsError" class="err">{{ hotPostsError }}</div>

          <div v-else class="list">
            <div v-for="p in hotPosts" :key="p.id" class="hotitem" @click="goPost(p.id)">
              <div class="hottitle">{{ p.title }}</div>
              <div class="hotmeta">👍 {{ p.likes_count }} · 💬 {{ p.replies_count }}</div>
            </div>
          </div>
        </div>

        <div class="block">
          <div class="hd">
            <div class="title">活跃用户</div>
          </div>

          <div v-if="activeUsersLoading" class="muted">加载中...</div>
          <div v-else-if="activeUsersError" class="err">{{activeUsersError}}</div>
          <div v-else class="list">
            <div v-for="u in activeUsers" :key="u.id" class="hotuser" @click="goUser(u.id)">
              <img v-if="u.avatar_url" class="avatar" :src="u.avatar_url" alt="avatar" />
              <div v-else class="avatar-placeholder"></div>

              <div class="uinfo">
                <div class="uname">{{ u.username }}</div>
                <div class="umeta">发帖数: {{u.posts_count}}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
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

        pinnedPosts: [],
        pinnedLoading: false,
        pinnedError: '',

        featuredPosts: [],
        featuredLoading: false,
        featuredError: '',

        activeUsers: [],
        activeUsersLoading: false,
        activeUsersError: '',

        favPosts: [],
        favLoading: false,
        favError: '',

        me: getStoredUser(),

        // ✅ 仅用于轮播展示（静态占位，不影响业务逻辑）
        slideIndex: 0,
        slideTimer: null
      }
    },
    computed:{
      isAuthed(){ 
        return Boolean(this.me && this.me.id)
      }
    },
    mounted(){
      this.fetchPosts()
      this.fetchPinnedPosts()
      this.fetchFeaturedPosts()
      this.fetchHotPosts()
      this.fetchActiveUsers()
      if(this.isAuthed) this.fetchFavPosts()

      // ✅ 轮播：2 秒自动切换（仅 Home 使用）
      this.slideTimer = setInterval(() => this.nextSlide(), 4000)
    },
    beforeUnmount(){
      if (this.slideTimer) clearInterval(this.slideTimer)
      this.slideTimer = null
    },
    methods:{
      nextSlide(){
        this.slideIndex = (this.slideIndex + 1) % 3
      },
      prevSlide(){
        this.slideIndex = (this.slideIndex + 3 - 1) % 3
      },

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
      async fetchPinnedPosts(){
        this.pinnedLoading = true
        this.pinnedError = ''
        try{
          const data = await apiFetch('/api/post/pinned?limit=5')
          this.pinnedPosts = data.posts || []
        }catch(err){
          this.pinnedError = err.message || '加载置顶帖子失败'
          this.pinnedPosts = []
        }finally{
          this.pinnedLoading = false
        }
      },
      async fetchFeaturedPosts(){
        this.featuredLoading = true
        this.featuredError = ''
        try{
          const data = await apiFetch('/api/post/featured?limit=5')
          this.featuredPosts = data.posts || []
        }catch(err){
          this.featuredError = err.message || '加载精华帖子失败'
          this.featuredPosts = []
        }finally{
          this.featuredLoading = false
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
  .homePage{
    width: min(1160px, 96%);
    margin: 12px auto 0;
    position: relative;
    z-index: 1;
  }

  .pinRow{
    background: rgba(255,255,255,0.96);
    border: 1px solid rgba(255, 79, 136, 0.22);
    box-shadow: 0 18px 54px rgba(255, 79, 136, 0.12);
    border-radius: 26px;
    padding: 14px;
    margin-bottom: 16px;
  }
  .pinHead{ margin-bottom: 10px; }
  .pinTitle{
    font-weight: 950;
    font-size: 16px;
    background: linear-gradient(135deg, #ff4f88, #ff6b9e, #ff9fc0);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .pinList{ display: flex; flex-direction: column; gap: 10px; }
  .pinItem{
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid rgba(255, 79, 136, 0.16);
    border-radius: 16px;
    background: #fff;
    padding: 10px 12px;
    cursor: pointer;
  }
  .pinItemTitle{ font-weight: 900; color: rgba(46, 42, 51, 0.92); flex: 1; }
  .pinMeta{ font-size: 12px; color: rgba(255, 79, 136, 0.7); font-weight: 800; }
  .pinTag{
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 3px 9px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 900;
    color: #fff;
    background: linear-gradient(135deg, rgba(255, 79, 136, 0.95), rgba(255, 107, 158, 0.95));
    white-space: nowrap;
  }

  /* ===== 第四栏：轮播 + 公告 ===== */
  .heroRow{
    display: grid;
    grid-template-columns: 2fr 1fr; /* 左 2/3 右 1/3 */
    gap: 16px;
    margin-bottom: 16px;
  }

  .sliderCard,
  .noticeCard{
    background: rgba(255,255,255,0.96);
    border: 1px solid rgba(255, 79, 136, 0.22);
    box-shadow: 0 18px 54px rgba(255, 79, 136, 0.12);
    border-radius: 26px;
    padding: 14px;
  }

  .slider{
    position: relative;
    height: 260px; /* 200-300px */
    border-radius: 22px;
    overflow: hidden;
    border: 1px solid rgba(255, 79, 136, 0.16);
    background: #fff;
  }

  .slides{
    height: 100%;
    display: flex;
    transition: transform .5s cubic-bezier(.2,.8,.2,1); /* 左右滑动 */
  }

  .slide{
    flex: 0 0 100%;
    height: 100%;
    position: relative;
    display:flex;
    align-items:flex-end;
    padding: 18px;

    /* ✅ 关键：图片自适应铺满容器 */
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }

  .s1{ background-image:url('../../assets/home/bg1.jpg'); }
  .s2{ background: linear-gradient(135deg, rgba(255, 159, 192, 0.30), rgba(255,255,255,0.92)); }
  .s3{ background: linear-gradient(135deg, rgba(255, 214, 229, 0.55), rgba(255,255,255,0.92)); }

  .slideText{
    width: min(520px, 92%);
    border-radius: 18px;
    padding: 12px 14px;
    background: rgba(255,255,255,0.86);
    border: 1px solid rgba(255, 79, 136, 0.18);
    box-shadow: 0 18px 44px rgba(255, 79, 136, 0.10);
  }
  .stTitle{
    font-weight: 950;
    font-size: 18px;
    background: linear-gradient(135deg, #ff4f88, #ff6b9e, #ff9fc0);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .stSub{
    margin-top: 6px;
    font-size: 13px;
    font-weight: 800;
    color: rgba(123, 106, 120, 0.9);
  }

  .arrow{
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 42px;
    height: 42px;
    border-radius: 999px;
    border: 1px solid rgba(255, 79, 136, 0.18);
    background: rgba(255,255,255,0.55);
    backdrop-filter: blur(8px);
    cursor: pointer;
    font-size: 24px;
    font-weight: 900;
    color: rgba(255, 79, 136, 0.95);
    transition: transform .18s ease, background .18s ease;
  }
  .arrow:hover{ background: rgba(255,255,255,0.72); transform: translateY(-50%) scale(1.03); }
  .arrow.left{ left: 10px; }
  .arrow.right{ right: 10px; }

  .dots{
    position: absolute;
    left: 0; right: 0;
    bottom: 10px;
    display:flex;
    justify-content: center;
    gap: 8px;
    pointer-events: none;
  }
  .dot{
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: rgba(255,255,255,0.7);
    border: 1px solid rgba(255, 79, 136, 0.22);
  }
  .dot.on{
    background: rgba(255, 79, 136, 0.86);
  }

  .nhd{
    display:flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
  }
  .ntitle{
    font-weight: 950;
    font-size: 16px;
    background: linear-gradient(135deg, #ff4f88, #ff6b9e, #ff9fc0);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .nhint{ font-size: 12px; color: rgba(123, 106, 120, 0.85); font-weight: 800; }

  .noticeList{ display:flex; flex-direction: column; gap: 10px; }
  .noticeItem{
    display:block;
    text-decoration: none;
    padding: 10px 12px;
    border-radius: 16px;
    background: #fff;
    border: 1px solid rgba(255, 79, 136, 0.16);
    color: rgba(46, 42, 51, 0.90);
    font-weight: 850;
    transition: transform .18s ease, background .18s ease, box-shadow .18s ease;
  }
  .noticeItem:hover{
    background: rgba(255, 107, 158, 0.10);
    transform: translateY(-1px);
    box-shadow: 0 14px 28px rgba(255, 79, 136, 0.12);
  }

  /* ===== 第五栏：分类卡片 ===== */
  .catsRow{
    background: rgba(255,255,255,0.96);
    border: 1px solid rgba(255, 79, 136, 0.22);
    box-shadow: 0 18px 54px rgba(255, 79, 136, 0.12);
    border-radius: 26px;
    padding: 14px;
    margin-bottom: 16px;
  }
  .catsHead{
    display:flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 12px;
  }
  .catsTitle{
    font-weight: 950;
    font-size: 16px;
    background: linear-gradient(135deg, #ff4f88, #ff6b9e, #ff9fc0);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .catGrid{
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 10px;
  }
  .catCard{
    border: 1px solid rgba(255, 79, 136, 0.18);
    background: #fff;
    border-radius: 20px;
    padding: 12px 10px;
    cursor: pointer;
    display:flex;
    align-items:center;
    gap: 10px;
    justify-content:center;
    transition: transform .18s ease, background .18s ease, box-shadow .18s ease;
    min-height: 54px;
  }
  .catCard:hover{
    background: rgba(255, 107, 158, 0.10);
    transform: translateY(-1px);
    box-shadow: 0 14px 28px rgba(255, 79, 136, 0.10);
  }
  .cico{
    width: 32px; height: 32px;
    border-radius: 14px;
    display:flex; align-items:center; justify-content:center;
    background: rgba(255, 107, 158, 0.10);
    border: 1px solid rgba(255, 79, 136, 0.16);
    color: rgba(255, 79, 136, 0.95);
    font-weight: 900;
  }
  .ctxt{
    font-weight: 950;
    color: rgba(46, 42, 51, 0.90);
    font-size: 14px;
    white-space: nowrap;
  }

  /* ===== 下方：原三栏布局（保留） ===== */
  .home{
    display: grid;
    grid-template-columns: 1fr 2.1fr 1fr;
    gap: 18px;
    position: relative;
    z-index: 1;
  }
  .col{ min-width: 0; }

  .block{
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid rgba(255, 79, 136, 0.22);
    box-shadow: 0 18px 54px rgba(255, 79, 136, 0.12);
    border-radius: 26px;
    padding: 16px 16px;
    margin-bottom: 16px;
  }

  .hd{
    display:flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 12px;
  }
  .title{
    font-size: 16px;
    font-weight: 950;
    letter-spacing: .2px;
    background: linear-gradient(135deg, #ff4f88, #ff6b9e, #ff9fc0);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .title.big{ font-size: 18px; }
  .hint{ font-size: 12px; color: rgba(123, 106, 120, 0.85); }
  .badge{
    font-size: 12px;
    font-weight: 900;
    color: rgba(255, 79, 136, 0.95);
    background: rgba(255, 107, 158, 0.10);
    border: 1px solid rgba(255, 79, 136, 0.18);
    padding: 6px 10px;
    border-radius: 999px;
    white-space: nowrap;
  }
  .desc{ color: rgba(46, 42, 51, 0.88); line-height: 1.75; font-size: 14px; }

  .cats{ display:flex; flex-direction: column; gap: 10px; }
  .cat{
    width: 100%;
    text-align: left;
    padding: 10px 12px;
    border-radius: 16px;
    border: 1px solid rgba(255, 79, 136, 0.18);
    background: #fff;
    color: rgba(46, 42, 51, 0.90);
    cursor: pointer;
    font-weight: 850;
    transition: transform .18s ease, background .18s ease, box-shadow .18s ease;
  }
  .cat:hover{
    background: rgba(255, 107, 158, 0.10);
    transform: translateY(-1px);
    box-shadow: 0 14px 28px rgba(255, 79, 136, 0.10);
  }

  .post{
    padding: 14px 14px;
    border-radius: 22px;
    border: 1px solid rgba(255, 79, 136, 0.16);
    background: #fff;
    cursor: pointer;
    transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
    margin-bottom: 12px;
  }
  .post:hover{
    background: rgba(255, 107, 158, 0.08);
    transform: translateY(-2px);
    box-shadow: 0 18px 44px rgba(255, 79, 136, 0.14);
  }
  .post-title{ font-weight: 950; color: rgba(46, 42, 51, 0.92); margin-bottom: 6px; font-size: 16px; }
  .postHead{ display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .post-excerpt{ color: rgba(46, 42, 51, 0.78); line-height: 1.65; font-size: 14px; }
  .meta{ margin-top: 8px; font-size: 12px; color: rgba(255, 79, 136, 0.70); font-weight: 800; }

  .favlist{ display:flex; flex-direction: column; gap: 10px; }
  .favitem{
    padding: 12px 12px;
    border-radius: 18px;
    background: #fff;
    border: 1px solid rgba(255, 79, 136, 0.16);
    cursor: pointer;
    transition: transform .18s ease, background .18s ease, box-shadow .18s ease;
  }
  .favitem:hover{
    background: rgba(255, 107, 158, 0.10);
    transform: translateY(-1px);
    box-shadow: 0 14px 28px rgba(255, 79, 136, 0.12);
  }
  .favtitle{ font-weight: 950; color: rgba(46, 42, 51, 0.90); }
  .favmeta{ font-size: 12px; margin-top: 4px; color: rgba(255, 79, 136, 0.70); font-weight: 800; }

  .list{ display:flex; flex-direction: column; gap: 10px; }
  .hotitem,
  .hotuser{
    padding: 12px 12px;
    border-radius: 18px;
    background: #fff;
    border: 1px solid rgba(255, 79, 136, 0.16);
    cursor: pointer;
    transition: transform .18s ease, background .18s ease, box-shadow .18s ease;
  }
  .hotitem:hover,
  .hotuser:hover{
    background: rgba(255, 107, 158, 0.10);
    transform: translateY(-1px);
    box-shadow: 0 14px 28px rgba(255, 79, 136, 0.12);
  }

  .hottitle{ font-weight: 950; color: rgba(46, 42, 51, 0.90); }
  .hotmeta{ font-size: 12px; margin-top: 4px; color: rgba(255, 79, 136, 0.70); font-weight: 800; }
  .hotuser{ display: flex; gap: 10px; align-items: center; }

  .avatar,
  .avatar-placeholder{
    width: 40px;
    height: 40px;
    border-radius: 999px;
    flex: 0 0 auto;
  }
  .avatar{
    object-fit: cover;
    border: 2px solid rgba(255, 79, 136, 0.18);
    box-shadow: 0 12px 24px rgba(255, 79, 136, 0.10);
    background: #fff;
  }
  .avatar-placeholder{
    background: rgba(255, 107, 158, 0.10);
    border: 2px dashed rgba(255, 79, 136, 0.22);
  }

  .uname{ font-weight: 950; color: rgba(46, 42, 51, 0.90); }
  .umeta{ font-size: 12px; color: rgba(123, 106, 120, 0.85); font-weight: 800; margin-top: 2px; }

  .muted{ color: rgba(123, 106, 120, 0.85); font-weight: 700; }
  .err{ color: #ff3b77; font-weight: 800; }

  @media (max-width: 980px){
    .heroRow{ grid-template-columns: 1fr; }
    .catGrid{ grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .home{ grid-template-columns: 1fr; }
  }
  @media (max-width: 520px){
    .slider{ height: 220px; }
    .catGrid{ grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
</style>