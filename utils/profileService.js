// 个人中心相关纯函数与推荐算法 V2
// 说明：所有函数不依赖 Page 实例，方便测试与后续复用
const { track } = require('./track.js');

// XP 计算：返回 { level, xp, xpPercent, xpToNext, leveledUp }
function computeXP(g){
  let level = g.level || 1;
  let xp = g.xp || 0;
  let leveledUp = false;
  let loop = 0;
  while(loop < 20){
    const need = level * 100;
    if(xp >= need){
      xp -= need;
      level++;
      leveledUp = true;
      track && track('level_up', { level });
    } else break;
    loop++;
  }
  if(leveledUp){
    g.level = level; g.xp = xp;
  }
  const nextNeed = level * 100;
  const percent = Math.min(100, (xp / nextNeed * 100));
  return { level, xp, xpPercent: Number(percent.toFixed(1)), xpToNext: Math.max(0, nextNeed - xp), leveledUp };
}

// 财务指标计算：返回格式化后的几个核心值 + 动态 freedomMsg
function computeFinance(g){
  const assets = Array.isArray(g.assets)? g.assets: [];
  const liabilities = Array.isArray(g.liabilities)? g.liabilities: [];
  const bills = Array.isArray(g.bills)? g.bills: [];
  const net = assets.reduce((s,a)=>s+Number(a.amount||0),0) - liabilities.reduce((s,a)=>s+Number(a.amount||0),0);
  const passiveYear = bills.filter(b=>b.kind==='in' && b.incomeType==='passive')
    .reduce((s,b)=>s+Number(b.amount||0),0) + assets.reduce((s,a)=> s + Number(a.amount||0)*(Number(a.roi||0)),0);
  const expenseYear = bills.filter(b=>b.kind==='out').reduce((s,b)=>s+Number(b.amount||0),0);
  const dailyPassive = passiveYear/365;
  const dailyExpense = expenseYear/365 || 1;
  const freedom = Math.min(100, (dailyPassive / dailyExpense * 100));
  const fmt = (n)=>{
    if(n==null || isNaN(n)) return '--';
    if(Math.abs(n) >= 10000){ return (n/1000).toFixed(1).replace(/\.0$/,'') + 'k'; }
    return String(Math.round(n));
  };
  let freedomMsg;
  if(freedom >= 100) freedomMsg = '🎉 已实现财务自由';
  else if(freedom >= 80) freedomMsg = '再冲一点即可跨入自由线';
  else if(freedom >= 50) freedomMsg = '进度过半，保持资产/支出记录';
  else if(freedom >= 20) freedomMsg = '建立稳定的被动现金流，逐步提升';
  else freedomMsg = '从记录真实支出开始，构建自由基础';
  return { netWorth: fmt(net), passiveYear: fmt(passiveYear), expenseYear: fmt(expenseYear), freedomPercent: Number(freedom.toFixed(0)), freedomMsg, coreProgress: (net>0? Math.round(net/(passiveYear?passiveYear:1)*100):0)+'%' };
}

function computeHabits(g){
  const habits = Array.isArray(g.habits)? g.habits: [];
  let best = 0; habits.forEach(h=>{ if(h.streak>best) best = h.streak; });
  return { habitCount: habits.length, bestStreak: best };
}

