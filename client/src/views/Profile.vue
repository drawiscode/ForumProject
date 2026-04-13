<template>
    <section class="card">
        <h2>个人信息</h2>
        
        <div v-if="loading"> 加载中...</div>
        <div v-else-if="error" class="error">{{ error }}</div>

        <div v-else class="box">
            <p><strong>ID:</strong>{{me.id}}</p>
            <p><strong>用户名:</strong>{{me.username}}</p>
            <p><strong>角色:</strong>{{me.role}}</p>
            <p><strong>注册时间:</strong>{{me.created_at}}</p>

          <div class="avatar">
            <div class="circle">{{ (me.username || '?').slice(0, 1).toUpperCase() }}</div>
            <div class="tip">头像占位（后续可改成上传/选头像）</div>
          </div>

        </div>
    </section>

</template>

<script>
import {apiFetch} from '../api/http'

export default {
    name: 'Profile',
    data() {
        return {
            loading: true,
            error: '',
            me:null
        }
    },
    async mounted() {
        try {
            const data = await apiFetch('/api/user/me')
            this.me = data.user
        } catch (err) {
            this.error = err.message || '获取个人信息失败'
        }finally{
            this.loading = false
        }
    }
}

</script>

<style scoped>
.error{ color: #ff9dbf; }
.box{ display:grid; gap: 6px; }
.avatar{ margin-top: 14px; display:flex; align-items:center; gap: 12px; }
.circle{
  width: 56px; height: 56px; border-radius: 999px;
  display:flex; align-items:center; justify-content:center;
  background: linear-gradient(90deg, rgba(255,107,203,0.9), rgba(122,92,255,0.9));
  box-shadow: 0 10px 24px rgba(0,0,0,0.35);
  font-weight: 800;
}
.tip{ opacity: .85; font-size: 13px; }
</style>