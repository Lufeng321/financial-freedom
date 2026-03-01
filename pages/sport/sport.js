const app = getApp();
const { track } = require('../../utils/track');

// 与原型一致的类型/指标映射
const SPORT_TYPE_MAP = {
  1001:{ name:'锻炼', metrics:['time','calorie'] },
  1002:{ name:'体能训练', metrics:['time','calorie'] },
  1003:{ name:'功能性训练', metrics:['time','calorie'] },
  2001:{ name:'瑜伽', metrics:['time','calorie'] },
  2002:{ name:'钓鱼', metrics:['time','calorie'] },
  2003:{ name:'广场舞', metrics:['time','calorie'] },
  2004:{ name:'踢足球', metrics:['time','calorie'] },
  2005:{ name:'打篮球', metrics:['time','calorie'] },
  2006:{ name:'打羽毛球', metrics:['time','calorie'] },
  2007:{ name:'打乒乓球', metrics:['time','calorie'] },
  2008:{ name:'打网球', metrics:['time','calorie'] },
  3001:{ name:'跑步', metrics:['time','distance','calorie'] },
  3002:{ name:'登山', metrics:['time','distance','calorie'] },
  3003:{ name:'骑车', metrics:['time','distance','calorie'] },
  3004:{ name:'游泳', metrics:['time','distance','calorie'] },
  3005:{ name:'滑雪', metrics:['time','distance','calorie'] },
  4001:{ name:'跳绳', metrics:['number','calorie'] },
  4002:{ name:'俯卧撑', metrics:['number','calorie'] },
  4003:{ name:'深蹲', metrics:['number','calorie'] }
};
const METRIC_META = {
  time:{ label:'时长(分钟)', placeholder:'min 1-1440', min:1, max:1440 },
  distance:{ label:'距离(米)', placeholder:'m 1-100000', min:1, max:100000 },
  number:{ label:'数量(个)', placeholder:'1-10000', min:1, max:10000 },
  calorie:{ label:'消耗(卡)', placeholder:'≥1', min:1, max:1000000 }
};

Page({
  data:{
    typeIds:Object.keys(SPORT_TYPE_MAP).map(k=>Number(k)),
    typeNames:Object.keys(SPORT_TYPE_MAP).map(k=>SPORT_TYPE_MAP[k].name),
    typeIndex:0,
    metricFields:[],
    date:'',
    time:'',
    syncWanted:false,
    records:[],
    hasPending:false
  },
  onShow(){
    const now = new Date();
    const date = now.toISOString().slice(0,10);
    const time = now.toTimeString().slice(0,5);
    this.setData({ date, time });
    this.buildMetricFields();
    this.refresh();
    const tabBar=this.getTabBar&&this.getTabBar(); if(tabBar){ tabBar.setSelectedByRoute(this.route); }
  },
  pickType(e){ this.setData({ typeIndex:Number(e.detail.value) }, this.buildMetricFields); },
  buildMetricFields(){
    const typeId = this.data.typeIds[this.data.typeIndex];
    const cfg = SPORT_TYPE_MAP[typeId];
    const metricFields = cfg.metrics.map(m=>({ name:m, label:METRIC_META[m].label, placeholder:METRIC_META[m].placeholder, value:'' }));
    this.setData({ metricFields });
  },
  inputMetric(e){ const name=e.currentTarget.dataset.name; const val=e.detail.value; this.setData({ metricFields:this.data.metricFields.map(f=>f.name===name?{...f,value:val}:f) }); },
  pickDate(e){ this.setData({ date:e.detail.value }); },
  pickTime(e){ this.setData({ time:e.detail.value }); },
  toggleSync(e){ this.setData({ syncWanted: e.detail.value }); },
  submitSport(e){
    // 校验
    for(const f of this.data.metricFields){ if(!f.value){ wx.showToast({ title:'请填'+f.label, icon:'none' }); return; } }
    const typeId = this.data.typeIds[this.data.typeIndex];
    const dtStr = this.data.date+' '+this.data.time+':00';
    const rec = { id:Date.now()+''+Math.random(), typeId, syncWanted:this.data.syncWanted, synced:false, datetime: new Date(dtStr).getTime() };
    this.data.metricFields.forEach(f=> rec[f.name]=Number(f.value));
    app.globalData.sportRecords = app.globalData.sportRecords || [];
  app.globalData.sportRecords.unshift(rec);
  try{ require('../../utils/growthService').award(app,'habit_check',{ sport:true, xpOverride:10 }); }catch(e){ app.addXP && app.addXP(10,'运动记录'); }
    // 模拟自动同步
    if(rec.syncWanted){ setTimeout(()=>{ rec.synced=true; app.persist && app.persist(); this.refresh(); },600); }
    app.persist && app.persist();
  this.buildMetricFields();
  this.refresh();
  // 更新本周运动分钟（周一到周日）
  this.computeWeekly();
  track && track('sport_session_added', { typeId, time: rec.time||rec.duration });
  wx.showToast({ title:'已保存', icon:'success' });
  },
  simulateSync(){
    const list = app.globalData.sportRecords || [];
    let changed=false;
    list.forEach(r=>{ if(r.syncWanted && !r.synced){ r.synced=true; changed=true; } });
    if(changed){ app.persist && app.persist(); this.refresh(); wx.showToast({ title:'同步完成' }); } else { wx.showToast({ title:'无待同步', icon:'none' }); }
  },
  refresh(){
    const list = (app.globalData.sportRecords||[]).slice();
    const records = list.map(r=>{
      const cfg = SPORT_TYPE_MAP[r.typeId]||{name:r.typeId,metrics:[]};
      const pills = ['time','distance','number','calorie'].filter(k=>r[k]!=null).map(k=>{
        const meta=METRIC_META[k];
        const short = k==='time'? r[k]+'m': k==='distance'? r[k]+'m': k==='number'? r[k]+'次': r[k]+'卡';
        return short;
      });
      return { id:r.id, typeName:cfg.name, metricPills:pills, dateDisplay:new Date(r.datetime).toLocaleDateString('zh-CN',{month:'2-digit',day:'2-digit'}), syncWanted:r.syncWanted, synced:r.synced };
    });
    this.setData({ records, hasPending: records.some(r=>r.syncWanted && !r.synced) });
    this.computeWeekly();
  },
  computeWeekly(){
    const list = app.globalData.sportRecords || [];
    const now = new Date();
    const day = now.getDay(); // 0 周日
    const monday = new Date(now); monday.setHours(0,0,0,0); monday.setDate(monday.getDate() - ((day+6)%7));
    const sundayEnd = new Date(monday); sundayEnd.setDate(monday.getDate()+7);
    let minutes = 0;
    list.forEach(r=>{ if(r.datetime>=monday.getTime() && r.datetime < sundayEnd.getTime()){ minutes += Number(r.time||r.duration||0); } });
    app.globalData.weeklySportMinutes = minutes; // 给首页读取
  }
});