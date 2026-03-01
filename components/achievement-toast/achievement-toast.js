const { t } = require('../../utils/i18n');
Component({
  properties:{},
  data:{ visible:false, icon:'🏅', name:'', desc:'', i18nUnlockTitle: t('achievement.unlockTitle'), i18nUnlockAria: t('achievement.unlockAria') },
  lifetimes:{ attached(){ this._queue=[]; this._showing=false; } },
  methods:{
    show(ach){
      if(!ach || !ach.id) return;
      // 去重：若队列或当前已有同 id 且最近 5 秒展示过则忽略
      const now=Date.now();
      this._recent=this._recent||{};
      if(this._recent[ach.id] && now - this._recent[ach.id] < 5000) return;
      this._recent[ach.id]=now;
      this._queue.push(ach);
      this._drain();
    },
    _drain(){
      if(this._showing) return;
      const next=this._queue.shift();
      if(!next) return;
      this._showing=true;
  this.setData({ visible:true, icon:next.icon||'🏅', name:next.name||next.id||'', desc: next.desc||'' });
      clearTimeout(this._t);
      this._t=setTimeout(()=>{ this.setData({ visible:false }); this._showing=false; this._drain(); }, 2600);
    }
  }
});
