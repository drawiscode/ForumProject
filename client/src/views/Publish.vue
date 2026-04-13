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
        width: 60%;

        display: flex; 
        flex-direction: column; 
        padding: 12px; 
        border-radius: 15px; 
        background: rgba(165, 165, 165, 0.25); 

        font-style:italic;
    }

    .fatie{
        font-size: 24px; 
        font-weight: bold; 
        color:rgb(82, 82, 82);
        margin-bottom: 12px;
    }

    .title{
        font-size: 18px; 
        font-weight: 500; 
        color:rgb(82, 82, 82);

        margin-bottom: 10px;
    }

    .form{ 
        display: flex; 
        flex-direction: column;
        margin-bottom: 12px;
    }


    .label{ 
        display:; 
        gap: 6px; 
    }

    .input{ 
        width:20%;
        min-height: 32px;

        margin-bottom: 25px;
        border-radius: 12px;
    }

    .input_ta{ 
        min-height: 250px; 
        resize: vertical; 
        width:70%;

        margin-bottom: 25px;
        border-radius: 12px;
    }

    .input::placeholder,
    .input_ta::placeholder {
    color: rgba(55, 55, 55, 0.9); 
    font-size: 13px;      
    font-style: italic;
    font-weight: 500;

    opacity: 1;          
    }

    .btn{
        width: 20%;

        padding: 10px 16px; 
        border-radius: 2px; 

        font-size: 16px; 
        font-weight: 400; 
        font-style: italic;
        border-radius: 12px;
    }

    .error{ margin:0; color:#ff9dbf; }
    .ok{ margin:0; color:#b8ffcf; }
</style>