const { markActionCompleted } = require('./dashboardService');
const { track } = require('./track');
const { logEvent } = require('./eventLog');

const XP_MAP = {
  habit: { xp:5, reason:'习惯打卡' },
  todo: { xp:8, reason:'完成焦点任务' },
  activation_step: { xp:10, reason:'激活步骤' },
  activation_all: { xp:30, reason:'完成激活' },
  finance_asset: { xp:6, reason:'更新资产' },
  finance_liability: { xp:6, reason:'更新负债' },
  goal_update: { xp:8, reason:'更新财务目标' }
};

function awardAction(app, type, meta={}){
  try{
    const map = XP_MAP[type] || {}; const xp = meta.xp || map.xp || 0;
    if(markActionCompleted && meta.cooldown!==false){ try{ markActionCompleted(meta.cooldownType || type); }catch(e){} }
    track && track('action_completed', { type, xp, ...meta });
  if(xp>0 && app && app.addXP){ app.addXP(xp, meta.reason || map.reason || type); }
  // 事件日志
  try{ logEvent({ type, xp, desc: meta.reason || map.reason || type }); }catch(e){}
    return xp;
  }catch(e){ return 0; }
}

module.exports = { awardAction, XP_MAP };
