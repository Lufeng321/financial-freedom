const app = getApp();
const { updateQuestProgress } = require('../../utils/quest');
// 统一成长激励接口（替换零散 awardAction/addXP 调用）
const { award } = require('../../utils/growthService');

function ymd(d){ return d.toISOString().slice(0,10); }

Page({
  data:{
    goalTypeRange:['每天','每周'],
    goalTypeIndex:0,
    allowRetro:false,
  categoryRange:['增收','节支','风险','健康'],
  categoryIndex:0,
  annualImpact:'',
    habits:[],
    heatmapCells:[],
    currentYear:0,
    currentMonth:0
  },
  onShow(){ this.init(); },
  init(){
    if(!app.globalData.habits) app.globalData.habits=[];
    // 兼容 Set 序列化
    app.globalData.habits.forEach(h=>{ if(!(h.days instanceof Set)) h.days=new Set(h.days||[]); });
    const today=new Date();
    this.setData({ currentYear:today.getFullYear(), currentMonth:today.getMonth()+1 });
    if(!this.data.habitTemplates){
      this.setData({ habitTemplates:[
        { key:'read', name:'阅读30分钟', category:'增收', impact:500 },
        { key:'exercise', name:'运动30分钟', category:'健康', impact:0 },
        { key:'review', name:'每日复盘', category:'增收', impact:200 },
        { key:'early', name:'早起', category:'健康', impact:0 },
        { key:'bookkeeping', name:'每日记账', category:'节支', impact:300 }
      ] });
    }
    this.render();
  },
  // 模板数据在 onShow 之后补充 setData（保持现有结构）
  changeGoalType(e){ this.setData({ goalTypeIndex:Number(e.detail.value) }); },
  toggleRetro(e){ this.setData({ allowRetro:e.detail.value }); },
  submitHabit(e){
    const name=(e.detail.value.name||'').trim();
    if(!name){ wx.showToast({ title:'请输入名称', icon:'none' }); return; }
  const category = this.data.categoryRange[this.data.categoryIndex];
  const estimatedAnnualImpact = Number(this.data.annualImpact)||0;
  app.globalData.habits.push({ id:Date.now()+''+Math.random(), name, goalType: this.data.goalTypeIndex===0?'daily':'weekly', allowRetro:this.data.allowRetro, category, estimatedAnnualImpact, days:new Set(), streak:0 });
    app.persist && app.persist();
  this.setData({ allowRetro:false, annualImpact:'', categoryIndex:0 });
    this.render();
  wx.showToast({ title:'已添加', icon:'success' });
  try{ award(app,'habit_create',{ name }); }catch(e){}
  },
  toggleCalendar(e){ const id=e.currentTarget.dataset.id; this.setData({ habits:this.data.habits.map(h=>h.id===id?{...h,show:!h.show}:h) }); },
  checkHabit(e){
    const id=e.currentTarget.dataset.id; const todayKey=ymd(new Date());
    const h=app.globalData.habits.find(x=>x.id===id); if(!h) return;
    if(!(h.days instanceof Set)) h.days=new Set(h.days||[]);
    if(h.days.has(todayKey)) return;
    h.days.add(todayKey);
    this.recalcStreak(h);
  try{ award(app,'habit_check',{ id }); }catch(err){ app.addXP && app.addXP(5,'习惯打卡(fallback)'); }
  // 连续 7 天成就
  if(h.streak===7){ app.unlockAchievement && app.unlockAchievement('habit_7_'+h.id, `${h.name} 连续 7 天`); }
  if(h.streak===30){ app.unlockAchievement && app.unlockAchievement('habit_30_'+h.id, `${h.name} 连续 30 天`); }
    app.persist && app.persist();
  this.render();
  // 触发轻量粒子动画（使用自定义组件或临时 canvas 简化：这里发送事件供 wxml <canvas id="streakCanvas"> 自行监听实现）
  try{ wx.vibrateShort({ type:'light' }); }catch(err){}
  wx.showToast({ title:'+5 XP', icon:'success' });
    this.showParticles();
  try{ updateQuestProgress('habit',1); }catch(e){}
  },
  showParticles(){
    const query = wx.createSelectorQuery();
    query.select('#streakCanvas').fields({ node:true, size:true }).exec(res=>{
      const r=res[0]; if(!r||!r.node) return; const canvas=r.node; const ctx=canvas.getContext('2d');
      const W=r.width, H=r.height; canvas.width=W; canvas.height=H; canvas.style.display='block';
      const colors=['#ff5f6d','#ffc371','#42e695','#4776e6','#8e54e9'];
      const particles=Array.from({length:24},()=>({
        x:W/2, y:H/2, r:4+Math.random()*4, dx:(Math.random()-0.5)*6, dy:(Math.random()-1.2)*8, g:0.35+Math.random()*0.1, life:40+Math.random()*20, c:colors[Math.floor(Math.random()*colors.length)]
      }));
      let frame=0;
      function step(){
        ctx.clearRect(0,0,W,H);
        particles.forEach(p=>{ p.x+=p.dx; p.y+=p.dy; p.dy+=p.g; p.life--; ctx.globalAlpha=Math.max(0,p.life/60); ctx.fillStyle=p.c; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); });
        frame++; if(frame<70){ canvas.requestAnimationFrame(step); } else { ctx.clearRect(0,0,W,H); canvas.style.display='none'; }
      }
      canvas.requestAnimationFrame(step);
    });
  },
  archiveHabit(e){ const id=e.currentTarget.dataset.id; const h=app.globalData.habits.find(x=>x.id===id); if(h){ h.archived=!h.archived; app.persist && app.persist(); this.render(); } },
  deleteHabit(e){ const id=e.currentTarget.dataset.id; const idx=app.globalData.habits.findIndex(x=>x.id===id); if(idx>-1){ app.globalData.habits.splice(idx,1); app.persist && app.persist(); this.render(); } },
  recalcStreak(h){
    let streak=0; const cur=new Date(); while(h.days.has(ymd(cur))){ streak++; cur.setDate(cur.getDate()-1); } h.streak=streak;
  },
  buildMonthDays(h,year,month){
    const total=new Date(year,month,0).getDate();
    return Array.from({length:total},(_,i)=>{ const key=`${year}-${String(month).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`; return { d:i+1, done:h.days.has(key) }; });
  },
  buildHeatmap(habits,year,month){
    const total=new Date(year,month,0).getDate();
    const counts=Array(total).fill(0);
    habits.filter(h=>!h.archived).forEach(h=>{ h.days.forEach(d=>{ const dt=new Date(d); if(dt.getFullYear()===year && dt.getMonth()+1===month){ counts[dt.getDate()-1]++; } }); });
    const max=Math.max(1,...counts);
    return counts.map((c,i)=>{ const lvl=c===0?0: c>=max?5: Math.min(5,Math.ceil(c/max*5)); return { day:i+1, c:lvl }; });
  },
  render(){
    const year=this.data.currentYear; const month=this.data.currentMonth;
    const todayKey=ymd(new Date());
    const habits = app.globalData.habits.map(h=>{
      const monthDays=this.buildMonthDays(h,year,month);
      return { id:h.id, name:h.name, streak:h.streak||0, todayDone:h.days.has(todayKey), show:h.show||false, monthDays, archived:!!h.archived };
    });
    const heatmapCells=this.buildHeatmap(app.globalData.habits,year,month);
    this.setData({ habits, heatmapCells });
  }
  ,useHabitTemplate(e){
    const key=e.currentTarget.dataset.key;
    const tpl=(this.data.habitTemplates||[]).find(t=>t.key===key);
    if(!tpl) return;
    app.globalData.habits.push({ id:Date.now()+''+Math.random(), name:tpl.name, goalType:'daily', allowRetro:false, category:tpl.category, estimatedAnnualImpact:tpl.impact, days:new Set(), streak:0 });
    app.persist && app.persist();
    wx.showToast({ title:'已添加', icon:'success' });
    try{ require('../../utils/track').track('habit_template_use',{ key }); }catch(err){}
    this.render();
  }
});