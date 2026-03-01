// GrowthService v1 - 统一成长激励层（初始抽象）
// 目标：集中 XP 发放、冷却、每日上限、事件打点，便于后续迁移云端
// 设计：配置表 + 状态跟踪 + award(action, meta)
// 后续可扩展：云端签名校验、A/B、动态倍率、离线队列

const { track } = require('./track');
const { emit } = require('./eventBus');
const { getXPBoost } = require('./xpMultiplier');

// 基础配置：后续可改为从云函数/远程配置拉取
const ACTION_CONFIG = {
  habit_check: { baseXP: 5, dailyCap: 30, cooldownSec: 0 },
  habit_create: { baseXP: 5, dailyCap: 20, cooldownSec: 5 },
  todo_complete: { baseXP: 8, dailyCap: 80 },
  todo_create: { baseXP: 2, dailyCap: 40, cooldownSec: 1 },
  pomo_finish: { baseXP: 8, dailyCap: 96 },
  skill_new: { baseXP: 10, dailyCap: 30 },
  skill_practice: { baseXP: 6, dailyCap: 60 },
  finance_asset: { baseXP: 6, dailyCap: 60 },
  finance_liability: { baseXP: 6, dailyCap: 60 },
  goal_update: { baseXP: 8, dailyCap: 40 },
  quest_single_done: { baseXP: 15, dailyCap: 100 },
  quest_all_done: { baseXP: 50, dailyCap: 200 },
  achievement_unlock: { baseXP: 30, dailyCap: 300 }
};

// 全局每日 XP 上限（软上限：超过后动作仍记录但不发放 XP）
const DAILY_GLOBAL_XP_CAP = 800;

// 内存状态（挂在 app.globalData.growthState）
function ensureState(app){
  const g = app.globalData;
  if(!g.growthState){ g.growthState = { perAction:{}, perDay:{} }; }
  const today = new Date().toISOString().slice(0,10);
  if(g.growthState.date !== today){ g.growthState = { date: today, perAction:{}, perDay:{} }; }
  return g.growthState;
}

function canAward(app, action, cfg){
  const st = ensureState(app);
  const aState = st.perAction[action] || (st.perAction[action] = {});
  const now = Date.now();
  if(cfg.cooldownSec){
    if(aState.lastAt && now - aState.lastAt < cfg.cooldownSec*1000){ return { ok:false, reason:'cooldown' }; }
  }
  const todayTotal = st.perDay[action] || 0;
  if(cfg.dailyCap && todayTotal >= cfg.dailyCap){ return { ok:false, reason:'cap' }; }
  return { ok:true, aState, st };
}

function ensureLeveling(app){
  // 将升级公式集中（保留原 level^2*100）
  if(!app || !app.globalData) return;
  if(!app._growthWrapped){
    const originalAdd = app.addXP && app.addXP.bind(app);
    app._growthWrapped = true;
    app.addXP = function(amount, reason){
      if(!this.globalData) return;
      const g=this.globalData; g.xp += amount;
      // 升级：level^2 * 100
      while(g.xp >= g.level * g.level * 100){ g.level++; emit('level.up',{ level:g.level }); track && track('level_up',{ level:g.level }); this.pushMessage && this.pushMessage({ type:'level', text:`恭喜达到 Lv${g.level}` }); }
      if(reason){ this.pushMessage && this.pushMessage({ type:'xp', text:`+${amount} XP (${reason})` }); }
      this.persist && this.persist();
    };
  }
}

function award(app, action, meta={}){
  ensureLeveling(app);
  const cfg = ACTION_CONFIG[action];
  if(!cfg){ console.warn('[GrowthService] unknown action', action); return { added:0, reason:'unknown_action' }; }
  const res = canAward(app, action, cfg);
  if(!res.ok){ return { added:0, reason:res.reason }; }
  let xp = meta.xpOverride || cfg.baseXP;
  // priorityMultiplier: 任务/番茄等可传入 { priority:'high'|'low'}
  if(meta.priority){
    if(meta.priority==='high') xp = Math.round(xp * 1.5);
    else if(meta.priority==='low') xp = Math.round(xp * 0.7);
  }
  // 周倍增 multiplier
  try{ const mult = getXPBoost(app, action); xp = Math.round(xp * mult); meta._multiplier = mult; }catch(e){}
  // 全局上限检查
  const st = res.st;
  st.totalXP = st.totalXP || 0;
  if(st.totalXP >= DAILY_GLOBAL_XP_CAP){
    // 记录但不发放 XP
    track && track('growth_award_blocked',{ action, reason:'global_cap', cap:DAILY_GLOBAL_XP_CAP });
    emit('growth.award.blocked',{ action, reason:'global_cap' });
    return { added:0, reason:'global_cap' };
  }
  const effectiveXP = Math.min(xp, Math.max(0, DAILY_GLOBAL_XP_CAP - st.totalXP));
  // 记录
  res.aState.lastAt = Date.now();
  res.st.perDay[action] = (res.st.perDay[action]||0) + effectiveXP;
  st.totalXP += effectiveXP;
  // 发放 XP
  if(app && app.addXP && effectiveXP>0){ app.addXP(effectiveXP, meta.reason || action); }
  // 埋点
  try{ track && track('growth_award', { action, xp:effectiveXP, rawXP:xp, ...meta, dailyUsed:res.st.perDay[action], dailyCap:cfg.dailyCap, globalUsed:st.totalXP, globalCap:DAILY_GLOBAL_XP_CAP }); }catch(e){}
  emit('growth.award',{ action, xp:effectiveXP, rawXP:xp, meta });
  return { added:effectiveXP };
}

module.exports = { award, ACTION_CONFIG, DAILY_GLOBAL_XP_CAP };
