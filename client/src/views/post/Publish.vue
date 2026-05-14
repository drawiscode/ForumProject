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
                     
                    <option value="情感天地">情感天地</option>
                    <option value="网络科技">网络科技</option>
                    <option value="娱乐八卦">娱乐八卦</option>
                </select>
            </div>

            <div class="label">
                <div class="title">内容</div>
                <div class="editorWrap">
                    <div class="toolbar">
                        <button class="toolBtn" type="button" @click="toggleBold" :class="{ on: isActive('bold') }">B</button>
                        <button class="toolBtn" type="button" @click="toggleItalic" :class="{ on: isActive('italic') }">I</button>
                        <button class="toolBtn" type="button" @click="toggleUnderline" :class="{ on: isActive('underline') }">U</button>
                        <button class="toolBtn" type="button" @click="toggleStrike" :class="{ on: isActive('strike') }">S</button>
                        <span class="toolSep"></span>
                        <button class="toolBtn" type="button" @click="toggleBlockquote">引用</button>
                        <button class="toolBtn" type="button" @click="toggleBulletList">无序</button>
                        <button class="toolBtn" type="button" @click="toggleOrderedList">有序</button>
                        <button class="toolBtn" type="button" @click="toggleCodeBlock">代码</button>
                        <span class="toolSep"></span>
                        <button class="toolBtn" type="button" @click="insertLink">链接</button>
                        <button class="toolBtn" type="button" @click="insertMention">@用户</button>
                        <button class="toolBtn" type="button" @click="insertEmoji">表情</button>
                        <button class="toolBtn" type="button" @click="triggerUpload">插图</button>
                    </div>
                    <div class="editorDrop" @dragover.prevent @drop.prevent="onDrop">
                        <EditorContent class="editor" :editor="editor" />
                    </div>
                </div>
                <input ref="fileInput" class="hiddenInput" type="file" multiple accept="image/*" @change="onFilePick" />
                <div v-if="uploads.length" class="uploadList">
                    <div v-for="u in uploads" :key="u.id" class="uploadItem">
                        <div class="uName">{{ u.name }}</div>
                        <div class="uBar">
                            <div class="uFill" :style="{ width: u.progress + '%' }"></div>
                        </div>
                        <div class="uState" :class="u.status">
                            <span v-if="u.status === 'uploading'">上传中</span>
                            <span v-else-if="u.status === 'done'">完成</span>
                            <span v-else>失败</span>
                        </div>
                        <button v-if="u.status === 'error'" class="retryBtn" type="button" @click="retryUpload(u)">重试</button>
                    </div>
                </div>
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

import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { apiFetch } from '../../api/http'

