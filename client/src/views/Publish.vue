<template>
    <div class="card">
        <div class="fatie">发帖</div>
        <form class="form" @submit.prevent="onSubmit">
            <div class="label">
                <div class="title">标题</div>
                <input class="input" v-model.trim="form.title" placeholder="请输入标题(必填)" />
            </div>

            <div class="label">
                <div class="title">分类</div>
                <select class="input" v-model="form.category">
                    <option disabled value="">请选择分类(必选)</option>
                    <option value="综合讨论">综合讨论</option>
                    <option value="学习交流">学习交流</option>
                    <option value="作品分享">作品分享</option>
                    <option value="求助问答">求助问答</option>
                </select>
            </div>

            <div class="label">
                <div class="title">内容</div>
                <textarea class="input_ta" v-model.trim="form.content" placeholder="请输入内容(必填)"></textarea>
            </div>

            <p v-if="error" class="error">{{ error }}</p>
            <p v-if="okMsg" class="ok">{{ okMsg }}</p>

            <button class="btn" type="submit" :disabled="loading">
                {{ loading ? '发布中...' : '发布' }}
            </button>
        </form>
    </div>
</template>

<script>

import { apiFetch } from '../api/http'

export default { 
    name: 'Publish',
    data() {
        return {
            form: { title: '' ,content: '' , category: ''},
            loading: false,
            error: '',
            okMsg: ''
        }
    },
    methods:{
        validate() {
            if (!this.form.title) return '请输入标题'
            if (!this.form.content) return '请输入内容'
            if (!this.form.category) return '请选择分类'
            return ''
        },    
        async onSubmit(){
            this.error = ''
            this.okMsg = ''
            const msg = this.validate()
            if (msg) {
                this.error = msg
                return
            }
            this.loading = true
            try{
                const data = await apiFetch('/api/post', {method: 'POST',body: this.form})
                this.okMsg = '发布成功,跳转详情...'

                console.log('发布成功', data)

                setTimeout(() => {
                    this.$router.push(`/post/${data.id}`)
                }, 400)
            }catch(e){
                console.error('发布失败', e)
                this.error = e.message || '发布失败'
            }finally{   
                this.loading = false
            }
        }
    }
}

</script>
<style scoped>
    .card{
        width: min(900px, 96%);
        margin: 18px auto 0;
        display: flex;
        flex-direction: column;
        padding: 18px 16px;
        border-radius: 20px;

        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

        color: rgba(255, 255, 255, 0.9);
        font-style: italic;
    }

    .fatie{
    font-size: 24px;
    font-weight: 800;
    margin-bottom: 12px;
    background: linear-gradient(45deg, #ff9a9e, #fbc2eb);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    }

    .title{
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 8px;
    color: rgba(255,255,255,0.85);
    }

    .form{ display:flex; flex-direction: column; gap: 14px; margin-bottom: 12px; }

    .label{
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .input,
    .input_ta{
        border: 1px solid rgba(255,255,255,0.18);
        background: rgba(0,0,0,0.18);
        color: rgba(255,255,255,0.92);
        border-radius: 14px;
        padding: 10px 12px;
        outline: none;
    }

    /* ✅ 下拉框：本体 */
    select.input{
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        background-color: rgba(0,0,0,0.22);
        color: rgba(255,255,255,0.92);
    }

    /* ✅ 下拉框：展开后的选项（多数浏览器可生效） */
    select.input option{
        background-color: rgb(18, 20, 34); /* 深色列表背景 */
        color: rgba(255,255,255,0.92);
    }

    /* ✅ 禁用提示项也做弱化 */
    select.input option:disabled{
        color: rgba(255,255,255,0.55);
    }


    /* ✅ 更推荐：键盘操作时才显示（不影响鼠标点击观感） */
    .input:focus-visible,
    .input_ta:focus-visible,
    select.input:focus-visible {
        border-color: rgba(255,154,158,0.62);
        box-shadow: 0 0 0 4px rgba(255,154,158,0.22);
    }

    
    .input{ width: 280px; max-width: 100%; min-height: 40px; }
    .input_ta{ width: 100%; min-height: 260px; resize: vertical; }

    .input::placeholder,
    .input_ta::placeholder {
        color: rgba(161, 160, 160, 0.6);
        font-size: 13px;
        font-style: italic;
        font-weight: 500;
        opacity: 1;
    }

    .btn{
    width: 160px;
    padding: 10px 16px;
    border-radius: 999px;
    border: none;
    cursor: pointer;
    color: #fff;
    background: linear-gradient(45deg, #ff9a9e, #fad0c4);
    box-shadow: 0 4px 15px rgba(255, 154, 158, 0.4);
    }

    .error{ margin:0; color:#ff9dbf; }
    .ok{ margin:0; color:#b8ffcf; }
</style>