// 统一行动池聚合器 (方向2)
// 汇总来源: 激活步骤 / 每日行动(genTodayActions) / 推荐(buildRecommendationsV2) / 周任务(weekly quests)
// 并进行打分、去重、排序，返回统一结构: { id,type,title,cta,go,why,score,source }

const { genTodayActions } = require('./dashboardService');
const { getActivationState } = require('./activation');
const { buildRecommendationsV2, computeXP, computeFinance, computeHabits } = require('./profileService');

function safeGetWeeklyQuests(){
  try{
    const qs = wx.getStorageSync('weekly_quests')||[];
    return Array.isArray(qs)? qs: [];
  }catch(e){ return []; }
}

function mapRecommendationCTA(id){
  const map = {
    gain_xp:{ cta:'获取XP', go:'/pages/pomodoro/pomodoro' }, // 暂用番茄页面承载 XP
    habit_add:{ cta:'添加习惯', go:'/pages/habit/habit' },
    habit_review:{ cta:'复盘', go:'/pages/habit/habit' },
    pomo_start:{ cta:'开始番茄', go:'/pages/pomodoro/pomodoro' },
    finance_update:{ cta:'更新财务', go:'/pages/finance/finance' },
    skill_new:{ cta:'新技能', go:'/pages/skill/skill' }
  };
  return map[id] || { cta:'去查看', go:'' };
}

function mapQuestCTA(q){
  switch(q.type){
    case 'pomo': return { cta:'去专注', go:'/pages/pomodoro/pomodoro' };
    case 'habit': return { cta:'打卡', go:'/pages/habit/habit' };
    case 'finance': return { cta:'更新', go:'/pages/finance/finance' };
    default: return { cta:'去完成', go:'' };
  }
}

function buildActionPool(g){
  const pool = [];
  const activation = getActivationState(g);
  // 1. 激活优先：未完成时只展示激活步骤（可扩展策略：尾部追加 1 条高分行为保持多样性）
  if(!activation.allDone){
    activation.steps.filter(s=>!s.done).forEach((s,idx)=>{
      pool.push({
        id:'act_'+s.key,
        type:s.key,
        title:s.title,
        cta:s.cta||'去完成',
        go:s.go||'',
        why:'激活任务',
        score: 100 - idx, // 按顺序递减
        source:'activation'
      });
    });
    return finalize(pool);
  }

  // 2. 每日行动 (dashboard)
  const { actions:todayActions } = genTodayActions(g);
  todayActions.forEach(a=>{
    pool.push({
      id:a.id,
      type:a.type,
      title:a.title,
      cta:a.cta,
      go:a.go,
      why:'每日建议',
      score: 70 + (a.scoreWeight||0)*100,
      source:'today'
    });
  });

  // 3. 推荐 (需要构造上下文)
  try{
    const gClone = { ...g }; // computeXP 会修改对象, 克隆避免副作用
    const xpObj = computeXP(gClone);
    const fin = computeFinance(g);
    const habitsObj = computeHabits(g);
    const pomodoroCount = g.pomodoroCount || 0;
    const skillCount = (g.skills||[]).length;
    const recs = buildRecommendationsV2({ xpObj, fin, habitsObj, pomodoroCount, skillCount });
    recs.forEach(r=>{
      const { cta, go } = mapRecommendationCTA(r.id);
      pool.push({
        id:r.id,
        type:r.id,
        title:r.text,
        cta, go,
        why:r.why,
        score: 60 + r.score, // 基础 + 推荐分
        source:'recommend'
      });
    });
  }catch(e){ /* 忽略推荐失败 */ }

  // 4. 周任务 (只取未完成并生成“进度”式标题)
  const quests = safeGetWeeklyQuests();
  quests.filter(q=> (q.progress||0) < q.goal).forEach(q=>{
    const pct = Math.round((q.progress||0)/q.goal*100);
    const { cta, go } = mapQuestCTA(q);
    pool.push({
      id:q.id,
      type:'quest_'+q.type,
      title:`[周任务] ${q.title} ${q.progress||0}/${q.goal}`,
      cta, go,
      why:'周挑战',
      score: 50 + (100 - pct)/2, // 进度越低得分越高促进行动
      source:'weekly'
    });
  });

  return finalize(pool);
}

function finalize(pool){
  // 去重：同类型/同 id 取 score 高者
  const byId = {};
  pool.forEach(a=>{ if(!byId[a.id] || byId[a.id].score < a.score){ byId[a.id] = a; } });
  const list = Object.values(byId).sort((a,b)=> b.score - a.score);
  return { list, top: list.slice(0,3) };
}

module.exports = { buildActionPool };