// 推荐算法 V2
// 输入 context: { xpObj, fin, habitsObj, pomodoroCount, skillCount }
// 返回数组：[{ id, text, why, score }]
function buildRecommendationsV2(ctx){
  const rec = [];
  const { xpObj, fin, habitsObj, pomodoroCount, skillCount } = ctx;
  // 因子定义
  // 升级紧迫度：剩余 XP 越低越高分
  if(xpObj.xpToNext > 0){
    const progress = (xpObj.xp / (xpObj.xp + xpObj.xpToNext));
    const urgency = (1 - progress) * 100; // 越接近升级分越低，越远离需要激励
    rec.push({ id:'gain_xp', score: Math.round(urgency), text:`获取 XP 推进升级`, why:`距离 Lv${xpObj.level+1} 还差 ${xpObj.xpToNext} XP` });
  }
  if(habitsObj.habitCount < 3){
    rec.push({ id:'habit_add', score:80, text:'添加新习惯', why:'少于 3 个核心习惯，建立基础节奏' });
  } else {
    rec.push({ id:'habit_review', score:45, text:'复盘习惯表现', why:'巩固已有习惯，防止回落' });
  }
  if(pomodoroCount < 1){
    rec.push({ id:'pomo_start', score:75, text:'开始一个番茄', why:'今日尚未专注，25 分钟提升动量' });
  }
  if(fin.freedomPercent < 100){
    rec.push({ id:'finance_update', score:60, text:'更新资产/支出', why:`自由指数 ${fin.freedomPercent}% ，数据越准确建议越精准` });
  }
  if(skillCount < 1){
    rec.push({ id:'skill_new', score:50, text:'添加一个新技能', why:'追踪技能提升带来额外 XP 奖励' });
  }
  // 排序
  rec.sort((a,b)=> b.score - a.score);
  // 只取前 4 个用于轮换池
  return rec.slice(0,4);
}

// 根据当前统计与元数据推导“即将解锁”成就
// meta: [{id, ...}], stats: { totalXP, habitCountDone, pomoCountDone }
// unlockedIds: 已解锁 id 数组
function computeUpcomingAchievements(meta, stats, unlockedIds){
  const thresholds = {
    xp_500: 500,
    habit_10: 10,
    pomo_20: 20
  };
  const progressMap = {
    xp_500: stats.totalXP || 0,
    habit_10: stats.habitCountDone || 0,
    pomo_20: stats.pomoCountDone || 0
  };
  const upcoming = [];
  meta.forEach(m=>{
    if(unlockedIds.includes(m.id)) return;
    const target = thresholds[m.id];
    if(!target) return;
    const current = progressMap[m.id] || 0;
    const percent = Math.min(1, current / target);
    if(percent >= 0.5){
      upcoming.push({ id:m.id, icon:m.icon||'🏅', name_zh:m.name_zh, name_en:m.name_en, percent: Number((percent*100).toFixed(0)), target, current });
    }
  });
  // 按完成度降序
  upcoming.sort((a,b)=> b.percent - a.percent);
  return upcoming;
}

// 简易本地缓存（使用 wx storage，可在页面调用时包一层 try）
function setCache(key, value, ttlMs){
  try{ wx.setStorageSync(key, { value, expire: Date.now() + (ttlMs||300000) }); }catch(e){}
}
function getCache(key){
  try{ const d = wx.getStorageSync(key); if(d && d.expire > Date.now()) return d.value; }catch(e){}
  return null;
}

module.exports = {
  computeXP,
  computeFinance,
  computeHabits,
  buildRecommendationsV2,
  computeUpcomingAchievements,
  setCache,
  getCache,
  buildWeeklyQuests
};

// 每周任务：根据平均行为生成 3 个任务（返回 { id,title,desc,progress,goal,type }）
function buildWeeklyQuests(context){
  const { avgPomo=0, avgHabit=0, freedomPercent=0 } = context || {};
  const quests = [];
  // 目标按当前均值 + 提升系数制定
  const pomoGoal = avgPomo < 2 ? 5 : Math.min(14, Math.round(avgPomo*1.6));
  quests.push({ id:'q_pomo', title:'专注提升', desc:`本周完成 ${pomoGoal} 个番茄`, progress:0, goal:pomoGoal, type:'pomo' });
  const habitGoal = avgHabit < 2 ? 10 : Math.min(30, Math.round(avgHabit*7 * 1.2));
  quests.push({ id:'q_habit', title:'习惯巩固', desc:`累计 ${habitGoal} 次习惯打卡`, progress:0, goal:habitGoal, type:'habit' });
  if(freedomPercent < 100){
    quests.push({ id:'q_finance', title:'财务追踪', desc:'更新 1 次资产/支出数据', progress:0, goal:1, type:'finance' });
  }
  return quests.slice(0,3);
}
