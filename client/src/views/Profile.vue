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
                <img v-if="me.avatar_url" class="avatar-img" :src="me.avatar_url" alt="avatar" />
                <div v-else class="circle">{{ (me.username || '?').slice(0, 1).toUpperCase() }}</div>

                <div class="tip">
                  <div>当前头像</div>
                  <div class="muted">可在右上角头像菜单上传/更换</div>
                </div>
            </div>

             <!--新增:快捷入口 -->
            <div class="quick">
              <button class="btn ghost" type="button" @click="$router.push('/me/following')">
                我的关注
              </button>
              
              <button class="btn ghost" type="button" @click="$router.push('/me/fans')">
                我的粉丝
              </button>
              
              <button class="btn ghost" type="button" @click="$router.push('/my-posts')">
                我的发贴
              </button>
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
  
  .quick{
    margin-top: 14px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .btn{
    border: 0;
    padding: 10px 14px;
    border-radius: 999px;
    cursor: pointer;
    color: #fff;
    background: linear-gradient(45deg, #ff9a9e, #fad0c4);
    box-shadow: 0 10px 24px rgba(255,154,158,0.18);
  }
  .btn.ghost{
    background: rgba(255,255,255,0.10);
    border: 1px solid rgba(255,255,255,0.16);
    box-shadow: none;
  }

  .avatar { margin-top: 14px; display: flex; align-items: center; gap: 12px; }

  .avatar-img{
    width: 56px;
    height: 56px;
    border-radius: 999px;
    object-fit: cover;
    border: 2px solid rgba(255,255,255,0.35);
    box-shadow: 0 10px 24px rgba(0,0,0,0.35);
  }

  .tip{ opacity: .85; font-size: 13px; display:flex; flex-direction: column; gap: 2px; }
  .muted{ font-size: 12px; opacity: .7; }
  .card {
    width: min(760px, 96%);
    margin: 18px auto 0;
    padding: 18px 16px;
    border-radius: 20px;

    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

    color: rgba(255, 255, 255, 0.9);
  }

  h2 {
    margin-bottom: 12px;
    background: linear-gradient(45deg, #ff9a9e, #fbc2eb);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .error { color: #ff9dbf; }
  .box { display: grid; gap: 6px; }

  .avatar { margin-top: 14px; display: flex; align-items: center; gap: 12px; }
  .circle{
    width: 56px; height: 56px; border-radius: 999px;
    display:flex; align-items:center; justify-content:center;
    background: linear-gradient(45deg, rgba(255,154,158,0.9), rgba(251,194,235,0.9));
    box-shadow: 0 10px 24px rgba(0,0,0,0.35);
    font-weight: 800;
    color: rgba(20,20,20,0.75);
  }
  .tip{ opacity: .85; font-size: 13px; }
</style>