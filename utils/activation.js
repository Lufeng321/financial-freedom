// 激活引导逻辑：计算首日/首周关键完成度
// 目标：在首页用一个精简 checklist 引导完成 3 个核心动作，全部完成后再展示日常推荐行动。

function _todayStr(){ const d=new Date(); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }

function getActivationState(g){
  const today=_todayStr();
  // 1. 财务目标：认为需要用户主动设定（emergencyFundTarget 或 freedomPassiveTarget > 0）
  const goals = g.goals || {};
  const goalDone = (goals.emergencyFundTarget && goals.emergencyFundTarget>0) || (goals.freedomPassiveTarget && goals.freedomPassiveTarget>0);
  // 2. 记第一笔账 / 添加资产
  const recordDone = (g.bills && g.bills.length>0) || (g.assets && g.assets.length>0);
  // 3. 完成一次打卡或焦点任务（当日）
  const habitToday = (g.habits||[]).some(h=>{
    const days = h.days instanceof Set ? h.days : new Set(h.days||[]);
    return days.has(today);
  });
  const focusDone = (g.todos||[]).some(t=> t.focus && t.done && t.doneAt && new Date(t.doneAt).toDateString() === new Date().toDateString());
  const habitDone = habitToday || focusDone;

  const steps=[
    { key:'goal', title:'设定你的财务目标', desc:'应急金 / 被动收入', cta:'去设置', go:'/pages/goal/goal', done:goalDone },
    { key:'record', title:'记第一笔账或资产', desc:'激活储蓄/自由分析', cta:'去记账', go:'/pages/bill/bill', done:recordDone },
    { key:'habit', title:'完成一次打卡或焦点任务', desc:'形成最小正反馈', cta:'去行动', go:'/pages/habit/habit', done:habitDone }
  ];
  const completed = steps.filter(s=>s.done).length;
  const total = steps.length;
  return { steps, completed, total, progress: +(completed/total*100).toFixed(0), allDone: completed===total };
}

module.exports = { getActivationState };
