const app = getApp();
const { calcDashboard } = require('../../utils/dashboardService');
const { calcGrowthSubscores } = require('../../utils/growthSubscores');
const { track } = require('../../utils/track');
Page({
  data:{
    score:0,
  segments:[],
  subscoresList:[]
  },
  onLoad(){
    this.calc();
  },
  onShow(){ this.calc(); },
  calc(){
    const g = app.globalData;
    const dash = calcDashboard(g);
    // 短板：选组件值最小的维度 (0~1) 若分差>0.1
    const components = [
      { key:'lever', name:'杠杆任务', v: dash.leverageComponent },
      { key:'focus', name:'专注', v: dash.focusComponent },
      { key:'health', name:'健康', v: dash.healthComponent },
      { key:'skill', name:'技能 ROI', v: dash.roiComponent },
      { key:'fi', name:'财务进度', v: dash.fiComponent }
    ];
    components.sort((a,b)=>a.v-b.v);
    const short = components[0];
    const nextTarget = Math.min(1, short.v + 0.2); // 下一档提升 20% 宽度
    const weightMap = { lever:0.25, focus:0.25, health:0.20, skill:0.15, fi:0.15 };
    const deltaComponent = Math.max(0, nextTarget - short.v);
    const projectedScore = Math.min(100, +(dash.growthScore + deltaComponent*100*weightMap[short.key]).toFixed(1));
    const seg = [
      { key:'lever', name:'杠杆任务', pct: dash.leverCompleted? Math.min(100, Math.round(dash.leverCompleted/10*100)) : 0, tip:`过去 7 天完成 ${dash.leverCompleted} 个杠杆任务。`, url:'/pages/todo/todo', cta:'去添加' },
      { key:'focus', name:'专注', pct: Math.min(100, Math.round(dash.focusHours/4*100)), tip:`今日专注 ${dash.focusHours} 小时。`, url:'/pages/pomodoro/pomodoro', cta:'继续专注' },
      { key:'health', name:'健康', pct: dash.healthPercent, tip:`本周运动达成 ${dash.healthPercent}%`, url:'/pages/sport/sport', cta:'去运动' },
      { key:'skill', name:'技能 ROI', pct: dash.skillROIExt.length?100:0, tip: dash.skillROIExt.length? '已有技能数据，继续打番茄提升 ROI。':'暂无技能番茄数据，开始一轮番茄。', url:'/pages/skill/skill', cta: dash.skillROIExt.length?'查看技能':'添加技能' },
      { key:'fi', name:'财务进度', pct: dash.fiProgress, tip:`自由进度约 ${dash.fiProgress}%`, url:'/pages/goal/goal', cta:'完善目标' }
    ];
  const subs = calcGrowthSubscores(dash);
  // === 基准：按周聚合（使用周起始日期 key） ===
  const now = new Date();
  function weekKey(d){ const dd=new Date(d); const day=dd.getDay(); const diff=(day+6)%7; dd.setHours(0,0,0,0); dd.setDate(dd.getDate()-diff); return dd.toISOString().slice(0,10); }
  const curWeekKey = weekKey(now);
  const prevWeekKeyDate = new Date(now.getTime()-7*86400000);
  const prevWeekKey = weekKey(prevWeekKeyDate);
  let prev=null; try{ prev = wx.getStorageSync('growth:subscores:week:'+prevWeekKey)||null; }catch(e){}
  try{ wx.setStorageSync('growth:subscores:week:'+curWeekKey, subs); }catch(e){}
    const subscoresList = [
      { k:'focus', name:'专注', val:subs.focus, delta: prev? +(subs.focus - prev.focus).toFixed(1): null },
      { k:'finance', name:'财务', val:subs.finance, delta: prev? +(subs.finance - prev.finance).toFixed(1): null },
      { k:'health', name:'健康', val:subs.health, delta: prev? +(subs.health - prev.health).toFixed(1): null },
      { k:'habit', name:'习惯', val:subs.habit, delta: prev? +(subs.habit - prev.habit).toFixed(1): null },
      { k:'leverage', name:'杠杆', val:subs.leverage, delta: prev? +(subs.leverage - prev.leverage).toFixed(1): null },
      { k:'roi', name:'技能ROI', val:subs.roi, delta: prev? +(subs.roi - prev.roi).toFixed(1): null }
    ];
    this.setData({ score: dash.growthScore, segments:seg, shortDim: short.key, shortDimName: short.name, projectedScore, subscoresList });
    this.drawRadarAnimated(subs, prev);
    track('growth_detail_view',{ score: dash.growthScore, short: short.key });
  },
  drawRadar(cur, prev){
    const ctx = wx.createCanvasContext? wx.createCanvasContext('radarCanvas', this): null;
    if(!ctx){ return; }
    const dims = ['focus','finance','health','habit','leverage','roi'];
    const labels = { focus:'专注', finance:'财务', health:'健康', habit:'习惯', leverage:'杠杆', roi:'ROI' };
    const W=300, H=300; const cx=W/2, cy=H/2; const radius=110; const levels=4;
    ctx.clearRect(0,0,W,H);
    ctx.setStrokeStyle('#e2e8f0'); ctx.setLineWidth(1);
    for(let l=1;l<=levels;l++){
      ctx.beginPath();
      dims.forEach((d,i)=>{
        const angle = Math.PI*2*i/dims.length - Math.PI/2;
        const r = radius * (l/levels);
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      });
      ctx.closePath(); ctx.stroke();
    }
    // 轴 & 标签
    ctx.setFontSize(12); ctx.setFillStyle('#334155'); ctx.setStrokeStyle('#94a3b8');
    dims.forEach((d,i)=>{
      const angle = Math.PI*2*i/dims.length - Math.PI/2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(x,y); ctx.stroke();
      const lx = cx + (radius+14)*Math.cos(angle); const ly = cy + (radius+14)*Math.sin(angle);
      ctx.fillText(labels[d], lx-12, ly+4);
    });
    function drawPolygon(data, color, alpha){
      ctx.beginPath();
      dims.forEach((d,i)=>{
        const val = Math.max(0, Math.min(100, data[d]||0))/100; // 0~1
        const angle = Math.PI*2*i/dims.length - Math.PI/2;
        const r = radius * val;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      });
      ctx.closePath();
      ctx.setFillStyle(color.replace('1)', alpha+')'));
      ctx.setStrokeStyle(color.replace('1)', '1)'));
      ctx.fill(); ctx.stroke();
    }
    // 使用 rgba 颜色
    drawPolygon(cur, 'rgba(37,99,235,1)', 0.25);
    if(prev){ drawPolygon(prev, 'rgba(100,116,139,1)', 0.15); }
    ctx.draw();
  },
  drawRadarAnimated(cur, prev){
    const dims=['focus','finance','health','habit','leverage','roi'];
    const totalSteps=16; let step=0; const interpCur={}, interpPrev={};
    const animate=()=>{
      step++; const ratio=step/totalSteps;
      dims.forEach(k=>{ interpCur[k]=cur[k]*ratio; if(prev){ interpPrev[k]=prev[k]*ratio; } });
      this.drawRadar(interpCur, prev? interpPrev:null);
      if(step<totalSteps) setTimeout(animate, 30);
    };
    animate();
  },
  tapRadar(e){
    const x = e.detail.x, y=e.detail.y; if(x==null) return;
    const W=300,H=300,cx=W/2,cy=H/2; const dx = x - cx, dy = y - cy; let ang=Math.atan2(dy,dx); // -PI..PI
    // 转换起点到上方(-PI/2)
    ang = (ang + Math.PI*2 + Math.PI/2)%(Math.PI*2);
    const dims=['focus','finance','health','habit','leverage','roi'];
    const idx = Math.round(ang / (Math.PI*2/dims.length)) % dims.length;
    const dim = dims[idx];
    switch(dim){
      case 'focus': wx.navigateTo({ url:'/pages/pomodoro/pomodoro' }); break;
      case 'finance': wx.navigateTo({ url:'/pages/goal/goal' }); break;
      case 'health': wx.navigateTo({ url:'/pages/sport/sport' }); break;
      case 'habit': wx.navigateTo({ url:'/pages/habit/habit' }); break;
      case 'leverage': wx.navigateTo({ url:'/pages/todo/todo' }); break;
      case 'roi': wx.navigateTo({ url:'/pages/skill/skill' }); break;
      default: break;
    }
  },
  go(e){ const url = e.currentTarget.dataset.url; if(url){ wx.navigateTo({ url }); } }
});
