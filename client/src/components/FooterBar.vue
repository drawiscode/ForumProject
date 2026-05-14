<template>
  <footer class="footer">
    <div class="inner">
      <div class="brand">
        <!-- TODO: 替换为你的底部 Logo -->
        <div class="txt">
          <div class="t">二次元论坛项目</div>
          <div class="s">樱花粉 · 交流 · 记录</div>
        </div>
      </div>

      <div class="cols">
        <div class="p muted">© {{ year }} Sakura Pink Forum</div>
      </div>
    </div>
  </footer>
</template>

<script>
export default {
  name: 'FooterBar',
  computed: {
    year() {
      return new Date().getFullYear()
    }
  }
}
</script>

<style scoped>
  .footer{
    position: relative;
    z-index: 1;
    margin-top: 28px;
  }
  .txt{
    
    display: inline-block;   /* 保留类似内联布局但可设置宽度/padding */
    padding: 0 100px 10px;    /* 左右 padding 会让 border 更长 */
    border-bottom: 1px solid rgba(102, 102, 102, 0.92);
    line-height: 1;  
  }
  .inner{
    width: 100%;
    margin: 0;
    border-radius: 0;
    background: rgba(250, 223, 235, 0.92);
   
    box-shadow: 0 18px 54px rgba(255, 79, 136, 0.12);
    padding: 16px 16px;
    display: flex;
    flex-direction: column;
    align-items:center;
    gap: 16px;
   }

  .brand{
    display:flex;
    align-items:center;
    gap: 12px;
    min-width: 0;
  }
  .mark{
    width: 44px;
    height: 44px;
    border-radius: 16px;
    display:flex;
    align-items:center;
    justify-content:center;
    background: linear-gradient(135deg, rgba(255, 107, 158, 0.16), rgba(255,255,255,0.95));
    border: 1px solid rgba(255, 79, 136, 0.16);
    color: rgba(255, 79, 136, 0.95);
    font-weight: 950;
  }
  .t{
    margin: 0 0 10px 0;
    font-weight: 950;
    background: linear-gradient(135deg, #ff4f88, #ff6b9e, #ff9fc0);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .s{
    margin-top: 2px;
    font-size: 12px;
    color: rgba(123, 106, 120, 0.9);
    font-weight: 800;
  }

  .cols{
    display: flex;
    flex-direction: column;
  }
  .a{
    display:block;
    text-decoration: none;
    color: rgba(255, 79, 136, 0.92);
    font-weight: 900;
    padding: 6px 0;
  }
  .a:hover{ text-decoration: underline; text-underline-offset: 4px; }
  .p{ color: rgba(46, 42, 51, 0.84); font-weight: 700; font-size: 13px; line-height: 1.6; }
  .muted{ color: rgba(123, 106, 120, 0.85); }

  @media (max-width: 900px){
    .inner{ grid-template-columns: 1fr; }
    .cols{ grid-template-columns: 1fr; }
  }
</style>