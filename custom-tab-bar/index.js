Component({
  data:{
    bounceIndex:-1,
    list:[
      { pagePath:'pages/index/index', icon:'🏠', text:'首页' },
      { pagePath:'pages/finance/finance', icon:'💰', text:'财务' },
      { pagePath:'pages/skill/skill', icon:'🛠️', text:'技能' },
      { pagePath:'pages/sport/sport', icon:'🏋️', text:'运动' },
      { pagePath:'pages/me/me', icon:'👤', text:'我的' }
    ]
  },
  methods:{
    normalize(p){ return (p||'').replace(/^\//,''); },
    triggerBounce(idx){
      this.setData({ bounceIndex: idx });
      clearTimeout(this._bt);
      this._bt = setTimeout(()=>{
        this.setData({ bounceIndex: -1 });
      }, 350);
    },
    switchTab(idx){
      const item=this.data.list[idx];
      if(!item) return;
      this.triggerBounce(idx);
      const url='/' + this.normalize(item.pagePath);
      wx.switchTab({ url });
    },
    onTap(e){
      const idx=e.currentTarget.dataset.index;
      this.switchTab(idx);
    },
    // 保留空实现兼容之前页面调用，不再改变样式
    setSelectedByRoute(){ /* no-op after design change */ }
  }
});
