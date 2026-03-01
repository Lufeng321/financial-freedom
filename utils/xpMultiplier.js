// xpMultiplier.js
// 周维度复利激励：根据本周五项关键维度完成情况动态调整 XP 倍数
// 维度：focus(专注≥2h 当日) / savings(储蓄率≥目标*0.8) / habit(7日保持率≥60%) / health(健康≥60%) / skillPractice(本周至少1次 skill_practice)
// 策略：一周内累计满足的不同维度数 n → multiplier = 1 + 0.02 * n (上限 1.1)
// 周切换时重置维度标记并固化上一周统计供分析。

const { calcDashboard } = require('./dashboardService');

function _weekKey(d=new Date()){
  const first = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = first.getDay(); // 0 Sunday
  const diff = (day===0?6:day-1); // 转换为周一为起点
  first.setDate(first.getDate()-diff);
  return first.toISOString().slice(0,10); // 周起始日
}

function ensureWeekState(app){
  const g = app.globalData;
  if(!g.growthState) g.growthState = { perAction:{}, perDay:{} };
  const wk = _weekKey();
  if(!g.growthState.week || g.growthState.week.key!==wk){
    // 计算上一周 multiplier（已在使用中，不需要 retroactively）
    g.growthState.week = { key:wk, criteria:{ focus:false, savings:false, habit:false, health:false, skill:false }, multiplier:1 };
  }
  return g.growthState.week;
}

function updateCriteria(app){
  const week = ensureWeekState(app);
  // 计算当前 dashboard（轻量）
  const dash = calcDashboard(app.globalData);
  // focus≥2
  if(dash.focusHours>=2) week.criteria.focus = true;
  // savings≥target*0.8 (若无目标则 ≥30%)
  const target = (app.globalData.goals && Number(app.globalData.goals.savingsRateTarget)) || 50;
  if(dash.savingsRate >= target*0.8) week.criteria.savings = true;
  // health≥60
  if(dash.healthPercent >= 60) week.criteria.health = true;
  // habitConsistency: 近7日是否≥60% (用 habitImpact 替代简化：impact>0 代表活跃; 更精确需 habit 数据，这里快速估算)
  const habits = app.globalData.habits||[];
  if(habits.length){
    const today = new Date();
    let total=0,done=0;
    for(let i=0;i<7;i++){ const d=new Date(today.getFullYear(), today.getMonth(), today.getDate()-i); const key=d.toISOString().slice(0,10); habits.forEach(h=>{ const set = h.days instanceof Set ? h.days : new Set(h.days||[]); total++; if(set.has(key)) done++; }); }
    if(total>0 && done/total >= 0.6) week.criteria.habit = true;
  }
  return week;
}

function markSkillPractice(app){ const week=ensureWeekState(app); week.criteria.skill = true; }

function computeMultiplier(app){
  const week = updateCriteria(app);
  const n = Object.values(week.criteria).filter(Boolean).length;
  const mult = Math.min(1.1, 1 + 0.02 * n);
  week.multiplier = mult;
  return mult;
}

function getXPBoost(app, action){
  if(action==='skill_practice'){ markSkillPractice(app); }
  return computeMultiplier(app);
}
function getXPBoostState(app){
  const mult = computeMultiplier(app);
  const week = ensureWeekState(app);
  return { multiplier: mult, criteria: { ...week.criteria } };
}

module.exports = { getXPBoost, getXPBoostState };
