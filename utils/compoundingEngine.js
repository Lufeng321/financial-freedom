// compoundingEngine.js
// 构建“复利引擎”核心指标集 + velocity + 复合分数
// 现有指标：
//   专注小时 focus / 储蓄率 savings / 习惯 7 日保持率 habitCons /
//   健康百分比 health / Top Skill 年化增值 skillAnnual
// 新增指标：
//   FI 覆盖率 fiCoverage （当前被动/目标被动）
//   技能资本化 skillCapitalValue （全部技能年化 * 折现因子）
//   复合分数 compoundScore （六个规范化维度加权）
// 动态目标：依据最近仪表盘与支出 / 目标自适应，而非硬编码常量
// 依赖：dashboard(calcDashboard 输出) + globalData

const { computeVelocity } = require('./velocity');
const { calcSkillROI } = require('./roi');
const { getRecentSnapshots } = require('./finance');

function _habitConsistency7d(habits){
  if(!Array.isArray(habits) || !habits.length) return 0;
  const today = new Date();
  const days = [];
  for(let i=0;i<7;i++){ const d=new Date(today.getFullYear(), today.getMonth(), today.getDate()-i); days.push(d.toISOString().slice(0,10)); }
  let total=0, done=0;
  habits.forEach(h=>{
    const set = h.days instanceof Set ? h.days : new Set(h.days||[]);
    days.forEach(day=>{ total++; if(set.has(day)) done++; });
  });
  if(total===0) return 0;
  return +(done/total).toFixed(2);
}

function _topSkillAnnual(skills){
  if(!Array.isArray(skills) || !skills.length) return { name:'', value:0 };
  return skills.reduce((best,s)=>{
    const uplift = Number(s.expectedAnnualUplift||0);
    const confidence = Number(s.confidence||0); // 0~1
    const effective = uplift * confidence;
    if(!best || effective > best.value){ return { name:s.name, value:+effective.toFixed(2) }; }
    return best;
  }, null) || { name:'', value:0 };
}

function _skillCapitalValue(skills){
  if(!Array.isArray(skills) || !skills.length) return 0;
  // 折现：信心 * 年化提升 * (练习新鲜度系数) * 0.6 (保守折现)
  const now=Date.now();
  const DECAY_DAY=14;
  return +skills.reduce((s,sk)=>{
    const uplift = Number(sk.expectedAnnualUplift||0);
    const conf = Number(sk.confidence||0); // 0~1
    const upd = sk.updatedAt || sk.createdAt || now;
    const days = (now - upd)/86400000;
    const freshness = Math.max(0.2, 1 - Math.min(1, days/DECAY_DAY));
    return s + uplift * conf * freshness * 0.6;
  },0).toFixed(2);
}

function _dynamicTargets({ dash, g, topSkill, skillCapitalValue, fiCoverage }){
  // 通过最近表现自适应：目标 = max(静态基线, 最近30天平均 * 提升系数)
  // 基础静态基线
  const bases = {
    focus: 4,
    savings: (g.goals && g.goals.savingsRateTarget) ? Number(g.goals.savingsRateTarget) : 50,
    habitConsistency: 0.7,
    health: 80,
    topSkillAnnual: Math.max(5000, topSkill.value ? topSkill.value * 1.3 : 10000)
  };
  // 依据支出规模，若目标被动收入较高，提高技能增值目标上限（帮助用户对齐缺口）
  const expenseYear = dash.finance && dash.finance.expenseYear || 0;
  if(expenseYear>0){
    const desiredSkill = Math.min(Math.max(bases.topSkillAnnual, expenseYear * 0.3), expenseYear); // 30%~100% 年支出的技能差额覆盖
    bases.topSkillAnnual = desiredSkill;
  }
  // 如果 FI 覆盖率 < 30%，强调储蓄率与技能增值；否则强调专注与健康继续复利
  if(fiCoverage < 30){
    bases.focus = Math.max(bases.focus, 4.5);
    bases.savings = Math.max(bases.savings, 55);
  }else if(fiCoverage > 70){
    bases.health = Math.max(bases.health, 85);
  }
  return bases;
}