export default { 
    name: 'Publish',
    components: { EditorContent },
    data() {
        return {
            form: { title: '' ,content: '' , category: ''},
            loading: false,
            error: '',
            okMsg: '',
            editor: null,
            emojis: ['😀','😄','🤣','😊','😍','😎','🥺','😭','😡','👍','🙏','🎉','❤️','🌸'],
            uploads: []
        }
    },
    mounted() {
        this.editor = new Editor({
            extensions: [
                StarterKit.configure({
                    codeBlock: true,
                    blockquote: true,
                    bulletList: true,
                    orderedList: true
                }),
                Image,
                Underline,
                Link.configure({ openOnClick: false }),
                Placeholder.configure({ placeholder: '请输入内容(必填)' })
            ],
            content: '',
            onUpdate: ({ editor }) => {
                this.form.content = editor.getHTML()
            }
        })

        const dom = this.editor?.view?.dom
        if (dom) {
            dom.addEventListener('paste', this.onPaste)
        }
    },
    beforeUnmount() {
        const dom = this.editor?.view?.dom
        if (dom) {
            dom.removeEventListener('paste', this.onPaste)
        }
        if (this.editor) this.editor.destroy()
        this.editor = null
    },
    methods:{
        validate() {
            if (!this.form.title) return '请输入标题'
            const text = this.editor ? this.editor.getText().trim() : ''
            if (!text) return '请输入内容'
            if (!this.form.category) return '请选择分类'
            return ''
        },
        isActive(name) {
            return this.editor ? this.editor.isActive(name) : false
        },
        toggleBold() { this.editor?.chain().focus().toggleBold().run() },
        toggleItalic() { this.editor?.chain().focus().toggleItalic().run() },
        toggleUnderline() { this.editor?.chain().focus().toggleUnderline().run() },
        toggleStrike() { this.editor?.chain().focus().toggleStrike().run() },
        toggleBlockquote() { this.editor?.chain().focus().toggleBlockquote().run() },
        toggleBulletList() { this.editor?.chain().focus().toggleBulletList().run() },
        toggleOrderedList() { this.editor?.chain().focus().toggleOrderedList().run() },
        toggleCodeBlock() { this.editor?.chain().focus().toggleCodeBlock().run() },
        insertLink() {
            const url = window.prompt('请输入链接地址')
            if (!url || !this.editor) return
            this.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
        },
        insertMention() {
            const name = window.prompt('输入用户名')
            if (!name || !this.editor) return
            this.editor.chain().focus().insertContent(`@${name} `).run()
        },
        insertEmoji() {
            if (!this.editor) return
            const emoji = this.emojis[Math.floor(Math.random() * this.emojis.length)]
            this.editor.chain().focus().insertContent(`${emoji} `).run()
        },
        triggerUpload() {
            this.$refs.fileInput?.click()
        },
        onFilePick(e) {
            const files = Array.from(e.target.files || [])
            this.handleFiles(files)
            e.target.value = ''
        },
        onDrop(e) {
            const files = Array.from(e.dataTransfer?.files || [])
            this.handleFiles(files)
        },
        onPaste(e) {
            const items = Array.from(e.clipboardData?.items || [])
            const files = items
                .filter((i) => i.kind === 'file' && i.type.startsWith('image/'))
                .map((i) => i.getAsFile())
                .filter(Boolean)
            if (files.length) {
                e.preventDefault()
                this.handleFiles(files)
            }
        },
        async handleFiles(files) {
            const list = files.filter((f) => f && f.type && f.type.startsWith('image/'))
            if (!list.length) return

            for (const file of list) {
                const item = {
                    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
                    name: file.name,
                    progress: 0,
                    status: 'uploading',
                    file
                }
                this.uploads.unshift(item)

                try {
                    const compressed = await this.compressImage(file)
                    const url = await this.uploadImage(compressed, (p) => {
                        item.progress = p
                    })
                    item.status = 'done'
                    item.progress = 100
                    if (this.editor) {
                        this.editor.chain().focus().setImage({ src: url }).run()
                    }
                } catch (err) {
                    item.status = 'error'
                    item.error = err?.message || '上传失败'
                }
            }
        },
        async retryUpload(item) {
            if (!item?.file) return
            item.status = 'uploading'
            item.progress = 0
            try {
                const compressed = await this.compressImage(item.file)
                const url = await this.uploadImage(compressed, (p) => {
                    item.progress = p
                })
                item.status = 'done'
                item.progress = 100
                if (this.editor) {
                    this.editor.chain().focus().setImage({ src: url }).run()
                }
            } catch (err) {
                item.status = 'error'
                item.error = err?.message || '上传失败'
            }
        },
        async compressImage(file) {
            // 和评论插图逻辑对齐：默认压缩，但对小图直接跳过（更快）。
            // GIF 跳过压缩，避免动画丢失。
            if (file?.type === 'image/gif') return file

            const maxSizeMB = 1.5
            const maxSide = 1600

            // 小图直传：避免 canvas 解码/重编码带来的耗时
            if (file?.size && file.size <= 400 * 1024) {
                return file
            }

            const img = await this.loadImage(file)
            const ratio = Math.min(maxSide / img.width, maxSide / img.height, 1)
            const w = Math.round(img.width * ratio)
            const h = Math.round(img.height * ratio)

            const canvas = document.createElement('canvas')
            canvas.width = w
            canvas.height = h
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, w, h)

            let quality = 0.85
            let blob = await this.canvasToBlob(canvas, quality)
            while (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.5) {
                quality -= 0.1
                blob = await this.canvasToBlob(canvas, quality)
            }

            return new File([blob], file.name.replace(/\.(png|jpg|jpeg|webp|gif)$/i, '.jpg'), {
                type: blob.type
            })
        },
        loadImage(file) {
            return new Promise((resolve, reject) => {
                const url = URL.createObjectURL(file)
                const img = new Image()
                img.onload = () => {
                    URL.revokeObjectURL(url)
                    resolve(img)
                }
                img.onerror = (e) => {
                    URL.revokeObjectURL(url)
                    reject(e)
                }
                img.src = url
            })
        },
        canvasToBlob(canvas, quality) {
            return new Promise((resolve) => {
                canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
            })
        },
        uploadImage(file, onProgress) {
            // 改成和评论插图一样：用 apiFetch + FormData（无上传进度事件，整体更简单）
            return (async () => {
                if (typeof onProgress === 'function') onProgress(0)

                const form = new FormData()
                form.append('images', file)

                const data = await apiFetch('/api/upload/images', { method: 'POST', body: form })
                const url = data?.urls?.[0]
                if (!url) throw new Error('上传失败')

                if (typeof onProgress === 'function') onProgress(100)
                return url
            })()
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
    .card {
        width: min(900px, 96%);
        margin: 18px auto 0;
        display: flex;
        flex-direction: column;
        padding: 24px 20px;
        border-radius: 26px;
        background: rgba(255, 247, 247, 0.96);
        border: 1px solid rgba(255, 79, 136, 0.22);
        box-shadow: 0 18px 54px rgba(255, 79, 136, 0.12);
        color: rgba(46, 42, 51, 0.92);
        font-style: normal;
    }

    .fatie {
        font-size: 24px;
        font-weight: 950;
        margin-bottom: 18px;
        background: linear-gradient(135deg, #fc6e6e, #e97878, #d091a7);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    .title {
        font-size: 16px;
        font-weight: 900;
        margin-bottom: 8px;
        color: rgba(252, 124, 165, 0.95);
    }

    .form { display: flex; flex-direction: column; gap: 16px; margin-bottom: 12px; }

    .label {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .input {
        border: 1px solid rgba(255, 79, 136, 0.18);
        background: #fff;
        color: rgba(46, 42, 51, 0.92);
        border-radius: 16px;
        padding: 10px 12px;
        outline: none;
        font-size: 15px;
        font-weight: 700;
    }
    .input:focus-visible,
    select.input:focus-visible {
        border-color: rgba(255, 79, 136, 0.4);
        box-shadow: 0 0 0 4px rgba(255, 79, 136, 0.08);
    }

    .input { width: 280px; max-width: 100%; min-height: 40px; }

    .input::placeholder {
        color: rgba(123, 106, 120, 0.65);
        font-size: 13px;
        font-style: italic;
        font-weight: 500;
        opacity: 1;
    }
    .editorWrap{
        border: 1px solid rgba(255, 79, 136, 0.18);
        background: #fff;
        border-radius: 16px;
        overflow: hidden;
    }
    .toolbar{
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 10px;
        border-bottom: 1px solid rgba(255, 79, 136, 0.12);
        background: rgba(255, 107, 158, 0.06);
    }
    .toolBtn{
        border: 1px solid rgba(255, 79, 136, 0.18);
        background: #fff;
        color: rgba(46, 42, 51, 0.9);
        border-radius: 10px;
        padding: 6px 10px;
        font-weight: 900;
        cursor: pointer;
        font-size: 12px;
    }
    .toolBtn.on{
        background: linear-gradient(135deg, rgba(255, 79, 136, 0.95), rgba(255, 107, 158, 0.95));
        color: #fff;
        border-color: transparent;
    }
    .toolSep{
        width: 1px;
        background: rgba(255, 79, 136, 0.18);
        margin: 0 4px;
    }
    .editor{
        min-height: 220px;
        padding: 12px;
        font-size: 15px;
        color: rgba(46, 42, 51, 0.92);
    }
    .editor :deep(p){ margin: 6px 0; }
    .editor :deep(blockquote){
        margin: 8px 0;
        padding: 6px 12px;
        border-left: 3px solid rgba(255, 79, 136, 0.6);
        background: rgba(255, 107, 158, 0.06);
        color: rgba(46, 42, 51, 0.85);
    }
    .editor :deep(pre){
        background: rgba(255, 107, 158, 0.08);
        padding: 10px 12px;
        border-radius: 12px;
        overflow: auto;
    }
    .editor :deep(code){ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }

    .editorDrop{
        min-height: 220px;
    }
    .hiddenInput{ display: none; }
    .uploadList{
        margin-top: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .uploadItem{
        display: grid;
        grid-template-columns: 1fr 160px 60px 60px;
        gap: 8px;
        align-items: center;
        font-size: 12px;
        color: rgba(46, 42, 51, 0.88);
    }
    .uName{ white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .uBar{
        height: 6px;
        background: rgba(255, 107, 158, 0.12);
        border-radius: 999px;
        overflow: hidden;
        border: 1px solid rgba(255, 79, 136, 0.18);
    }
    .uFill{
        height: 100%;
        background: linear-gradient(135deg, rgba(255, 79, 136, 0.95), rgba(255, 107, 158, 0.95));
    }
    .uState{ font-weight: 800; color: rgba(123, 106, 120, 0.85); }
    .uState.done{ color: #1bc47d; }
    .uState.error{ color: #ff3b77; }
    .retryBtn{
        border: 1px solid rgba(255, 79, 136, 0.18);
        background: #fff;
        border-radius: 999px;
        padding: 4px 8px;
        font-weight: 900;
        cursor: pointer;
        color: rgba(255, 79, 136, 0.95);
    }

    /* 下拉框样式 */
    select.input {
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        background-color: #fff;
        color: rgba(46, 42, 51, 0.92);
    }
    select.input option {
        background-color: #fff;
        color: rgba(46, 42, 51, 0.92);
    }
    select.input option:disabled {
        color: rgba(123, 106, 120, 0.55);
    }

    .btn {
        width: 160px;
        padding: 10px 16px;
        border-radius: 999px;
        border: none;
        cursor: pointer;
        color: #fff;
        background: linear-gradient(135deg, rgba(251, 138, 174, 0.95), rgba(246, 128, 169, 0.95));
        box-shadow: 0 10px 20px rgba(255, 79, 136, 0.14);
        font-weight: 900;
        font-size: 15px;
        transition: transform .18s ease, filter .18s ease;
    }
    .btn:hover {
        transform: translateY(-1px);
        filter: brightness(1.02);
    }

    .error { margin: 0; color: #e45882; font-weight: 800; }
    .ok { margin: 0; color: #1bc47d; font-weight: 800; }
</style>