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
        </article>
      </div>
    </section>

    <section class="right">
      <div class="block">
        <div class="title">热门帖子</div>
        <div v-for="i in 5" :key="i" class="hotitems">
          <div class="hottitle">{{ i }}</div>
          <p>这是热门帖子 {{ i }} 的内容摘要.</p>
        </div>
      </div>

      <div>
        <div class="block">
          <div class="title">活跃用户</div>
          <div v-for="i in 5" :key="i" class="hotusers">
            <div class="hottitle">{{ i }}</div>
            <p>这是活跃用户 {{ i }} 的简介.</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
  import {apiFetch} from '../api/http'
  export default {
    name: 'Home',
    data(){
      return {
        posts: [],
        postsLoading: false,
      }
    },
    mounted(){
      this.fetchPosts()
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
      onCatClick(name){
        if(name === '全部') return this.$router.push('/')
        this.$router.push(`/board/${encodeURIComponent(name)}`)
      },
      goPost(id){
        this.$router.push(`/post/${id}`)
      }
    }
  }
</script>

<style scoped>
  .card{
    
    cursor: pointer;
  }
  .title{
    font-size: 1.2em;
    font-weight: bold;
    margin-bottom: 12px;
    color: rgb(142, 53, 145);
  }
  .block{
    display:flex;
    flex-direction: column;
    border-radius: 16px;
    margin: 18px 14px 18px 14px;
    padding: 18px 14px 18px 14px;

    background-color: rgb(255, 255, 255);
  }
  .block1{
    margin-right: 20px;
  }
  .block-with-bg1{
    background-image: url("../assets/bg1.jpg");
    background-size: cover;
    background-position: center;
  }
  .block-with-bg2{
    background-image: url();
    background-size: cover;
    background-position: center;
  }
  .cats {
    display: flex;
    flex-direction: column;
  }
  .cat {
    display: flex;
    align-items: center;
    font-size: 16px;
    font-weight: 500;
    margin-bottom: 10px;
    padding: 0.5em;
    border: none;
    background-color: rgb(246, 226, 244);
    border-radius: 8px;
    cursor: pointer;
  }

  .content {
    display: flex;
    background-color:rgb(235, 232, 232);
    border-radius: 16px;
  }

  .left{
    flex: 1;
  }
  .center{
    flex: 2;
  }
  .right{
    flex: 1;
  }
</style>