function buildEngine(app, dash){
  const g = app.globalData;
  const focusHours = dash.focusHours || 0;
  const savingsRate = dash.savingsRate || 0;
  const healthPercent = dash.healthPercent || 0;
  const habitConsistency = _habitConsistency7d(g.habits||[]); // 0~1
  const topSkill = _topSkillAnnual(g.skills||[]); // 年化增值
  const skillCapitalValue = _skillCapitalValue(g.skills||[]);
  // FI 覆盖率（财务自由被动覆盖度）
  const passiveTarget = (g.goals && (Number(g.goals.freedomPassiveTarget)||0)) || (dash.finance && dash.finance.expenseYear) || 0;
  const passiveCurrent = (dash.finance ? (dash.finance.passiveIncomeYear + dash.finance.assetsPassive) : 0);
  const fiCoverage = passiveTarget>0 ? +(Math.min(1, passiveCurrent/passiveTarget)*100).toFixed(1) : 0;
  // 动态目标
  const dynTargets = _dynamicTargets({ dash, g, topSkill, skillCapitalValue, fiCoverage });
  const targetFocus = dynTargets.focus;
  const targetSavings = dynTargets.savings;
  const targetHabitConsistency = dynTargets.habitConsistency;
  const targetHealth = dynTargets.health;
  const targetTopSkillAnnual = dynTargets.topSkillAnnual;
  // Velocity：需要月度快照 + 目标
  const snaps = getRecentSnapshots(app, 6);
  const velocity = computeVelocity({ snapshots: snaps, passiveTarget, passiveCurrent });
  const metrics = [
    { key:'focus', label:'专注', value: focusHours, target: targetFocus, unit:'h', gap: +(Math.max(0, targetFocus - focusHours).toFixed(2)) },
    { key:'savings', label:'储蓄率', value: savingsRate, target: targetSavings, unit:'%', gap: +(Math.max(0, targetSavings - savingsRate).toFixed(1)) },
    { key:'habitCons', label:'习惯保持', value: +(habitConsistency*100).toFixed(0), target: targetHabitConsistency*100, unit:'%', gap: +(Math.max(0, targetHabitConsistency*100 - habitConsistency*100).toFixed(0)) },
    { key:'health', label:'健康', value: healthPercent, target: targetHealth, unit:'%', gap: +(Math.max(0, targetHealth - healthPercent).toFixed(0)) },
    { key:'skillAnnual', label: topSkill.name? ('技能:'+topSkill.name) : '技能增值', value: topSkill.value, target: targetTopSkillAnnual, unit:'¥/年', gap: +(Math.max(0, targetTopSkillAnnual - topSkill.value).toFixed(0)) },
    { key:'fiCoverage', label:'FI覆盖', value: fiCoverage, target:100, unit:'%', gap: +(Math.max(0, 100 - fiCoverage).toFixed(1)) },
    { key:'skillCapital', label:'技能资本', value: skillCapitalValue, target: targetTopSkillAnnual, unit:'¥/年', gap: +(Math.max(0, targetTopSkillAnnual - skillCapitalValue).toFixed(0)) }
  ];

  // 复合分数：六个核心规范化后加权 (提前阶段提高储蓄/专注权重)
  const norm = (v,t)=>{ if(t<=0) return 0; return Math.max(0, Math.min(1, v/t)); };
  const stageEarly = fiCoverage < 30;
  const weights = stageEarly ? { focus:.22, savings:.22, habit:.15, health:.15, skill:.16, fi:.10 } : { focus:.18, savings:.18, habit:.16, health:.18, skill:.15, fi:.15 };
  const compoundScore = +(100*(
    norm(focusHours, targetFocus)*weights.focus +
    norm(savingsRate, targetSavings)*weights.savings +
    habitConsistency*weights.habit +
    norm(healthPercent, targetHealth)*weights.health +
    norm(topSkill.value, targetTopSkillAnnual)*weights.skill +
    (fiCoverage/100)*weights.fi
  )).toFixed(1);

  return { metrics, velocity, compoundScore, fiCoverage, skillCapitalValue };
}

module.exports = { buildEngine };
