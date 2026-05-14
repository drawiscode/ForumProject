<template>
    <section class="card">
        <h2>个人信息</h2>
        
        <div v-if="loading"> 加载中...</div>
        <div v-else-if="error" class="error">{{ error }}</div>

        <div v-else class="box">
            <p><strong>ID:</strong>{{me.id}}</p>
            <p><strong>用户名:</strong>{{me.username}}</p>
            <p><strong>角色:</strong>{{me.role}}</p>
          <p><strong>等级:</strong>Lv{{ me.level || 1 }}</p>
          <p><strong>积分:</strong>{{ me.points || 0 }}</p>
            <p><strong>注册时间:</strong>{{me.created_at}}</p>

            <div class="avatar">
                <img v-if="me.avatar_url" class="avatar-img" :src="me.avatar_url" alt="avatar" />
                <div v-else class="circle">{{ (me.username || '?').slice(0, 1).toUpperCase() }}</div>

                <div class="tip">
                  <div>当前头像</div>
                  <div class="muted">可在右上角头像菜单上传/更换</div>
                </div>

                <div class="progressBox" aria-label="等级进度">
                  <div class="progressTop">
                    <span>Lv{{ levelInfo.level }}</span>
                    <span>{{ levelInfo.progressText }}</span>
                  </div>
                  <div class="progressBar">
                    <div class="progressFill" :style="{ width: levelInfo.percent + '%' }"></div>
                  </div>
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
  import {apiFetch} from '../../api/http'

  export default {
      name: 'Profile',
      data() {
          return {
              loading: true,
              error: '',
              me:null
          }
      },
      computed: {
        levelInfo() {
          const points = Number(this.me?.points) || 0
          const level = Number(this.me?.level) || 1
          const steps = [0, 50, 150, 300]
          const start = level >= 4 ? steps[3] : steps[Math.max(level - 1, 0)]
          const end = level >= 4 ? steps[3] : steps[level]
          const range = Math.max(end - start, 1)
          const raw = (points - start) / range
          const percent = level >= 4 ? 100 : Math.max(0, Math.min(raw, 1)) * 100
          const progressText = level >= 4 ? `${points} / 已满级` : `${points - start} / ${range}`

          return { level, points, percent: Math.round(percent), progressText }
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
    background: linear-gradient(135deg, rgba(255, 79, 136, 0.95), rgba(255, 107, 158, 0.95));
    box-shadow: 0 10px 24px rgba(255, 79, 136, 0.14);
    font-weight: 950;
    transition: transform .18s ease;
  }
  .btn:hover{
    transform: translateY(-1px);
  }
  .btn.ghost{
    background: rgba(255, 107, 158, 0.08);
    border: 1px solid rgba(255, 79, 136, 0.16);
    color: rgba(46, 42, 51, 0.9);
    box-shadow: none;
  }
  .btn.ghost:hover{
    background: rgba(255, 107, 158, 0.14);
  }

  .avatar { margin-top: 14px; display: flex; align-items: center; gap: 12px; }

  .avatar-img{
    width: 64px;
    height: 64px;
    border-radius: 999px;
    object-fit: cover;
    border: 2px solid rgba(255, 79, 136, 0.18);
    box-shadow: 0 12px 24px rgba(255, 79, 136, 0.1);
  }

  .tip{ font-size: 13px; display:flex; flex-direction: column; gap: 2px; font-weight: 800; color: rgba(46, 42, 51, 0.85); }
  .muted{ font-size: 12px; color: rgba(123, 106, 120, 0.85); }

  .progressBox{
    min-width: 200px;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-left: 6px;
  }
  .progressTop{
    display: flex;
    justify-content: space-between;
    font-weight: 900;
    color: rgba(46, 42, 51, 0.85);
    font-size: 12px;
  }
  .progressBar{
    width: 100%;
    height: 8px;
    background: rgba(255, 107, 158, 0.12);
    border: 1px solid rgba(255, 79, 136, 0.18);
    border-radius: 999px;
    overflow: hidden;
  }
  .progressFill{
    height: 100%;
    background: linear-gradient(135deg, rgba(255, 79, 136, 0.95), rgba(255, 107, 158, 0.95));
    box-shadow: 0 8px 18px rgba(255, 79, 136, 0.2);
  }
  .card {
    width: min(760px, 96%);
    margin: 18px auto 0;
    padding: 24px;
    border-radius: 26px;

    background: rgba(255, 255, 255, 0.96);
    border: 1px solid rgba(255, 79, 136, 0.22);
    box-shadow: 0 18px 54px rgba(255, 79, 136, 0.12);

    color: rgba(46, 42, 51, 0.9);
  }

  h2 {
    margin-bottom: 18px;
    font-weight: 950;
    background: linear-gradient(135deg, #ff4f88, #ff6b9e, #ff9fc0);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .error { color: #ff3b77; font-weight: 800; }
  .box { display: grid; gap: 10px; font-weight: 800; font-size: 14px; }
  .box strong { color: rgba(255, 79, 136, 0.95); margin-right: 8px; }

  .circle{
    width: 64px; height: 64px; border-radius: 999px;
    display:flex; align-items:center; justify-content:center;
    background: linear-gradient(135deg, rgba(255, 79, 136, 0.16), rgba(255, 255, 255, 0.90));
    border: 1px solid rgba(255, 79, 136, 0.18);
    box-shadow: 0 12px 24px rgba(255, 79, 136, 0.1);
    font-weight: 950;
    color: rgba(255, 79, 136, 0.95);
    font-size: 24px;
  }
</style>