const app = getApp();
const { track } = require('../../utils/track');
const { t } = require('../../utils/i18n');
Page({
  data:{ activeTab:'all', list:[], filtered:[], i18nTabs:{ all:'全部', achievement: t('messages.tab.achievement'), budget: t('messages.tab.budget'), remind: t('messages.tab.remind'), system: t('messages.tab.system') }, i18n:{ markAll:'全部已读', center:'消息中心', empty:'暂无消息', read:'标已读', unread:'设未读' } },
  onShow(){ this.load(); },
  load(){
    const arr = (app.globalData.messages||[]).slice();
    this.setData({ list:arr }, ()=> this.filter());
  },
  switchTab(e){ const tab=e.currentTarget.dataset.tab; if(tab===this.data.activeTab) return; this.setData({ activeTab:tab }, ()=> this.filter()); },
  filter(){
    const { activeTab, list } = this.data;
    const filtered = activeTab==='all' ? list : list.filter(m=> m.group===activeTab);
    this.setData({ filtered });
  },
  formatTime(ts){ const d=new Date(ts); const pad=n=> (n<10?'0':'')+n; return `${d.getMonth()+1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; },
  renderBadge(g){ const d=this.data.i18nTabs; return d[g] || g; },
  toggleRead(e){ const id=e.currentTarget.dataset.id; const g=app.globalData; const m=g.messages.find(x=>x.id===id); if(m){ m.read=!m.read; app.persist(); this.load(); } },
  markAllRead(){ const g=app.globalData; let count=0; (g.messages||[]).forEach(m=>{ if(!m.read) { m.read=true; count++; } }); app.persist(); try{ track && track('messages_mark_all_read', { count }); }catch(e){} this.load(); }
});
