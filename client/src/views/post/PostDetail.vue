<template>
    <div class ="content">
        <section class="left">
            <div class ="post">
                <div class="personal-info">
                    <div v-if="loading">加载中...</div>
                    <div v-else-if="error">{{error}}</div>
                    <div v-else>
                        {{post.author}}
                    </div>
                </div>

                <div class ="post-content">
                    <div v-if="loading">加载中...</div>
                    <div v-else-if="error">{{error}}</div>
                    <div v-else>
                        <div class="post_title">
                            {{post.title}}
                        </div>
                        <div class="post_content">
                            {{post.content}}
                        </div>
                    </div>
                </div>

                <div class>
                    <div v-if="loading">加载中...</div>
                    <div v-else-if="error">{{error}} </div>
                    <div v-else class="post-info">
                        <div class="post_foot_message_left">
                            <div>{{ post.category }}</div>
                            <div>{{ formatTime(post.created_at) }}</div>
                            <div class="stats">
                                <span>点赞数: {{ post.likes_count }}</span>
                                <span>评论数: {{ post.replies_count }}</span>
                                <span>浏览数: {{ post.views_count }}</span>
                                <span>收藏数: {{ post.favorites_count }}</span>
                            </div>
                        </div>

                        <div class="post_foot_message_right">
                            <button class="btn" type="button" @click="likePost" :disabled="likingPost">
                                {{liked ? '取消点赞' : '点赞'}}
                            </button>
                            <button class="btn" type="button" @click="StarPost" :disabled="staringPost">
                                {{favored ? '取消收藏' : '收藏'}}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="comments">
                <!-- ✅ 回复提示条 -->
                <div v-if="replyTarget" class="replying">
                    正在回复：{{ replyTarget.author }}
                    <button class="link" type="button" @click="cancelReply">取消</button>
                </div>

                <!-- ✅ 给 textarea 加 ref,startReply 会 focus -->
                <textarea ref="commentInput" class="post-comment" v-model="mycomment" placeholder="请输入评论内容...">
                </textarea>

                <button class="btn" type="button" @click="submitComment" :disabled="submitting">
                    提交评论
                </button>

                <div v-if="commentsLoading">加载评论中...</div>
                <div v-else-if="commentError" class="err">{{ commentError }}</div>
                <div v-else>
                    <div class="comment" v-for="c in comments" :key="c.id">
                    
                        <div class="comment_foot_left">
                            <div class="comment-author">
                                {{c.author}}
                            </div>
                            <div class="comment-content">
                                {{c.content}}
                            </div>
                            <div class="stats">
                                <span class="small-info">点赞数 {{ c.likes_count }}</span>
                                <span class="small-info">回复数 {{ c.reply_count }}</span>
                            </div>
                        </div>
                        <div class="comment_foot_right">

                            <button class="btn" type="button" @click="likeComment(c.id)">
                                点赞
                            </button>

                            <div class="reply-to-comment">
                                <!-- ✅ A评论 回复创建B入口 -->
                                <button class="btn" type="button" @click="startReply(c)">
                                    回复
                                </button>

                                <!-- ✅ A评论 查看回复 -->
                                <button
                                    v-if="Number(c.reply_count) > 0"
                                    class="btn"
                                    type="button"
                                    @click="openThread(c.id)"
                                >
                                    查看回复({{ c.reply_count }})
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section class ="right">
            <div class ="sidecard">
                <div class="sidetitle">相关主题</div>

                <div v-if="relatedLoading" class="muted">加载中...</div>
                <div v-else-if="relatedError" class="err">{{ relatedError }}</div>
                <div v-else-if="relatedPosts.length === 0" class="muted">暂无相关推荐</div>

                <div v-else class="related-list">
                    <div v-for="p in relatedPosts" :key="p.id" class="related-item" @click="goRelated(p.id)" title="点击查看">
                        <div class="r-title">{{ p.title }}</div>

                        <div class="r-meta">
                            <span>{{ p.author }}</span>
                            <span>·</span>
                            <span>👍 {{ p.likes_count }}</span>
                            <span>·</span>
                            <span>💬 {{ p.replies_count }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>


<script>
    import { apiFetch } from '../../api/http'

    export default { 
        name: 'PostDetail' ,
        data(){
            return {
                mycomment:'',
                loading:true,
                error:'',
                post:null,

                comments:[],
                commentsLoading:false,
                commentError:'',

                submitting: false,

                likingPost: false,
                liked: false,

                staringPost: false,
                favored: false,

                replyTarget: null,    // {id,author} | null

                relatedPosts: [],
                relatedLoading: false,
                relatedError: ''
            }
        },
        computed: {
            // 计算属性：返回当前路由的 id(访问时用 this.id,不用 this.id())
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
        methods:{
            formatTime(v) {
                if(!v) return ''
                const d= new Date(v)
                if(Number.isNaN(d.getTime())) return String(v)
                return d.toLocaleString()
            },
            async load(){
                this.loading=true
                this.error=''
                this.post=null
                try{
                    const post_data = await apiFetch(`/api/post/${this.id}`)
                    this.post = post_data.post
                    this.favored = Boolean(this.post?.is_favorited)

                     await Promise.all([
                        this.loadComments(),
                        this.loadRelated()
                    ])
                }catch(e){
                    this.error = e.message || '加载帖子失败'
                }finally{
                    this.loading = false
                }
            },
            async loadRelated() {
                this.relatedLoading = true
                this.relatedError = ''
                this.relatedPosts = []
                try{
                    const data = await apiFetch(`/api/post/${this.id}/related?limit=6`)
                    this.relatedPosts = data.posts || []
                }catch(e){
                    this.relatedError = e.message || '加载相关帖子失败'
                }finally{
                    this.relatedLoading = false
                }
            },
            goRelated(postId) {
                this.$router.push(`/post/${postId}`)
            },
            async loadComments() {
                this.commentsLoading = true
                this.commentError = ''
                this.comments = []
                try {
                    const comments_data = await apiFetch(`/api/comment/${this.id}`)
                    this.comments = comments_data.comments || []
                } catch (e) {
                    this.commentError = e.message || '加载评论失败'
                } finally {
                    this.commentsLoading = false
                }
            },
            async likeComment(commentId){
                if(!commentId) {
                    alert('评论ID无效(可能是刚插入的临时数据)')
                    return
                }
                try{
                    await apiFetch(`/api/comment/like/${commentId}`, { method: 'POST' })
                    const hit = this.comments.find(x => x.id === commentId)
                    if(hit) hit.likes_count = (Number(hit.likes_count) || 0) + 1
                } catch(e){
                    alert(e.message || '点赞评论失败')
                }
            },
            async likePost(){
                if(!this.post) return
                this.likingPost =true
                try{
                    if(!this.liked) {
                        await apiFetch(`/api/post/like/${this.post.id}`, { method: 'POST' })
                        this.post.likes_count = (Number(this.post.likes_count) || 0) + 1
                        this.liked = true
                    } else{
                        await apiFetch(`/api/post/like/${this.post.id}`, { method: 'DELETE' })
                        this.post.likes_count = Math.max((Number(this.post.likes_count) || 0) - 1, 0)
                        this.liked = false
                    }
                } catch(e){
                    alert(e.message || '点赞失败')
                } finally {
                    this.likingPost = false
                }
            },
            async StarPost(){
                if(!this.post) return;
                this.staringPost = true;
                try{
                    if(!this.favored){
                        await apiFetch(`/api/post/${this.post.id}/favorite`, { method: 'POST' })
                        this.favored = true;
                        this.post.favorites_count = (Number(this.post.favorites_count) || 0) + 1
                    } else{
                        await apiFetch(`api/post/${this.post.id}/favorite`,{method:'DELETE'})
                        this.favored = false
                        this.post.favorites_count = Math.max((Number(this.post.favorites_count) || 0) - 1, 0)
                    }
                } catch(e) {
                    alert(e.message || '收藏操作失败')
                } finally {
                    this.staringPost = false;
                }
            },
            startReply(c) {  // ✅ 点“回复”按钮：进入回复模式，记录目标评论 id/作者
                this.replyTarget = { id: c.id, author: c.author }

                // ✅ 给输入框预填 @某人（纯文本提示，没有特殊语法含义）
                this.mycomment = `@${c.author} `

                // ✅ 等 DOM 更新后，让输入框获得焦点
                this.$nextTick(() => {
                    const el = this.$refs.commentInput
                    if (el && el.focus) el.focus()
                })
            },
            cancelReply(){
                this.replyTarget = null
            },
            openThread(aId) {
                this.$router.push(`/comment/thread/${aId}`)
            },
            async submitComment() {
                const content = (this.mycomment || '').trim()
                if (!content) return alert('评论内容不能为空')

                this.submitting = true
                try {
                    const body = { content }
                    if (this.replyTarget?.id) body.parent_comment_id = this.replyTarget.id

                    const data = await apiFetch(`/api/comment/${this.id}`, {
                        method: 'POST',
                        body
                    })

                    // 创建 A 直接 push;创建 B 不在帖子页显示 只在详情页看
                    if (!this.replyTarget?.id) {
                        this.comments.push({
                            id: data.id,
                            author: (this.post && this.post.author) ? this.post.author : '我',
                            content,
                            likes_count: 0,
                            reply_count: 0,
                            created_at: new Date().toISOString()
                        })
                        if (this.post) this.post.replies_count = (Number(this.post.replies_count) || 0) + 1
                    } else {
                        await this.loadComments()
                    }

                    this.mycomment = ''
                    this.replyTarget = null
                } catch (e) {
                    alert(e.message || '提交评论失败')
                } finally {
                    this.submitting = false
                }
            }
        }
    }
</script>


<style scoped>

    /* 全局背景 + 樱花画布 */
    .content {
        width: 100%;
        min-height: 100vh;
        padding: 20px;
        display: flex;
        gap: 2%;
    }
    /* 左右双栏布局 */
    .content {
        display: grid;
        grid-template-columns: 70% 28%;
    }
    .left {
        display: flex;
        flex-direction: column;
        gap: 25px;
        position: relative;
        z-index: 1;
    }
    .right {
        position: relative;
        z-index: 1;
    }

    /* 帖子主体卡片 毛玻璃二次元 */
    .post {
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(12px);
        border-radius: 20px;
        padding: 30px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.15);
        transition: all 0.3s ease;
    }
    .post:hover {
        transform: translateY(-5px);
        box-shadow: 0 12px 40px rgba(255, 154, 158, 0.2);
    }

    /* 作者信息 */
    .personal-info {
        font-size: 18px;
        font-weight: bold;
        color: #fbc2eb;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    /* 帖子标题+内容 */
    .post-content {
        margin-bottom: 25px;
        line-height: 1.8;
        font-size: 17px;
        color: rgba(212, 199, 199, 0.95);
    }
    .post_title {
        font-size: 22px;
        font-weight: 600;
        margin-bottom: 15px;
        background: linear-gradient(45deg, #ff9a9e, #fad0c4, #fbc2eb);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    /* 帖子底部信息 */
    .post-info {
        padding-top: 15px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        flex-direction:row;
        justify-content: space-between;
        gap: 15px;
    }
    .post_foot_message_right{
        display: flex;
        gap: 10px;
        flex-direction: column;
    }
    .stats {
        display: flex;
        gap: 25px;
        font-size: 15px;
        color: rgba(3, 0, 0, 0.8);
        margin-top: 20px;
    }

    /* 通用按钮 二次元渐变霓虹 */
    .btn {
        padding: 10px 25px;
        color: rgba(191, 166, 166, 0.9);
        font-size: 15px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(103, 98, 98, 0.4);
        border: 1px solid rgba(220, 191, 191, 0.5);
        background: rgba(179, 174, 174, 0.12);
        color: rgba(191, 166, 166, 0.9);
        border-radius: 25px;
        cursor: pointer;
    }
    .btn:hover:not(:disabled) {
        transform: translateY(-3px);
        box-shadow: 0 6px 20px rgba(226, 168, 170, 0.6);
    }
    .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
    }

    /* 评论区域卡片 */
    .comments {
    
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(12px);
        border-radius: 20px;
        padding: 30px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.15);
    }

    /* 回复提示条 */
    .replying {
        background: rgba(255, 154, 158, 0.2);
        padding: 10px 15px;
        border-radius: 12px;
        margin-bottom: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .link {
        color: #ffc2d1;
        background: none;
        border: none;
        cursor: pointer;
    }

    /* 评论输入框 */
    .post-comment {
        width: 100%;
        min-height: 120px;
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 15px;
        padding: 15px;
        color: #fff;
        font-size: 15px;
        resize: vertical;
        outline: none;
        margin-bottom: 15px;
        transition: all 0.3s;
    }
    .post-comment:focus {
        border-color: #ff9a9e;
        box-shadow: 0 0 15px rgba(255, 154, 158, 0.3);
    }

    /* 单条评论：左右两块，空间不够时允许换行 */
    .comment {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 14px;

        padding: 15px;
        margin-top: 15px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.05);

        flex-wrap: wrap; /* ✅ 关键：窄屏不够就换行，避免挤成一条 */
    }

    /* 左侧信息：占满剩余空间 */
    .comment_foot_left {
        flex: 1 1 420px;   /* ✅ 有空间就扩展，没空间就缩 */
        min-width: 240px;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    /* 右侧按钮：独立一列，靠右，允许内部按钮换行 */
    .comment_foot_right {
        flex: 0 0 auto;
        display: flex;
        flex-direction: column; /* ✅ 右侧按钮竖排，更像“右边是按钮区” */
        gap: 10px;
        align-items: flex-end;
        margin-left: auto;
        margin-top: 50px;
    }

    .comment .btn{
        padding: 8px 14px;
        font-size: 14px;
    }
    .comment-author {
        font-weight: 600;
        color: #fbc2eb;
        margin-bottom: 8px;
    }
    .comment-content {
        color: rgba(212, 170, 194, 0.95);
        line-height: 1.7;
        margin-bottom: 10px;
    }

    .reply-to-comment {
        display: flex;
        flex-direction: row;
        gap: 10px;
        flex-wrap: wrap; /* 回复按钮多了也不怕，自动换行 */
    }

    /*点赞数等底部小字*/

    .small-info {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
    }


    /* 右侧侧边栏卡片 */
    .sidecard {
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(12px);
        border-radius: 20px;
        padding: 25px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .sidetitle {
        font-size: 20px;
        margin-bottom: 20px;
        background: linear-gradient(45deg, #ff9a9e, #fbc2eb);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    /* 相关帖子列表 */
    .related-item {
        padding: 12px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.05);
        margin-bottom: 10px;
        cursor: pointer;
        transition: all 0.3s;
    }
    .related-item:hover {
        background: rgba(255, 154, 158, 0.15);
        transform: translateX(5px);
    }
    .r-title {
        margin-bottom: 6px;
        font-weight: 500;
    }
    .r-meta {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.6);
        display: flex;
        gap: 6px;
    }

    .muted {
        color: rgba(255, 255, 255, 0.5);
    }
    .err{
        color: #ff7878
    }
    /*响应式适配手机*/
    @media (max-width: 768px) {
    .content {
        grid-template-columns: 100%;
    }
    }
</style>