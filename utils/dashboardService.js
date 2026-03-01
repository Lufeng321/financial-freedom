// Dashboard 数据服务：聚合计算与推荐逻辑（保持纯函数，方便测试）
const { calcFinance, calcSavingsRate, calcFIProgress, calcGoalProgress } = require('./finance');
const { calcSkillROI } = require('./roi');
const weights = require('../config/growth-weights');

function _getCooldown(){ try{ return wx.getStorageSync('actions:cooldown')||{}; }catch(e){ return {}; } }
function _saveCooldown(m){ try{ wx.setStorageSync('actions:cooldown', m); }catch(e){} }

function genTodayActions(g){
  const actions=[]; const cooldown=_getCooldown(); const now=Date.now(); const dayMs=24*60*60*1000;
  function push(act){ const last=cooldown[act.type]; if(last && now-last<dayMs) return; actions.push(act); }
  if(!(g.goals && (g.goals.emergencyFundTarget||g.goals.savingsRateTarget||g.goals.freedomPassiveTarget))){
    push({ id:'act_goal', type:'goal', title:'设定你的第一个财务目标', cta:'去设置', go:'/pages/goal/goal', scoreWeight:0.15 });
  }
  const sessions = g.sessions||[]; const todayStart=new Date(); todayStart.setHours(0,0,0,0);
  const focusMinutes = sessions.filter(s=> s.ts && s.ts>=todayStart.getTime()).reduce((s,x)=> s+Number(x.minutes||0),0);
  if(focusMinutes < 60){ push({ id:'act_focus', type:'focus', title:'开启 25 分钟番茄提升专注', cta:'开始番茄', go:'/pages/pomodoro/pomodoro', scoreWeight:0.25 }); }
  if(g.weeklySportMinutes!=null){
    const weeklyTarget=(g.settings && g.settings.sportWeeklyTarget)||150;
    if(g.weeklySportMinutes/weeklyTarget < 0.5){ push({ id:'act_sport', type:'sport', title:'做一次 15 分钟运动，提升健康进度', cta:'去运动', go:'/pages/sport/sport', scoreWeight:0.20 }); }
  }
  const focusTodo = (g.todos||[]).find(t=>t.focus && !t.done);
  if(focusTodo){ push({ id:'act_todo', type:'todo', title:`完成焦点任务：${focusTodo.title}`, cta:'去完成', go:'/pages/todo/todo', scoreWeight:0.25 }); }
  if((g.bills||[]).length===0 && g.budgets && Object.keys(g.budgets).length){ push({ id:'act_bill', type:'bill', title:'记一笔账，激活储蓄率分析', cta:'去记账', go:'/pages/bill/bill', scoreWeight:0.15 }); }
  actions.sort((a,b)=> (b.scoreWeight||0) - (a.scoreWeight||0));
  return { actions, focusMinutes };
}

function markActionCompleted(type){ const c=_getCooldown(); c[type]=Date.now(); _saveCooldown(c); }

