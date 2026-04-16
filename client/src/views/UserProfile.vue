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
          <div class="meta">
            <!--用span是因为不会自动换行 -->
            
            <span>发帖{{ user.posts_count }}</span>
            <span>.</span>
            <span>关注{{ user.follow_count ?? 0}}</span>
            <span>.</span>
            <span>粉丝{{ user.fans_count ?? 0}}</span>  
          </div>
        </div>

        <!-- 这里可以放一些操作按钮，关注、私信 -->
        <div class="actions" v-if="canAct">
            <button class="btn ghost" type="button" :disabled="followLoading" @click="toggleFollow">
                {{user.is_following ? '取消关注' : '关注'}}
            </button>

            <button class="btn" type="button" :disabled="!user.allow_dm" @click="openDm">
                私信
            </button>
        </div>
      </div>

      <div class="row"><b>性别：</b>{{ genderText(user.gender) }}</div>
      <div class="row"><b>简介：</b>{{ user.bio || '暂无简介' }}</div>
      <div class="row"><b>注册：</b>{{ formatTime(user.created_at) }}</div>
    
    <!-- 简易私信输入框 -->
      <div v-if="dmOpen" class="dm">
        <textarea class="dmta" v-model.trim="dmText" placeholder="输入私信内容..."></textarea>
        <div class="dmbar">
          <div class="muted" v-if="!user.allow_dm">对方不允许私信</div>
          <div class="err" v-else-if="dmError">{{ dmError }}</div>
          <div class="ok" v-else-if="dmOk">{{ dmOk }}</div>
          <button class="btn" type="button" :disabled="dmLoading || !user.allow_dm" @click="sendDm">发送</button>
        </div>
      </div>

    </div>

    <!-- ✅ 兜底：既不 loading、也没 error 但也没 user -->
    <div v-else class="err">用户不存在或加载失败</div>
  </div>
</template>

<script>
    import { apiFetch } from '../api/http'

    function getStoredUser() {
        const raw = localStorage.getItem('af_user')
        if (!raw) return null
        try { return JSON.parse(raw) } catch { return null }
    }

    export default {
        name: 'UserProfile',
        data() {
            return { 
                loading: false, 
                error: '', 
                user: null,

                meId : getStoredUser()?.id || 0, // 当前登录用户的ID,用于判断是否是看自己的主页
                followLoading: false,

                dmOpen: false,
                dmText: '',
                dmLoading: false,
                dmError:'',
                dmOk:''
            }
        },
        computed: {
            id() {
                //从路由参数获取用户ID
                return this.$route.params.id
            },
            canAct() {
                //登录且不是看自己的主页
                return this.meId && Number(this.id) !== Number(this.meId)
            },
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
            },
            async toggleFollow() {
                if(!this.canAct || !this.user) return;
                this.followLoading = true;
                try{
                    if(this.user.is_following){
                        await apiFetch(`/api/user/${this.user.id}/follow`,{method:'DELETE'});
                        this.user.fans_count = Math.max((this.user.fans_count || 0) - 1, 0);
                        this.user.is_following = false;
                    }
                    else{
                        await apiFetch(`/api/user/${this.user.id}/follow`,{method:'POST'});
                        this.user.fans_count = (this.user.fans_count || 0) + 1;
                        this.user.is_following = true;
                    }
                }catch(e){
                    this.error = e.message || '操作失败'
                }finally{
                    this.followLoading = false;
                }
            },
            openDm(){
                this.dmOpen = !this.dmOpen;
                this.dmError = '';
                this.dmOk = '';
            },
            async sendDm(){
                if (!this.user) return;
                const text = String(this.dmText || '').trim();
                if (!text) {
                    this.dmError = '请输入内容';
                    return;
                }
                this.dmLoading = true;
                this.dmError = '';
                this.dmOk = '';
                try {
                    await apiFetch('/api/dm/send', { method: 'POST', body: { to_user_id: Number(this.id), content: text } });
                    this.dmOk = '发送成功';
                    this.dmText = '';
                } catch (e) {
                    this.dmError = e.message || '发送失败';
                } finally {
                    this.dmLoading = false;
                }
            }
        }
    }
</script>

<style scoped>
    .wrap { width: min(760px, 96%); margin: 18px auto 0; padding: 16px; position: relative; z-index: 1; }
    .err { color: #ff7878; }
    .ok {color: #b8ffcf; font-weight: 700; }
    .muted { opacity:75; }

    .card {
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        border-radius: 20px;
        padding: 16px;
        color: rgba(255,255,255,0.9);
    }

    .head { 
        display:flex; 
        gap: 12px; 
        align-items:center; 
        margin-bottom: 12px; 
    }
    .main{
        flex: 1;
        min-width: 0;
    }

    .btn{
        border: 0;
        padding: 9px 12px;
        border-radius: 999px;
        cursor: pointer;
        color: #fff;
        background: linear-gradient(45deg,rgb(206, 162, 164), #fad0c4);
        box-shadow: 0 10px 24px rgba(255,154,158,0.18);
    }
    .btn:disabled{ 
        opacity: .6; 
        cursor: not-allowed; 
    }
    .btn.ghost{
        background: rgba(255,255,255,0.10);
        border: 1px solid rgba(255,255,255,0.16);
        box-shadow: none;
    }

    .avatar { width: 56px; height: 56px; border-radius: 999px; object-fit: cover; border: 2px solid rgba(255,255,255,0.35); }
    .avatar.placeholder { background: rgba(255,255,255,0.14); border: 2px solid rgba(255,255,255,0.18); }
    .name { font-size: 18px; font-weight: 800; }
    .meta { font-size: 12px; opacity: .75; }
    .actions{
        display:flex;
        gap:15px;
    }
    .row { margin-top: 8px; }

        
    .dm{
        margin-top: 14px;
        padding-top: 12px;
        border-top: 1px solid rgba(255,255,255,0.12);
    }
    .dmta{
        width: 100%;
        min-height: 280px;
        resize: vertical;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,0.18);
        background: rgba(0,0,0,0.18);
        color: rgba(255,255,255,0.92);
        padding: 10px 12px;
        outline: none;
    }
    .dmbar{ 
        margin-top: 10px; 
        display:flex; 
        justify-content: space-between; 
        gap: 10px; 
        align-items:center; 
    }
</style>