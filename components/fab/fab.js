Component({
  properties:{
    autoClose:{ type:Boolean, value:true }, // 是否自动收缩
    closeAfter:{ type:Number, value:4000 }   // 自动收缩毫秒
  },
  data:{ open:false, _closeTimer:null },
  methods:{
    toggle(){
      const willOpen = !this.data.open;
      this.setData({ open: willOpen });
      if(willOpen) this._scheduleClose(); else this._clearTimer();
    },
    longPress(){
      // 通知页面打开快速录入
      this.triggerEvent('quickcapture');
    },
    _scheduleClose(){
      if(!this.data.autoClose) return;
      this._clearTimer();
      const t = setTimeout(()=>{ this.setData({ open:false }); }, this.data.closeAfter);
      this.setData({ _closeTimer: t });
    },
    _clearTimer(){
      const t = this.data._closeTimer; if(t){ clearTimeout(t); this.setData({ _closeTimer:null }); }
    },
    go(e){
      const url = e.currentTarget.dataset.url;
      if(!url) return;
      wx.navigateTo({ url });
      // 立即收缩
      this._clearTimer();
      this.setData({ open:false });
    },
    quick(e){
      const tab = e.currentTarget.dataset.tab;
      this.triggerEvent('quickcapture',{ tab });
      this._clearTimer();
      this.setData({ open:false });
    },
    noop(){ this._scheduleClose(); } // 点击展开层区域刷新计时
  },
  detached(){ this._clearTimer(); }
});