function calcDashboard(g){
  const finance = calcFinance(g);
  const fiProgress = calcFIProgress(finance.passiveIncomeYear + finance.assetsPassive, 0, finance.expenseYear) || finance.freedom || 0;
  const savingsRate = calcSavingsRate(finance.totalIncomeYear, finance.expenseYear);
  const monthKey = new Date().toISOString().slice(0,7);
  const bud = (g.budgets && g.budgets[monthKey]) || {};
  const budgetTotal = Number(bud.expenseBudget)||0;
  const monthUsed = (g.bills||[]).filter(b=> b.kind==='out' && b.datetime && b.datetime.startsWith(monthKey))
    .reduce((s,b)=> s + Number(b.amount||0),0);
  let budgetPct = 0, budgetState='';
  if(budgetTotal>0){ budgetPct = Math.min(999, +(monthUsed / budgetTotal *100).toFixed(1)); if(budgetPct>=100) budgetState='danger'; else if(budgetPct>=80) budgetState='warn'; }
  const hourCost = (g.settings && g.settings.hourCost) || 100;
  const skills = g.skills || [];
  const skillROIExt = skills.map(s=>{ const { roiPercent, effectiveAnnual } = calcSkillROI(s, hourCost); const rawConf = s.confidence; const confPct = rawConf==null? null : (rawConf<=1? Math.round(rawConf*100): Math.round(rawConf)); return { name: s.name, roiPercent, confidence: rawConf, confidencePct: confPct, effectiveAnnual: +(effectiveAnnual||0).toFixed(0) }; })
    .filter(x=>x.roiPercent!=null).sort((a,b)=>b.roiPercent-a.roiPercent).slice(0,3);
  const sessions = g.sessions||[]; const todayStart=new Date(); todayStart.setHours(0,0,0,0);
  const focusMinutes = sessions.filter(s=> s.ts && s.ts>=todayStart.getTime()).reduce((sum,s)=> sum + Number(s.minutes||0),0);
  const focusHours = +(focusMinutes/60).toFixed(2);
  const habitImpact = (g.habits||[]).reduce((sum,h)=> sum + Number(h.estimatedAnnualImpact||0),0);
  const rec = g.sportRecords||[]; const last=rec.slice(0,5); let time=0,distance=0,cal=0; last.forEach(r=>{ time+=Number(r.time||0); distance+=Number(r.distance||0); cal+=Number(r.calorie||0); });
  const percent = Math.min(100, Math.round(time/60*100));
  const weeklyMinutes = g.weeklySportMinutes;
  const weeklyTarget = (g.settings && g.settings.sportWeeklyTarget) || 150;
  const healthPercent = weeklyMinutes != null ? Math.min(100, Math.round(weeklyMinutes/weeklyTarget*100)) : percent;
  let healthColor;
  if(healthPercent>=80) healthColor='linear-gradient(90deg,#16a34a,#4ade80)';
  else if(healthPercent>=50) healthColor='linear-gradient(90deg,#f59e0b,#fbbf24)';
  else if(healthPercent>=25) healthColor='linear-gradient(90deg,#dc2626,#f87171)';
  else healthColor='linear-gradient(90deg,#991b1b,#dc2626)';
  const leverStats = g.growthStats || { wealthLeverCompleted:0, leverageXPBonus:0 };
  const sevenDaysAgo = Date.now() - 7*24*60*60*1000;
  const leverCompleted = (g.todos||[]).filter(t=> t.wealthLever && t.done && t.doneAt && t.doneAt >= sevenDaysAgo).length;
  const leverBonus = leverStats.leverageXPBonus || 0;
  // 组件（带软上限与边际减益）：f(x)= (x/target)^(gamma)  (gamma<1 放大中段)
  function curve(v, target, gamma=0.9){ if(target<=0) return 0; const r=Math.min(1, v/target); return Math.pow(r, gamma); }
  const leverageComponent = curve(leverCompleted, 10, 0.85);
  const focusComponent = curve(focusHours, 4, 0.9);
  const healthComponent = curve(healthPercent, 100, 0.92);
  const roiComponent = skillROIExt.length? 1 : 0; // 有数据即视作激活
  const fiComponent = curve(fiProgress, 100, 0.95);
  const linear = (leverageComponent*weights.leverage + focusComponent*weights.focus + healthComponent*weights.health + roiComponent*weights.roi + fiComponent*weights.fi);
  const balancedPenalty = balancePenalty([focusComponent, healthComponent, fiComponent]);
  const growthScore = +((linear * balancedPenalty)*100).toFixed(1);
  const gp = calcGoalProgress({ globalData:g, addXP:()=>{} });
  return {
    finance, fiProgress, savingsRate,
    budgetPct, budgetUsed:+monthUsed.toFixed(2), budgetState,
    skillROIExt, focusHours, habitImpact,
    sport:{ time, distance: distance.toFixed(1), cal, percent },
  healthPercent, healthColor, leverCompleted, leverBonus, growthScore,
  leverageComponent, focusComponent, healthComponent, roiComponent, fiComponent, balancedPenalty,
    goalEmergencyPct: gp.emergency.pct,
    goalPassivePct: gp.freedomPassive.pct,
    goalSavingsPct: gp.savingsRate.pct,
    goalPassiveETA: gp.freedomPassive.eta || ''
  };
}

// 平衡惩罚：若核心组件( focus/health/fi ) 方差过大，乘以衰减 (0.9~1)
function balancePenalty(arr){
  if(!arr.length) return 1;
  const mean = arr.reduce((s,v)=>s+v,0)/arr.length;
  const variance = arr.reduce((s,v)=> s + Math.pow(v-mean,2),0)/arr.length;
  // variance 0~1 之间，>0.05 开始惩罚
  if(variance <= 0.05) return 1;
  if(variance >= 0.2) return 0.9;
  const ratio = (variance - 0.05)/(0.15); // 0~1
  return +(1 - 0.1*ratio).toFixed(4);
}

module.exports = { genTodayActions, calcDashboard, markActionCompleted };
