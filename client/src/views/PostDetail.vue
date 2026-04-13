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
                <div class ="post-info">
                    <div v-if="loading">加载中...</div>
                    <div v-else-if="error">{{error}} </div>
                    <div v-else>
                        <div>{{ post.category }}</div>
                        <div>{{ formatTime(post.created_at) }}</div>

                        <div class="stats">
                        <span>👍 {{ post.likes_count }}</span>
                        <span>💬 {{ post.replies_count }}</span>
                        <span>👀 {{ post.views_count }}</span>
                        <span>⭐ {{ post.favorites_count }}</span>
                        </div>

                        <button class="btn" type="button" @click="likePost" :disabled="likingPost">
                            给帖子点赞
                        </button>
                    </div>
                </div>
            </div>




            <div class="comments">
                <!-- ✅ 回复提示条 -->
                <div v-if="replyTarget" class="replying">
                    正在回复：{{ replyTarget.author }}
                    <button class="link" type="button" @click="cancelReply">取消</button>
                </div>

                <!-- ✅ 给 textarea 加 ref，startReply 会 focus -->
                <textarea
                    ref="commentInput"
                    class="post-comment"
                    v-model="mycomment"
                    placeholder="请输入评论内容..."
                ></textarea>

                <button class="btn" type="button" @click="submitComment" :disabled="submitting">
                    提交评论
                </button>

                <div v-if="commentsLoading">加载评论中...</div>
                <div v-else-if="commentError" class="err">{{ commentError }}</div>
                <div v-else>
                    <div class="comment" v-for="c in comments" :key="c.id">
                        <div class="comment-author">
                            {{c.author}}
                        </div>
                        
                        <div class="comment-content">
                            {{c.content}}
                        </div>

                        <div class="comment-info">
                            <span>👍 {{ c.likes_count }}</span>
                            <button class="btn" type="button" @click="likeComment(c.id)">
                                给评论点赞
                            </button>

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
        </section>

        <section class ="right">

        </section>
    </div>
</template>


<script>
    import { apiFetch } from '../api/http'

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

                replyTarget: null,    // {id,author} | null
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
                    await this.loadComments()
                }catch(e){
                    this.error = e.message || '加载帖子失败'
                }finally{
                    this.loading = false
                }
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
                    await apiFetch(`/api/post/like/${this.post.id}`, { method: 'POST' })
                    this.post.likes_count = (Number(this.post.likes_count) || 0) + 1
                } catch(e){
                    alert(e.message || '点赞失败')
                }finally{
                    this.likeingPost = false
                }
            },
            startReply(comment){
                this.replyTarget = { id:c.id,author:c.author }
                this.mycomment = '@${c.author} '
                this.$nextTick(() => {
                    const el = this.$refs.commentInput
                    if(el && el.focus) el.focus()
                })
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

    .replying {
        margin-bottom: 10px;
        padding: 10px 12px;
        border-radius: 14px;
        background: rgba(0, 0, 0, 0.06);
    }
    .link {
        border: 0;
        background: transparent;
        cursor: pointer;
        color: #0b57d0;
        padding: 0 6px;
    }
    .btn {
        background-color:rgb(205, 205, 205);
        color: white;
        padding: 10px 20px;
        width: 100px;
        border-radius: 20px;
        margin: 0 0 20px 0;
        cursor: pointer;
    }
    .comments {
        display: flex;
        flex-direction: column;
        margin-top: 20px;
    }
    .post-comment {
        background-color: #c0c0c0;
        padding: 15px;
        height: 30vh;
        width: 50%;
        border-radius: 26px;
        margin: 0 300px 20px 0;
        
    }

    .comment {
        background-color: #d0d0d0;
        padding: 15px;
        border-radius: 26px;
        margin-bottom: 10px;
    }

    .personal-info {
        background-color: #d0d0d0;
        padding: 15px;
        border-radius: 26px;
        margin-bottom: 20px;
    }
    .post-content {
        background-color: #c0c0c0;
        height: 50vh;
        border-radius: 20px;
        padding: 15px 15px 15px 15px;
    }
    .post-info {
        background-color: #d0d0d0;
        padding: 15px;
        border-radius: 26px;
        margin: 20px 0 20px 0;
    }

    .content {
        display: flex;
        gap: 20px;
      
    }

    .left {
        display: flex;
        flex-direction: column;

        flex: 3;
        background-color: #f0f0f0;
        padding: 20px;
        border-radius: 26px;
        margin: 0 100px 0 150px;

         /* 左侧内容区，宽度较大 */
    }
    .right {
        flex: 1;
        background-color: #e0e0e0;
        padding: 20px;
        border-radius: 26px;
        height: 50%;
         /* 固定高度，允许内部滚动 */
    }

</style>